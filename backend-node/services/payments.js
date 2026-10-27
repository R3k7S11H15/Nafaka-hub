/**
 * Payments service.
 *
 * Uses NTZS (https://www.ntzs.co.tz/api/v1) as the unified payment service provider.
 *
 * Responsibilities:
 *  - Initiate payments via NTZS for mobile_money, card, bank_transfer, lipa_namba.
 *    Production integrations call the real NTZS API. There is NO local stub
 *    fallback — a valid NTZS_API_KEY is required.
 *  - Idempotent checkout: an idempotency-key dedups payment_transactions rows.
 *  - Webhook ingestion with NTZS HMAC signature verification + idempotent
 *    processing (duplicate webhooks never create duplicate transactions or
 *    double-pay).
 *  - Reconciliation: every payment has a provider_ref, status, receipt_url,
 *    provider column, and an audit row in order_tracking.
 *  - Direct buyer → seller payment: payment completion updates the payment
 *    record. The order transitions to `paid` only when the SELLER confirms
 *    receipt (confirm_payment action) or when finance approves a COD payment.
 *  - COD (Cash-on-Delivery): a finance-admin approval workflow that does NOT
 *    call the NTZS API — the payment stays `pending` until finance approves.
 *
 * NTZS payment API (see services/ntzs/ for the shared client):
 *   POST ${NTZS_API_BASE}/deposits
 *   Headers: Authorization: Bearer <token>, Content-Type: application/json,
 *            Idempotency-Key: <key>
 *   Body (mobile_money): { amountTzs, paymentMethod: 'mobile_money', phoneNumber }
 *   Body (card):          { amountTzs, paymentMethod: 'card', redirectUrl, cancelUrl }
 *   Body (bank_transfer): { amountTzs, paymentMethod: 'bank_transfer', phoneNumber }
 *   Body (lipa_namba):    { amountTzs, paymentMethod: 'lipa_namba', phoneNumber }
 *   GET ${NTZS_API_BASE}/deposits/:id  (poll status)
 *
 * Scope: collections, disbursements, bills and the treasury ledger. Wallets are
 * out of scope — no end-user wallet is provisioned or referenced, so the
 * receiving holder is the configured treasury holder, never a customer id.
 *
 * Collections, disbursements, bills and the treasury ledger live in
 * services/ntzsPayments.js and services/ntzsTreasury.js, mounted at /api/ntzs.
 *
 * Env vars (production):
 *   NTZS_API_BASE          default: https://www.ntzs.co.tz/api/v1
 *   NTZS_API_KEY           NTZS bearer token (ntzs_live_… or ntzs_test_…) — REQUIRED
 *   NTZS_WEBHOOK_SECRET    HMAC secret for NTZS webhook verification
 *   NTZS_FUNDING_USER_ID   nTZS holder that funds payouts and bills
 *   NTZS_COLLECTION_USER_ID  nTZS holder that receives collections
 *
 * Status names mirror backend-node/services/orderLifecycle.js.
 */
const crypto = require('crypto');
const realtime = require('./realtime');
const ntzs = require('./ntzs');
const { NtzsError } = require('./ntzs/errors');

// ---------------------------------------------------------------------------
// Config helpers
//
// Base URL, API key and webhook secret are read inside services/ntzs, which
// owns the transport for every nTZS call.
// ---------------------------------------------------------------------------

const NTZS_MIN_PAYMENT = 500;

/**
 * Returns the configured NTZS API key.
 * Throws if NTZS_API_KEY is not set or is a placeholder value.
 * There is no stub/fallback mode in production.
 */
function getCurrentApiKey() {
  const key = process.env.NTZS_API_KEY;
  if (!key || key.includes('xxxxxxxxxxxx') || key.length < 20) {
    throw new Error(
      'NTZS_API_KEY is not configured. A valid NTZS API key is required for payments.'
    );
  }
  return key;
}

/**
 * Map a payment method from the frontend into a normalized NTZS payment method.
 * `cash` / `cash_on_delivery` / `cod` are kept as-is because COD does not go
 * through NTZS — it is a finance-admin approval workflow.
 */
function normalizeMethod(method) {
  if (!method) return 'cash';
  const m = String(method).toLowerCase();
  if (m === 'cash' || m === 'cash_on_delivery' || m === 'cod') return 'cash';
  if (
    m === 'mobile_money' ||
    m === 'mpesa' ||
    m === 'm-pesa' ||
    m === 'mobile money' ||
    m === 'mobile' ||
    m === 'airtel' ||
    m === 'tigo'
  )
    return 'mobile_money';
  if (m === 'bank' || m === 'bank_transfer' || m === 'bank transfer') return 'bank_transfer';
  if (m === 'card' || m === 'credit_card' || m === 'credit card') return 'card';
  if (m === 'lipa_namba' || m === 'lipa namba' || m === 'lipa') return 'lipa_namba';
  return 'cash';
}

function normalizePhone(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('255')) return '+' + digits;
  if (digits.startsWith('0')) return '+255' + digits.slice(1);
  if (digits.length >= 12) return '+' + digits;
  return '+' + digits;
}

/**
 * Normalize an incoming webhook status string to one of the
 * payment_transactions status enum values: 'completed' | 'failed' | 'reversed' | 'pending'.
 */
function normalizeWebhookStatus(raw) {
  const s = String(raw || '').toLowerCase();
  if (['success', 'completed', 'paid', 'successful', 'confirmed', 'settled'].includes(s))
    return 'completed';
  if (['failed', 'error', 'declined'].includes(s)) return 'failed';
  if (['cancelled', 'canceled', 'reversed', 'refunded'].includes(s)) return 'reversed';
  return 'pending';
}

/**
 * Normalize the raw status returned by the NTZS API into one of:
 * 'submitted' | 'completed' | 'failed' | 'cancelled' | 'pending'.
 */
function normalizeProviderStatus(raw) {
  const s = String(raw || '').toLowerCase();
  if (['submitted', 'pending', 'processing', 'initiated'].includes(s)) return 'submitted';
  if (['success', 'completed', 'paid', 'confirmed', 'settled'].includes(s)) return 'completed';
  if (['failed', 'error', 'declined'].includes(s)) return 'failed';
  if (['cancelled', 'canceled', 'reversed', 'refunded'].includes(s)) return 'cancelled';
  return 'pending';
}

/**
 * Map a normalized NTZS provider status to the local payment_transactions
 * status enum: 'pending' | 'completed' | 'failed' | 'reversed'.
 */
function getLocalStatus(providerStatus) {
  const map = {
    submitted: 'pending',
    completed: 'completed',
    failed: 'failed',
    cancelled: 'reversed',
    pending: 'pending',
  };
  return map[providerStatus] || 'pending';
}

function receiptUrl(paymentId) {
  return `/api/payments/${paymentId}/receipt`;
}

async function getOrder(pool, orderId) {
  const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? OR order_number = ?', [
    orderId,
    orderId,
  ]);
  if (!rows.length) return null;
  return rows[0];
}

// ---------------------------------------------------------------------------
// NTZS API helpers
// ---------------------------------------------------------------------------

/**
 * Call the nTZS deposit API through the shared client.
 *
 * The client owns transport, auth, timeouts and error normalization across
 * all three nTZS error shapes, so checkout and the dedicated collections
 * routes behave identically. Errors are returned, not thrown, to keep the
 * existing initPayment contract.
 */
async function callNtzsAPI(payload, idempotencyKey, api) {
  if (!idempotencyKey) {
    throw new Error('Idempotency key is required for NTZS payment');
  }

  try {
    const data = await ntzs.request('POST', '/deposits', {
      body: payload,
      idempotencyKey,
      apiKey: api || getCurrentApiKey(),
    });
    return { ok: true, data };
  } catch (err) {
    if (err instanceof NtzsError) {
      return {
        ok: false,
        status: err.status,
        code: err.code,
        message: err.message,
        raw: err.raw || {},
        // 502 initiation_uncertain: the collection may still have been taken.
        // Caller must read the deposit back before retrying.
        uncertain: err.uncertain,
      };
    }
    return { ok: false, status: 502, code: 'network_error', message: err.message, raw: {} };
  }
}

/**
 * Build the NTZS deposit payload.
 *
 * Per the nTZS collections contract (POST /api/v1/deposits):
 * - `userId` is documented as OPTIONAL ("omit to collect into your treasury"),
 *   but the deployed API rejects the omission with 400 "userId and amountTzs
 *   are required", so the configured treasury holder is sent. It must be the
 *   holder id nTZS issued: a local customer id answers 404/400, and wallets are
 *   out of scope so no user id is ever minted here.
 * - paymentMethod is REQUIRED: mobile_money | card | bank_transfer | lipa_namba
 * - phoneNumber is required for mobile_money and lipa_namba (digits only, no +)
 * - redirectUrl + cancelUrl are required for card (must be HTTPS)
 * - payerAccountNumber identifies the payer for a bank transfer
 */
function buildNtzsPayload(payment, method) {
  if (!payment.amount) {
    throw new Error('Payment amount is required');
  }

  const payload = {
    amountTzs: Number(payment.amount),
    paymentMethod: method,
  };

  // As of API v1.28.0 the treasury is tied to the API key: a collection names
  // no receiving holder and lands in the platform wallet. What it does carry is
  // `endUser` — our own customer id — which nTZS needs for regulatory
  // traceability and hands back on `deposit.completed` so the webhook matches.
  // No end-user wallet and no holder id are involved.
  payload.endUser = { reference: String(payment.endUserReference) };

  // Collections land in the partner treasury whenever `userId` is omitted, so
  // there is no collectToTreasury flag to send — omitting the field IS the
  // treasury path in the current nTZS spec.

  // mobile_money + lipa_namba require a phone number (digits only, no +).
  if ((method === 'mobile_money' || method === 'lipa_namba') && payment.phone) {
    payload.phoneNumber = normalizePhone(payment.phone).replace('+', '');
  }

  // card requires redirect/cancel URLs (must be HTTPS).
  if (method === 'card') {
    if (payment.redirect_url) payload.redirectUrl = payment.redirect_url;
    if (payment.cancel_url) payload.cancelUrl = payment.cancel_url;
  }

  // bank_transfer identifies the payer so the credit can be matched.
  if (method === 'bank_transfer' && payment.phone) {
    payload.phoneNumber = normalizePhone(payment.phone).replace('+', '');
  }

  return payload;
}

/**
 * Build the next_action object returned to the frontend so the checkout UI
 * knows how to prompt the buyer / redirect / display instructions.
 */
function buildNextAction(method, payment, ntzsData) {
  switch (method) {
    case 'card':
      return {
        type: 'ntzs_card_redirect',
        payment_url: ntzsData?.paymentUrl || null,
      };
    case 'bank_transfer':
      return {
        type: 'ntzs_await_slip',
        reference: ntzsData?.reference || payment.bank_reference || null,
        amount: Number(payment.amount),
      };
    case 'lipa_namba':
      return {
        type: 'ntzs_lipa_namba_prompt',
        phone: normalizePhone(payment.phone),
      };
    case 'mobile_money':
    default:
      return {
        type: 'ntzs_mobile_money_prompt',
        phone: normalizePhone(payment.phone),
      };
  }
}

// ---------------------------------------------------------------------------
// NTZS provider adapter
// ---------------------------------------------------------------------------

const NTZS_PROVIDER = {
  name: 'NTZS',

  /**
   * Initiate a payment via NTZS. Returns a result object consumed by initPayment.
   * Calls the REAL NTZS API — no stub/fallback mode.
   */
  async call(payment) {
    const method = normalizeMethod(payment.payment_method);

    try {
      const payload = buildNtzsPayload(payment, method);
      const idempotencyKey = payment.idempotency_key || crypto.randomUUID();

      const apiKey = getCurrentApiKey();
      const res = await callNtzsAPI(payload, idempotencyKey, apiKey);

      if (!res.ok) {
        console.error('NTZS PAYMENT FAILED:', res.raw);

        /*
         * nTZS rejects a receiving holder it does not recognise, in two shapes:
         * 404 "User not found" for a well-formed id that matches no user, and
         * an opaque 5xx for some values. Neither is a buyer problem and neither
         * is retryable, so both collapse to one code that says what is actually
         * wrong. The detail goes to the log; the buyer gets a message that does
         * not leak configuration.
         */
        const rejectedText = String(res.message || '').toLowerCase();

        const holderUnknown =
          payload.userId &&
          (res.status === 404 ||
            rejectedText.includes('user not found') ||
            (res.status >= 500 && res.code !== 'initiation_uncertain'));

        if (holderUnknown) {
          console.error(
            `NTZS collection holder rejected: NTZS_COLLECTION_USER_ID = ${payload.userId} ` +
            `(nTZS said: ${res.status} ${res.message || res.code || 'no detail'}). ` +
            'It must be a holder user id issued by nTZS, not a value configured locally.'
          );
        }

        return {
          ok: false,
          provider: 'ntzs',
          error: holderUnknown
            ? 'Payment is temporarily unavailable. Please choose another payment method or contact support.'
            : res.message || 'NTZS payment failed',
          status: holderUnknown ? 502 : res.status,
          code: holderUnknown ? 'collection_holder_unknown' : res.code || null,
          // 502 initiation_uncertain: the collection may still have been taken.
          // Caller must read the deposit back before retrying.
          uncertain: res.status === 502 && res.code === 'initiation_uncertain',
        };
      }

      const ntzsData = res.data;
      const providerStatus = normalizeProviderStatus(ntzsData.status || ntzsData.state);
      const localStatus = getLocalStatus(providerStatus);

      return {
        ok: true,
        provider: 'ntzs',
        provider_ref: ntzsData.id || ntzsData.depositId || null,
        status: localStatus,
        next_action: buildNextAction(method, payment, ntzsData),
        payment_url: ntzsData.paymentUrl || ntzsData.payment_url || null,
        instructions: typeof ntzsData.instructions === 'object'
          ? JSON.stringify(ntzsData.instructions)
          : ntzsData.instructions || null,
        reference: ntzsData.reference || null,
        raw: ntzsData,
      };
    } catch (err) {
      console.error('NTZS REAL API ERROR:', err);
      return {
        ok: false,
        provider: 'ntzs',
        error: err.message,
      };
    }
  },

  /**
   * Poll the NTZS API for the current status of a payment.
   * Returns the normalized local status, or null if it cannot be determined
   * (in which case the caller falls back to the locally stored status).
   */
  async poll(paymentId, providerRef) {
    if (!providerRef) return null;

    try {
      const ntzsData = await ntzs.getDeposit(providerRef);
      const providerStatus = normalizeProviderStatus(ntzsData.status || ntzsData.state);
      return getLocalStatus(providerStatus);
    } catch (err) {
      console.error('NTZS POLLING ERROR:', err.message);
      return null;
    }
  },

  /**
    * Verify the NTZS webhook signature (x-webhook-signature header, HMAC-SHA256).
    */
  verifyWebhook(body, headers) {
    const secret =
      process.env.NTZS_WEBHOOK_SECRET;

    if (!secret) {
      console.error(
        'NTZS_WEBHOOK_SECRET is missing'
      );

      return false;
    }

    let bodyString;

    if (Buffer.isBuffer(body)) {
      bodyString =
        body.toString('utf8');
    } else if (typeof body === 'string') {
      bodyString = body;
    } else {
      bodyString =
        JSON.stringify(body || {});
    }

    const signature =
      headers['x-webhook-signature'] ||
      headers['X-Webhook-Signature'];

    const timestamp =
      headers['x-webhook-timestamp'] ||
      headers['X-Webhook-Timestamp'];

    if (!signature || !timestamp) {
      return false;
    }

    const signedPayload =
      `${timestamp}.${bodyString}`;

    const expected =
      crypto
        .createHmac(
          'sha256',
          secret
        )
        .update(signedPayload)
        .digest('hex');

    /*
     * timingSafeEqual prevents timing attacks.
     */
    try {
      const a =
        Buffer.from(signature, 'utf8');

      const b =
        Buffer.from(expected, 'utf8');

      if (a.length !== b.length) {
        return false;
      }

      return crypto.timingSafeEqual(a, b);

    } catch {
      return false;
    }
  },

   /**
    * Parse an NTZS webhook payload into the canonical shape.
    */
  parseWebhook(payload) {
    const data =
      payload?.data || payload || {};

    return {
      event:
        payload?.type ||
        payload?.event ||
        null,

      provider_ref:
        data.depositId ||
        data.id ||
        data.paymentId ||
        data.provider_ref ||
        null,

      status:
        data.status ||
        data.state ||
        'pending',

      amount:
        data.amountTzs ||
        data.amount ||
        null,

      user_id:
        data.userId ||
        null,

      tx_hash:
        data.txHash ||
        null,

      psp_reference:
        data.pspReference ||
        null,

      external_reference:
        data.externalReference ||
        null,

      livemode:
        data.livemode,
    };
  },
};

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

const PROVIDERS = {
  ntzs: NTZS_PROVIDER,
  cash: {
    name: 'Cash on Delivery',
    call: async () => ({
      ok: true,
      provider: 'cash',
      provider_ref: `COD_${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      next_action: { type: 'cod_await_approval' },
    }),
  },
};

// ---------------------------------------------------------------------------
// Payment status polling (for providers that support it)
// ---------------------------------------------------------------------------

async function pollPaymentStatus(pool, auth, paymentId) {
  const [rows] = await pool.query(
    'SELECT id, provider_ref, provider, payment_method, status FROM payment_transactions WHERE id = ? AND customer_id = ?',
    [paymentId, auth.customerId]
  );
  if (!rows.length) return { success: false, status: 404, message: 'Payment not found' };

  const payment = rows[0];
  const methodNorm = normalizeMethod(payment.payment_method);

  // Cash (COD) payments are not polled — they are resolved by admin approval.
  if (methodNorm === 'cash') return getStatus(pool, paymentId, auth.customerId);

  const ntzsProvider = PROVIDERS.ntzs;
  if (!ntzsProvider.poll) return getStatus(pool, paymentId, auth.customerId);

  const status = await ntzsProvider.poll(paymentId, payment.provider_ref);
  if (!status) return getStatus(pool, paymentId, auth.customerId);

  await pool.query('UPDATE payment_transactions SET status = ?, updated_at = NOW() WHERE id = ?', [
    status,
    payment.id,
  ]);

  realtime.publishOrders(auth.customerId, {
    type: 'payment_status_update',
    payment_id: payment.id,
    status: status,
  });

  return { success: true, payment_id: payment.id, status };
}

// ---------------------------------------------------------------------------
// Idempotent checkout
// ---------------------------------------------------------------------------

async function initPayment(pool, auth, body) {
  const {
    order_id,
    amount,
    method,
    idempotency_key,
    phone,
    card_token,
    bank_reference,
    redirect_url,
    redirectUrl,
    cancel_url,
    cancelUrl,
    notes,
  } = body;

  const providerIdempotencyKey =
    idempotency_key || crypto.randomUUID();

  const orderId = order_id;
  const order = await getOrder(pool, orderId);
  if (!order) return { success: false, status: 404, message: 'Order not found' };

  const methodNorm = normalizeMethod(method);
  const isCod = methodNorm === 'cash';
  // The payer's own reference: required by nTZS on every platform-wallet
  // transaction and echoed back on deposit.completed for webhook matching.
  const endUserReference = auth.customerId;

  // COD does not call NTZS — it just creates a pending payment awaiting finance approval.
  // All other methods go through NTZS.
  const providerAdapter = isCod ? PROVIDERS.cash : PROVIDERS.ntzs;

  if (!isCod) {
    // Require a minimum amount for NTZS payments.
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum < NTZS_MIN_PAYMENT) {
      return {
        success: false,
        status: 400,
        message: `Amount must be at least ${NTZS_MIN_PAYMENT} TZS`,
      };
    }
    // Mobile money / Lipa Namba require a phone number.
    if ((methodNorm === 'mobile_money' || methodNorm === 'lipa_namba') && !phone) {
      return {
        success: false,
        status: 400,
        message: 'A phone number is required for this payment method',
      };
    }
    // Card payments require redirect/cancel URLs.
    if (methodNorm === 'card') {
      const rUrl = redirect_url || redirectUrl;
      const cUrl = cancel_url || cancelUrl;
      if (!rUrl || !cUrl) {
        return {
          success: false,
          status: 400,
          message: 'redirect_url and cancel_url are required for card payments',
        };
      }
    }
    // Bank transfer requires the payer's account/phone number (payerAccountNumber).
    if (methodNorm === 'bank_transfer' && !phone) {
      return {
        success: false,
        status: 400,
        message: 'A phone number is required for bank_transfer payments (payerAccountNumber)',
      };
    }
    /*
     * Nothing to check here about the receiving holder: the spec form (no
     * `userId`) collects into the partner treasury, which is the documented path
     * for an account without `wallets`. If this deployment insists on a
     * `userId`, its rejection is mapped further down rather than pre-empted
     * here, so the code stays correct against the specification.
     */
  }

  try {
    // Dedup existing payment for this idempotency key.
    const [existing] = await pool.query(
      'SELECT id, provider_ref, status, next_action, order_id, provider, metadata FROM payment_transactions WHERE idempotency_key = ?',
      [providerIdempotencyKey]
    );
    let uncertainAttempt = null;
    if (existing.length > 0) {
      const prior = existing[0];
      const priorUncertain = prior.provider_ref
        ? false
        : /"initiation_uncertain"\s*:\s*true/.test(prior.metadata || '');

      /*
       * A prior attempt that carries a provider ref really was collected, so
       * replaying it is safe. A prior attempt with no ref is an uncertain
       * initiation: the provider never confirmed a deposit, so answering
       * "success" would be a lie. Fall through and re-issue the request with
       * the same Idempotency-Key, which the provider either replays as the
       * original deposit or rejects — it cannot charge twice.
       */
      if (!priorUncertain) {
        return {
          success: true,
          payment_id: prior.id,
          order_id: orderId,
          status: 'pending',
          provider: methodNorm,
          provider_ref: prior.provider_ref,
          next_action: prior.next_action ? JSON.parse(prior.next_action) : null,
          idempotent: true,
        };
      }
      uncertainAttempt = prior;
    }

    // Call the provider adapter.
    const result = await providerAdapter.call({
      phone,
      card_token,

      amount,

      order_id: orderId,

      /*
       * Use the customer ID (externalId) directly — NOT the NTZS user id
       * from POST /api/v1/users.
       */
      externalId: auth.customerId,
      customer_id: auth.customerId,

      payment_method: methodNorm,

      /*
       * The payer's own reference. This is what nTZS echoes back on
       * deposit.completed, so it must be the stable customer id and not a
       * per-attempt value.
       */
      endUserReference: auth.customerId,

      redirect_url:
        redirect_url || redirectUrl,

      cancel_url:
        cancel_url || cancelUrl,

      bank_reference,

      /*
       * Use the same idempotency key for the provider request.
       */
      idempotency_key:
        providerIdempotencyKey,
    });

    if (!result.ok) {
      /*
       * 502 initiation_uncertain: the prompt may already have been delivered
       * and the collection may already have been taken. The honest answer is a
       * 202 telling the client to read the payment back (POST /:id/poll), not a
       * failure it would retry into a double charge.
       */
      if (result.uncertain) {
        /*
         * Record the attempt even though the provider never confirmed it. The
         * customer needs a payment_id to come back to, and the attempt has to
         * be on record for reconciliation if the deposit turns out to have
         * landed. No provider_ref is known, so the row is explicitly flagged
         * uncertain and the next attempt with this key re-issues the request.
         */
        const uncertainMetadata = JSON.stringify({
          provider: result.provider || 'ntzs',
          initiation_uncertain: true,
          provider_code: result.code || 'initiation_uncertain',
          ntzs_ref: null,
          phone: phone || null,
          bank_reference: bank_reference || null,
          notes: notes || null,
        });

        let uncertainPaymentId;
        if (uncertainAttempt) {
          // Same key, still no confirmation: refresh the attempt in place.
          uncertainPaymentId = uncertainAttempt.id;
          await pool.query(
            `UPDATE payment_transactions
                SET status = 'pending', metadata = ?, receipt_url = ?
              WHERE id = ?`,
            [uncertainMetadata, receiptUrl(uncertainPaymentId), uncertainPaymentId]
          );
        } else {
          const [uncertainIns] = await pool.query(
            `INSERT INTO payment_transactions
               (customer_id, order_id, amount, payment_method, transaction_ref, provider_ref,
                provider, status, idempotency_key, next_action, metadata, receipt_url)
             VALUES (?, ?, ?, ?, NULL, NULL, ?, 'pending', ?, NULL, ?, ?)`,
            [
              auth.customerId,
              orderId,
              Number(amount),
              methodNorm,
              result.provider || 'ntzs',
              providerIdempotencyKey,
              uncertainMetadata,
              receiptUrl('(id)'),
            ]
          );
          uncertainPaymentId = uncertainIns.insertId;
          await pool.query('UPDATE payment_transactions SET receipt_url = ? WHERE id = ?', [
            receiptUrl(uncertainPaymentId),
            uncertainPaymentId,
          ]);
        }

        return {
          success: false,
          status: 202,
          code: result.code || 'initiation_uncertain',
          message:
            'We could not confirm whether the mobile money prompt was delivered. The collection may still have been taken — check this payment before trying again.',
          retry: 'verify',
          payment_id: uncertainPaymentId,
          order_id: orderId,
          provider: methodNorm,
        };
      }

      /*
       * Deterministic provider rejection (4xx). Pass the upstream status and
       * machine code through instead of flattening everything to 402, so the
       * client can tell a validation error from a declined collection.
       */
      const upstreamStatus =
        Number.isInteger(result.status) && result.status >= 400 && result.status <= 599
          ? result.status
          : 402;
      return {
        success: false,
        status: upstreamStatus,
        code: result.code || null,
        message: result.error || 'Provider error',
      };
    }

    const nextAction = result.next_action ? JSON.stringify(result.next_action) : null;
    const providerRef = result.provider_ref || null;
    const providerMetadata = JSON.stringify({
      provider: result.provider,
      ntzs_ref: result.provider_ref || null,
      // Our own customer reference. nTZS echoes the same endUser on
      // deposit.completed, so a webhook can be matched on it as well as on the
      // provider id.
      end_user_reference: String(endUserReference),
      end_user: (result.raw && result.raw.endUser) || null,
      phone: phone || null,
      bank_reference: bank_reference || null,
      notes: notes || null,
      payment_url: result.payment_url || null,
      instructions: result.instructions || null,
      reference: result.reference || null,
      card_token: card_token || null,
    });

    let paymentId;
    if (uncertainAttempt) {
      /*
       * The earlier attempt for this key never got a deposit ref. The provider
       * has now confirmed one, so promote that row instead of inserting a
       * second row against a unique idempotency key.
       */
      paymentId = uncertainAttempt.id;
      await pool.query(
        `UPDATE payment_transactions
            SET transaction_ref = ?, provider_ref = ?, provider = ?, status = 'pending',
                next_action = ?, metadata = ?, receipt_url = ?
          WHERE id = ?`,
        [
          providerRef,
          providerRef,
          result.provider,
          nextAction,
          providerMetadata,
          receiptUrl(paymentId),
          paymentId,
        ]
      );
    } else {
      const [ins] = await pool.query(
        `INSERT INTO payment_transactions
           (customer_id, order_id, amount, payment_method, transaction_ref, provider_ref,
            provider, status, idempotency_key, next_action, metadata, receipt_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
        [
          auth.customerId,
          orderId,
          Number(amount),
          methodNorm,
          providerRef,
          providerRef,
          result.provider,
          providerIdempotencyKey,
          nextAction,
          providerMetadata,
          receiptUrl('(id)'),
        ]
      );
      paymentId = ins.insertId;
    }

    // Correct the receipt_url with the real id.
    await pool.query('UPDATE payment_transactions SET receipt_url = ? WHERE id = ?', [
      receiptUrl(paymentId),
      paymentId,
    ]);

    // Audit + SSE: payment initiated (NOT paid yet — buyer will mark as submitted).
    try {
      const lifecycle = require('./orderLifecycle')(pool);
      const orderRow = await getOrder(pool, orderId);
      if (orderRow) {
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          await lifecycle.recordEvent(pool, conn, orderRow.id, {
            action: 'payment_initiated',
            status: orderRow.status || 'pending_payment',
            previousStatus: orderRow.status,
            actorId: auth.customerId,
            actorRole: auth.role,
            notes: `Payment initiated via NTZS (${methodNorm}) (ref ${result.provider_ref})`,
            metadata: {
              provider: result.provider,
              provider_ref: result.provider_ref,
              next_action: result.next_action,
            },
          });
          await conn.commit();
        } catch (e) {
          await conn.rollback();
          console.warn('payment_initiated audit failed:', e.message);
        } finally {
          conn.release();
        }
      }
    } catch (e) {
      console.warn('payment_initiated audit failed:', e.message);
    }

    realtime.publishOrders(auth.customerId, {
      type: 'payment_initiated',
      order_id: orderId,
      payment_id: paymentId,
      provider: methodNorm,
      next_action: result.next_action,
      payment_url: result.payment_url || null,
      instructions: result.instructions || null,
      reference: result.reference || null,
    });

    return {
      success: true,
      payment_id: paymentId,
      order_id: orderId,
      status: 'pending',
      provider: methodNorm,
      provider_ref: result.provider_ref,
      next_action: result.next_action,
      payment_url: result.payment_url || null,
      instructions: result.instructions || null,
      reference: result.reference || null,
      receipt_url: receiptUrl(paymentId),
    };
  } catch (err) {
    return { success: false, status: 500, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Inbound webhook handler with NTZS HMAC signature verification
// ---------------------------------------------------------------------------

async function handleWebhook(pool, provider, payload, rawBody, headers) {
  const providerAdapter = PROVIDERS[provider];
  if (!providerAdapter) return { ok: false, status: 400, message: `Unknown provider: ${provider}` };

  const verified = providerAdapter.verifyWebhook(rawBody, headers);
  if (!verified) return { ok: false, status: 401, message: 'Webhook signature invalid' };

  const parsed = providerAdapter.parseWebhook(payload);
  const providerRef = parsed.provider_ref;
  if (!providerRef) return { ok: false, status: 400, message: 'Missing reference' };

  const [rows] = await pool.query(
    'SELECT id, order_id, customer_id, amount, status, provider FROM payment_transactions WHERE provider_ref = ? LIMIT 1',
    [providerRef]
  );

  if (!rows.length)
    return { ok: true, idempotent: true, status: 200, message: 'No matching payment' };

  const payment = rows[0];
  const newStatus = normalizeProviderStatus(parsed.status);
  const localStatus = getLocalStatus(newStatus);

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Idempotency: skip if already completed or reversed.
    if (payment.status === 'completed' || payment.status === 'reversed') {
      await conn.commit();
      return { ok: true, idempotent: true, status: 200, message: 'Already reconciled' };
    }

    await conn.query(
      'UPDATE payment_transactions SET status = ?, amount = COALESCE(?, amount), provider = ?, updated_at = NOW() WHERE id = ?',
      [localStatus, parsed.amount, provider, payment.id]
    );

    await conn.commit();

    // NOTE: In the new no-escrow flow, the webhook does NOT transition the
    // order status. The order moves to `paid` only when the SELLER confirms
    // receipt via the confirm_payment action. The webhook just updates the
    // payment record's status so the buyer/seller can see the provider result.

    realtime.publishOrders(payment.customer_id, {
      type: 'payment_status_update',
      order_id: payment.order_id,
      payment_id: payment.id,
      status: localStatus,
      provider: provider,
    });

    return {
      ok: true,
      idempotent: false,
      status: 200,
      payment_id: payment.id,
      updated_status: localStatus,
    };
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {
        /* best effort */
      }
    }
    console.error('webhook processing error:', err.message);
    return { ok: false, status: 500, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Finance approval for Cash-on-Delivery
// ---------------------------------------------------------------------------

async function approveCodPayment(pool, auth, paymentId) {
  if (!['finance_admin', 'superadmin', 'marketplace_admin'].includes(auth.role)) {
    return { success: false, status: 403, message: 'Finance approval required' };
  }
  const [rows] = await pool.query(
    'SELECT id, order_id, customer_id, amount FROM payment_transactions WHERE id = ? AND payment_method = "cash"',
    [paymentId]
  );
  if (!rows.length) return { success: false, status: 404, message: 'COD payment not found' };
  const payment = rows[0];
  const lifecycle = require('./orderLifecycle')(pool);
  const order = await getOrder(pool, payment.order_id);
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    await conn.query(
      "UPDATE payment_transactions SET status = 'completed', updated_at = NOW() WHERE id = ?",
      [payment.id]
    );
    if (order) {
      await lifecycle.recordEvent(pool, conn, order.id, {
        action: 'payment_confirmed',
        status: 'paid',
        previousStatus: order.status,
        actorId: auth.customerId,
        actorRole: 'finance_admin',
        notes: 'Cash-on-delivery approved by finance',
        metadata: { provider: 'cash', payment_id: payment.id },
      });
      await lifecycle.performTransition(
        pool,
        { customerId: payment.customer_id, role: 'superadmin' },
        { action: 'admin_intervene', order_id: order.id, target_status: 'paid' }
      );
    }
    await conn.commit();
    realtime.publishOrders(payment.customer_id, {
      type: 'payment_confirmed',
      order_id: payment.order_id,
      payment_id: payment.id,
      status: 'completed',
    });
    return { success: true, id: payment.id, status: 'completed' };
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {
        /* best effort */
      }
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Getters
// ---------------------------------------------------------------------------

async function getReceipt(pool, paymentId) {
  const [rows] = await pool.query(
    `SELECT pt.id, pt.order_id, pt.amount, pt.payment_method, pt.transaction_ref, pt.provider_ref,
            pt.provider, pt.status, pt.created_at, pt.metadata,
            o.order_number, o.total_amount,
            o.shipping_address, c.full_name AS customer_name, c.email AS customer_email
       FROM payment_transactions pt
       JOIN orders o ON pt.order_id = o.id
       JOIN customers c ON pt.customer_id = c.id
       WHERE pt.id = ?`,
    [paymentId]
  );
  if (!rows.length) return { success: false, status: 404, message: 'Payment not found' };
  const r = rows[0];
  return {
    success: true,
    receipt: {
      id: r.id,
      order_number: r.order_number,
      customer_name: r.customer_name,
      customer_email: r.customer_email,
      amount: Number(r.amount),
      method: r.payment_method,
      provider: r.provider,
      provider_ref: r.provider_ref,
      transaction_ref: r.transaction_ref,
      status: r.status,
      payment_date: r.created_at,
      shipping_address: r.shipping_address,
      metadata: r.metadata ? JSON.parse(r.metadata) : {},
    },
    receipt_url: `/api/payments/${r.id}/receipt`,
  };
}

async function getStatus(pool, paymentId, customerId) {
    const [rows] = await pool.query(
        'SELECT id, order_id, amount, payment_method, provider_ref, status, next_action FROM payment_transactions WHERE id = ? AND customer_id = ?',
        [paymentId, customerId]
    );
    if (!rows.length) return { success: false, status: 404, message: 'Not found' };
  const p = rows[0];
  return {
    success: true,
    payment_id: p.id,
    order_id: p.order_id,
    amount: Number(p.amount),
    method: p.payment_method,
    provider_ref: p.provider_ref,
    status: p.status,
    next_action: p.next_action ? JSON.parse(p.next_action) : null,
  };
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Direct buyer → seller payment confirmation (no escrow)
// ---------------------------------------------------------------------------

/**
 * Buyer marks payment as submitted (enter payment reference).
 * Transitions order: pending_payment -> buyer_marked_paid
 */
async function markBuyerPaymentSubmitted(pool, auth, body) {
  const { order_id, payment_reference, payment_id } = body;
  const order = await getOrder(pool, order_id);
  if (!order) return { success: false, status: 404, message: 'Order not found' };

  // Verify the payment belongs to this buyer.
  const paymentWhere = payment_id ? 'id = ? AND customer_id = ?' : 'order_id = ? AND customer_id = ?';
  const paymentParam = payment_id ? [payment_id, auth.customerId] : [order_id, auth.customerId];
  const [payments] = await pool.query(
    `SELECT id, status, buyer_payment_reference FROM payment_transactions WHERE ${paymentWhere}`,
    paymentParam
  );
  if (!payments.length) return { success: false, status: 404, message: 'Payment not found' };

  const payment = payments[0];
  if (payment.status === 'completed') {
    return { success: false, status: 400, message: 'Payment already confirmed' };
  }

  const lifecycle = require('./orderLifecycle')(pool);
  try {
    await lifecycle.performTransition(pool, auth, {
      action: 'mark_payment_submitted',
      order_id: order.id,
      payment_reference: payment_reference || payment.buyer_payment_reference,
      notes: `Buyer marked payment as submitted (ref: ${payment_reference || payment.buyer_payment_reference})`,
    });

    // Record the payment reference on the payment record.
    if (payment_reference) {
      await pool.query(
        'UPDATE payment_transactions SET buyer_payment_reference = ? WHERE id = ?',
        [payment_reference, payment.id]
      );
    }

    realtime.publishOrders(auth.customerId, {
      type: 'payment_submitted',
      order_id: order.id,
      payment_id: payment.id,
    });

    return { success: true, order_id: order.id, payment_id: payment.id, status: 'buyer_marked_paid' };
  } catch (err) {
    return { success: false, status: err.status || 409, message: err.message };
  }
}

/**
 * Seller confirms a buyer's payment.
 * Transitions order: buyer_marked_paid -> paid (payment_status: completed)
 */
async function confirmSellerPayment(pool, auth, body) {
  const { order_id, payment_id, seller_notes } = body;
  const order = await getOrder(pool, order_id);
  if (!order) return { success: false, status: 404, message: 'Order not found' };

  let payment;
  if (payment_id) {
    const [rows] = await pool.query(
      'SELECT id, status, seller_id FROM payment_transactions WHERE id = ? AND order_id = ?',
      [payment_id, order.id]
    );
    if (!rows.length) return { success: false, status: 404, message: 'Payment not found' };
    payment = rows[0];
  } else {
    payment = { id: null, status: 'pending' };
  }

  // Verify seller ownership.
  const lifecycle = require('./orderLifecycle')(pool);
  try {
    await lifecycle.performTransition(pool, auth, {
      action: 'confirm_payment',
      order_id: order.id,
      notes: seller_notes || 'Seller confirmed payment receipt',
    });

    // Update payment transaction status.
    if (payment.id) {
      await pool.query(
        "UPDATE payment_transactions SET status = 'completed', completed_at = NOW(), seller_notes = ? WHERE id = ?",
        [seller_notes || null, payment.id]
      );
    }

    realtime.publishOrders(auth.customerId, {
      type: 'payment_confirmed',
      order_id: order.id,
      payment_id: payment.id,
    });

    // Notify the buyer.
    realtime.publishOrders(order.customer_id, {
      type: 'order_status_update',
      order_id: order.id,
      action: 'confirm_payment',
      status: 'paid',
    });

    return { success: true, order_id: order.id, status: 'paid', payment_id: payment.id };
  } catch (err) {
    return { success: false, status: err.status || 403, message: err.message };
  }
}

/**
 * Seller rejects a buyer's payment.
 * Transitions order: buyer_marked_paid -> payment_rejected
 */
async function rejectSellerPayment(pool, auth, body) {
  const { order_id, payment_id, reason } = body;
  const order = await getOrder(pool, order_id);
  if (!order) return { success: false, status: 404, message: 'Order not found' };

  const lifecycle = require('./orderLifecycle')(pool);
  try {
    await lifecycle.performTransition(pool, auth, {
      action: 'reject_payment',
      order_id: order.id,
      reason: reason || 'Payment rejected by seller',
    });

    if (payment_id) {
      await pool.query(
        "UPDATE payment_transactions SET status = 'rejected', rejected_at = NOW(), seller_notes = ? WHERE id = ?",
        [reason || null, payment_id]
      );
    }

    realtime.publishOrders(auth.customerId, {
      type: 'payment_rejected',
      order_id: order.id,
    });

    // Notify the buyer.
    realtime.publishOrders(order.customer_id, {
      type: 'order_status_update',
      order_id: order.id,
      action: 'reject_payment',
      status: 'payment_rejected',
    });

    return { success: true, order_id: order.id, status: 'payment_rejected' };
  } catch (err) {
    return { success: false, status: err.status || 403, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = (pool) => ({
  pool,
  PROVIDERS,
  normalizeMethod,
  normalizePhone,
  normalizeWebhookStatus,
  normalizeProviderStatus,
  getLocalStatus,
  getCurrentApiKey,
  initPayment,
  handleWebhook,
  pollPaymentStatus,
  approveCodPayment,
  getReceipt,
  getStatus,
  markBuyerPaymentSubmitted,
  confirmSellerPayment,
  rejectSellerPayment,
});
