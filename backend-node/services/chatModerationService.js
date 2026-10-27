'use strict'

/**
 * Chat Moderation Service
 *
 * Central service that runs all content detectors on outgoing messages.
 * Never trust the frontend — the backend is authoritative.
 *
 * Flow:
 *   1. Check if sender is restricted (blocked from sending)
 *   2. Check rate limits
 *   3. Run detectors (phone, email, social media, URL, payment, off-platform)
 *   4. If blocked → record moderation event, update user stats, notify
 *      If safe     → return { safe: true }
 *
 * All detection rules are modular so they can be improved independently.
 */

const { detectPhoneNumber } = require('../utils/phoneDetection')
const { detectEmail } = require('../utils/emailDetection')
const { detectExternalUrl } = require('../utils/urlDetection')

// ------------------------------------------------------------------
// Violation type constants
// ------------------------------------------------------------------
const VIOLATION = {
  PHONE_NUMBER: 'PHONE_NUMBER',
  EMAIL: 'EMAIL',
  SOCIAL_MEDIA: 'SOCIAL_MEDIA',
  WHATSAPP: 'WHATSAPP',
  TELEGRAM: 'TELEGRAM',
  EXTERNAL_URL: 'EXTERNAL_URL',
  PAYMENT_ACCOUNT: 'PAYMENT_ACCOUNT',
  BANK_ACCOUNT: 'BANK_ACCOUNT',
  MOBILE_MONEY: 'MOBILE_MONEY',
  CRYPTO_WALLET: 'CRYPTO_WALLET',
  NFT_MARKETPLACE: 'NFT_MARKETPLACE',
  QR_CODE: 'QR_CODE',
  OFF_PLATFORM_TRANSACTION: 'OFF_PLATFORM_TRANSACTION',
  SPAM: 'SPAM',
  HARASSMENT: 'HARASSMENT',
}

const SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
}

// User-facing messages (deliberately generic to avoid revealing detection logic)
const USER_MESSAGES = {
  [VIOLATION.PHONE_NUMBER]: 'Phone numbers cannot be shared through Nafaka Hub chat. Keep all communication and transactions on the platform.',
  [VIOLATION.EMAIL]: 'Email addresses cannot be shared through Nafaka Hub chat. Keep all communication and the platform.',
  [VIOLATION.SOCIAL_MEDIA]: 'Social media contact information cannot be shared through Nafaka Hub chat.',
  [VIOLATION.WHATSAPP]: 'WhatsApp contact information cannot be shared through Nafaka Hub chat.',
  [VIOLATION.TELEGRAM]: 'Telegram contact information cannot be shared through Nafaka Hub chat.',
  [VIOLATION.EXTERNAL_URL]: 'External links are not allowed in marketplace conversations.',
  [VIOLATION.PAYMENT_ACCOUNT]: 'External payment details cannot be shared through Nafaka Hub chat. Please use Nafaka Hub\'s supported payment methods.',
  [VIOLATION.BANK_ACCOUNT]: 'Bank account details cannot be shared through Nafaka Hub chat.',
  [VIOLATION.MOBILE_MONEY]: 'Mobile money details cannot be shared through Nafaka Hub chat. Please use Nafaka Hub\'s supported payment methods.',
  [VIOLATION.QR_CODE]: 'QR codes with contact or payment information cannot be shared.',
  [VIOLATION.CRYPTO_WALLET]: 'Cryptocurrency wallet addresses cannot be shared through Nafaka Hub chat.',
  [VIOLATION.NFT_MARKETPLACE]: 'NFT and cryptocurrency marketplace links are not allowed in marketplace conversations.',
  [VIOLATION.OFF_PLATFORM_TRANSACTION]: 'Nafaka Hub requires all transactions to be completed within the platform.',
  [VIOLATION.SPAM]: 'This message appears to be spam and was not sent.',
  [VIOLATION.HARASSMENT]: 'This message violates our policies and was not sent.',
}

// ------------------------------------------------------------------
// Cached settings (loaded from DB)
// ------------------------------------------------------------------
let settingsCache = null
let settingsCacheTime = 0
const SETTINGS_TTL_MS = 60_000 // 1 minute

async function loadSettings(pool) {
  if (!pool) return getDefaultSettings()

  const now = Date.now()
  if (settingsCache && now - settingsCacheTime < SETTINGS_TTL_MS) {
    return settingsCache
  }

  try {
    const rows = await pool.query('SELECT setting_key, setting_value FROM chat_moderation_settings')
    const settings = {}
    for (const row of rows) {
      settings[row.setting_key] = row.setting_value
    }
    settingsCache = settings
    settingsCacheTime = now
    return settings
  } catch {
    return getDefaultSettings()
  }
}

function getDefaultSettings() {
  return {
    contact_protection_enabled: '1',
    url_protection_enabled: '1',
    payment_protection_enabled: '1',
    max_message_length: '2000',
    messages_per_minute: '30',
    warning_threshold: '2',
    restriction_threshold: '5',
    restriction_duration_hours: '24',
    allowed_domains: 'nafakahub.co.tz,nafakahub.com',
    allowed_file_types: 'image/jpeg,image/png,image/webp,image/gif',
    max_attachment_size_mb: '10',
  }
}

// ------------------------------------------------------------------
// Detector: Social media platform references
// ------------------------------------------------------------------

// Maps each platform to its keyword set and the violation type to report.
// We only flag when there's a SHARING INTENT, not when social media is
// merely mentioned as a topic.
const PLATFORM_PATTERNS = [
  {
    keys: ['whatsapp'],
    intent: /whatsapp\s*(?:me|contact|add|find|dm|message|number|id)?/i,
    type: VIOLATION.WHATSAPP,
    keywords: ['whatsapp', 'wa.me', 'wa me'],
  },
  {
    keys: ['telegram'],
    intent: /telegram\s*(?:me|contact|add|find|dm|message|id|channel|bot)?/i,
    type: VIOLATION.TELEGRAM,
    keywords: ['telegram', 't\.me', 'telegram.org'],
  },
  {
    keys: ['instagram', 'ig'],
    intent: /(?:dm|message|find|add|follow|contact)\s*(?:me|on|at)\s*(?:instagram|ig)|instagram\s*[:@]?|my\s*ig\s*is/i,
    type: VIOLATION.SOCIAL_MEDIA,
    keywords: ['instagram', 'ig'],
  },
  {
    keys: ['facebook', 'messenger', 'fb'],
    intent: /facebook\s*(?:me|contact|add|find|dm|message)?|messenger\s*(?:me|contact|add|find|dm|message)?|fb\.com|facebook\.com/i,
    type: VIOLATION.SOCIAL_MEDIA,
    keywords: ['facebook', 'messenger', 'fb.com', 'facebook.com'],
  },
  {
    keys: ['tiktok', 'twitter', 'x'],
    intent: /(?:tiktok|twitter|dm|message|find|add|contact)\s*(?:me|on|at)?|tiktok\.com|twitter\.com|x\.com/i,
    type: VIOLATION.SOCIAL_MEDIA,
    keywords: ['tiktok', 'twitter', 'x.com'],
  },
  {
    keys: ['snapchat', 'signal'],
    intent: /snapchat\s*(?:me|contact|add|find|dm|message)?|signal\s*(?:me|contact|add|find|dm|message)?/i,
    type: VIOLATION.SOCIAL_MEDIA,
    keywords: ['snapchat', 'signal'],
  },
  {
    keys: ['discord'],
    intent: /discord\s*(?:me|contact|add|find|dm|message|tag)?|discord\.com\/invite|discord\.gg/i,
    type: VIOLATION.SOCIAL_MEDIA,
    keywords: ['discord', 'discord.com/invite', 'discord.gg'],
  },
]

function detectSocialMedia(content) {
  if (!content || typeof content !== 'string') return null
  const found = []
  const lower = content.toLowerCase()

  for (const platform of PLATFORM_PATTERNS) {
    // Check for sharing intent + keyword
    let triggered = false
    for (const kw of platform.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        // If the keyword appears, check if there's intent language
        if (platform.intent.test(content)) {
          triggered = true
          break
        }
        // Even without explicit intent keywords, if they say "my whatsapp is" etc.
        const myContactRe = new RegExp(`my\\s+${platform.keys.join('|')}\\s*(?:is|number|id|handle)?`, 'i')
        if (myContactRe.test(content)) {
          triggered = true
          break
        }
        // If they share a URL-like reference to the platform
        if (platform.keywords.some((k) => k.includes('.'))) {
          triggered = true
          break
        }
      }
    }
    if (triggered) {
      found.push({ type: platform.type, platform: platform.keys[0] })
    }
  }

  // Generic intent patterns to move off-platform
  const offPlatformIntent = /let'?s\s*(?:talk|chat|communicate|message|discuss)\s*(?:elsewhere|outside|on WhatsApp|on Telegram|on Instagram|via WhatsApp)/i
  if (offPlatformIntent.test(content)) {
    found.push({ type: VIOLATION.OFF_PLATFORM_TRANSACTION, reason: 'explicit_off_platform_intent' })
  }

  return found.length > 0 ? found : null
}

// ------------------------------------------------------------------
// Detector: Payment information
// ------------------------------------------------------------------

// Tanzania mobile money operators
const MOBILE_MONEY_KEYWORDS = [
  'mpesa', 'm-pesa', 'm pesa', 'tigopesa', 'tigopesa', 'tpesa',
  'airtel money', 'halopesa', 'hala pesaf', 'nmb', 'crdb mobile',
  'mwalimu mobile', 'bonga', 'epesa',
]

// Payment platform patterns
const PAYMENT_PLATFORM_PATTERNS = [
  /paypal\.me/i,
  /paypal\.com/i,
  /stripe\.com/i,
  /flutterwave\.com/i,
  /payoneer\.com/i,
  /westernunion/i,
  /moneygram/i,
  /wise\.com/i,
  /skrill/i,
  /banktransfer/i,
]

function detectPaymentInformation(content) {
  if (!content || typeof content !== 'string') return null
  const found = []
  const lower = content.toLowerCase()

  // Bank account number patterns: long digit sequences (10-20 digits)
  // that are NOT valid phone numbers and look like account numbers
  const longDigitSeq = content.match(/\b\d{10,20}\b/g)
  if (longDigitSeq) {
    for (const seq of longDigitSeq) {
      // Skip if it's a phone number (we detect those separately)
      const phoneCheck = detectPhoneNumber(seq)
      if (phoneCheck) continue

      // If preceded by "account" or "acc" keywords → bank account
      const beforeIdx = Math.max(0, content.indexOf(seq) - 30)
      const context = content.substring(beforeIdx, beforeIdx + 30).toLowerCase()
      if (context.includes('account') || context.includes('acc') || context.includes('bank')) {
        found.push({ type: VIOLATION.BANK_ACCOUNT, value: seq })
      } else {
        // Long digit sequence with payment keyword nearby → payment account
        if (lower.includes('send money') || lower.includes('pay') || lower.includes('transfer')) {
          found.push({ type: VIOLATION.PAYMENT_ACCOUNT, value: seq })
        }
      }
    }
  }

  // Mobile money platform mentions + instruction to send money
  if (lower.includes('send money') || lower.includes('pay me') || lower.includes('lipa') || lower.includes('transfer to my')) {
    for (const kw of MOBILE_MONEY_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) {
        found.push({ type: VIOLATION.MOBILE_MONEY, keyword: kw })
        break
      }
    }
  }

  // Payment platform URLs
  for (const pattern of PAYMENT_PLATFORM_PATTERNS) {
    if (pattern.test(content)) {
      found.push({ type: VIOLATION.PAYMENT_ACCOUNT, pattern: pattern.source })
    }
  }

  // Generic "send money to my account/number" with digit sequences
  const sendMoneyRe = /send\s*(?:the\s*)?(?:money|payment|cash)\s*(?:to|on)\s*(?:my\s*)?(?:account|number|wallet|card)/i
  if (sendMoneyRe.test(content)) {
    const hasDigits = /\d{6,}/.test(content)
    if (hasDigits) {
      found.push({ type: VIOLATION.PAYMENT_ACCOUNT, reason: 'send_money_instruction' })
    }
  }

  return found.length > 0 ? found : null
}

// ------------------------------------------------------------------
// Detector: Cryptocurrency wallets and NFT marketplaces
// ------------------------------------------------------------------

// Bitcoin addresses: legacy (1/3 prefix, 25-34 chars) or bech32 (bc1...)
const BTC_ADDRESS_REGEX = /\b(?:[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})\b/gi

// Ethereum addresses: 0x followed by 40 hex characters
const ETH_ADDRESS_REGEX = /\b0x[a-fA-F0-9]{40}\b/gi

// NFT / crypto marketplace URLs
const NFT_PLATFORM_PATTERNS = [
  /opensea\.io/i,
  /opensea\.com/i,
  /opensea\.site/i,
  /opensea\.finance/i,
  /rarible\.com/i,
  /rarible\.io/i,
  /foundation\.app/i,
  /superrare\.co/i,
  /nft\.com/i,
  /nft\.art/i,
  /magic\.eda\.gg/i,
  /looksrare\.finance/i,
  /x2y2\.io/i,
  /crypto\.com\/nft/i,
  /binance\.com\/en\/nft/i,
  /discord\.com\/invite/i,
  /discord\.gg/i,
]

// NFT platform keywords (for intent-based detection without URLs)
const NFT_PLATFORM_KEYWORDS = [
  'opensea', 'rarible', 'foundation', 'superrare', 'nft.com',
  'looksrare', 'x2y2', 'opensea', 'nft marketplace',
]

// Cash App $tag pattern (e.g., $cashtag, $JohnDoe123)
const CASHTAG_REGEX = /\$\s*([a-zA-Z][a-zA-Z0-9_]{3,19})\b/gi

// Venmo / Cash App / Zelle payment handles
const ALTERNATIVE_PAYMENT_PATTERNS = [
  /venmo\.com/i,
  /cash\.app/i,
  /zellepay\.com/i,
  /zelle\.io/i,
  /cashapp/i,
]

function detectCryptoWallet(content) {
  if (!content || typeof content !== 'string') return null
  const found = []

  // Bitcoin addresses
  const btcMatches = content.match(BTC_ADDRESS_REGEX)
  if (btcMatches) {
    for (const match of btcMatches) {
      found.push({ type: VIOLATION.CRYPTO_WALLET, value: match, crypto_type: 'bitcoin' })
    }
  }

  // Ethereum addresses
  const ethMatches = content.match(ETH_ADDRESS_REGEX)
  if (ethMatches) {
    for (const match of ethMatches) {
      found.push({ type: VIOLATION.CRYPTO_WALLET, value: match, crypto_type: 'ethereum' })
    }
  }

  return found.length > 0 ? found : null
}

function detectNftMarketplaces(content) {
  if (!content || typeof content !== 'string') return null
  const found = []
  const lower = content.toLowerCase()

  // URL-based detection
  for (const pattern of NFT_PLATFORM_PATTERNS) {
    if (pattern.test(content)) {
      found.push({ type: VIOLATION.NFT_MARKETPLACE, pattern: pattern.source })
    }
  }

  // Keyword-based detection (only if platform name is shared with off-platform intent)
  const offPlatformIntentRe = /check\s*(?:my|our)|visit|profile\s*(?:on|at)|on\s+(opensea|rarible|foundation|superrare|looksrare|x2y2)|via|shop\s*(?:on|at)/i
  if (offPlatformIntentRe.test(content)) {
    for (const kw of NFT_PLATFORM_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) {
        found.push({ type: VIOLATION.NFT_MARKETPLACE, keyword: kw })
      }
    }
  }

  return found.length > 0 ? found : null
}

function detectAlternativePayment(content) {
  if (!content || typeof content !== 'string') return null
  const found = []

  // URL/handle patterns
  for (const pattern of ALTERNATIVE_PAYMENT_PATTERNS) {
    if (pattern.test(content)) {
      found.push({ type: VIOLATION.PAYMENT_ACCOUNT, pattern: pattern.source })
    }
  }

  // Cash App $tag pattern
  const cashtagMatches = content.match(CASHTAG_REGEX)
  if (cashtagMatches) {
    // Skip if it looks like a price (e.g., "$15000" — no letters after $)
    for (const match of cashtagMatches) {
      const tag = match.replace(/\s+/g, '').slice(1) // remove leading $
      if (!/^[a-zA-Z][a-zA-Z0-9_]{3,19}$/.test(tag)) continue
      found.push({ type: VIOLATION.PAYMENT_ACCOUNT, cashtag: match })
    }
  }

  // Venmo handle: @username near Venmo keyword
  const venmoRe = /@([a-zA-Z0-9_.]{3,30})/.test(content)
  if (venmoRe && /venmo/i.test(content)) {
    found.push({ type: VIOLATION.PAYMENT_ACCOUNT, platform: 'venmo' })
  }

  return found.length > 0 ? found : null
}
// ------------------------------------------------------------------
function detectSpam(content, settings = {}) {
  if (!content || typeof content !== 'string') return null
  const found = []

  // Maximum message length
  const maxLen = parseInt(settings.max_message_length || '2000', 10)
  if (content.length > maxLen) {
    found.push({ type: VIOLATION.SPAM, reason: 'message_too_long', severity: SEVERITY.LOW })
  }

  // Excessive repetition of characters (e.g., "AAAAAA")
  if (/(.)\1{9,}/.test(content)) {
    found.push({ type: VIOLATION.SPAM, reason: 'excessive_repetition', severity: SEVERITY.LOW })
  }

  // Excessive uppercase (shouting) - only flag if > 80% caps and length > 10
  if (content.length > 10) {
    const letters = content.replace(/[^a-zA-Z]/g, '')
    if (letters.length > 10) {
      const caps = letters.split('').filter((c) => c === c.toUpperCase()).length
      if (caps / letters.length > 0.8) {
        found.push({ type: VIOLATION.SPAM, reason: 'excessive_caps', severity: SEVERITY.LOW })
      }
    }
  }

  return found.length > 0 ? found : null
}

// ------------------------------------------------------------------
// Main moderation function
// ------------------------------------------------------------------

/**
 * Moderate a message before it is saved and delivered.
 *
 * @param {string} content    - Message text to moderate.
 * @param {object} settings   - Moderation settings (from DB or defaults).
 * @returns {object}          - { safe: true } or { safe: false, violation_type, severity, userMessage, detection_method }
 */
function moderateMessage(content, settings = {}) {
  if (!content || typeof content !== 'string') {
    return { safe: false, violation_type: VIOLATION.SPAM, severity: SEVERITY.LOW, userMessage: USER_MESSAGES[VIOLATION.SPAM], detection_method: 'empty_content' }
  }

  // Always check basic length (even if protection settings are off)
  if (content.length > 10000) {
    return { safe: false, violation_type: VIOLATION.SPAM, severity: SEVERITY.LOW, userMessage: USER_MESSAGES[VIOLATION.SPAM], detection_method: 'excessive_length' }
  }

  const s = { ...getDefaultSettings(), ...settings }

  // --- PHONE NUMBER detection ---
  if (s.contact_protection_enabled === '1' || s.contact_protection_enabled === 1 || s.contact_protection_enabled === true) {
    const phones = detectPhoneNumber(content)
    if (phones && phones.length > 0) {
      return {
        safe: false,
        violation_type: VIOLATION.PHONE_NUMBER,
        severity: SEVERITY.MEDIUM,
        userMessage: USER_MESSAGES[VIOLATION.PHONE_NUMBER],
        detection_method: phones[0].method || 'regex',
        detected: phones[0].normalized,
      }
    }
  }

  // --- EMAIL detection ---
  if (s.contact_protection_enabled === '1' || s.contact_protection_enabled === 1 || s.contact_protection_enabled === true) {
    const emails = detectEmail(content)
    if (emails && emails.length > 0) {
      return {
        safe: false,
        violation_type: VIOLATION.EMAIL,
        severity: SEVERITY.MEDIUM,
        userMessage: USER_MESSAGES[VIOLATION.EMAIL],
        detection_method: 'email_regex',
        detected: typeof emails[0] === 'string' ? emails[0] : emails[0].decoded,
      }
    }
  }

  // --- SOCIAL MEDIA detection ---
  if (s.contact_protection_enabled === '1' || s.contact_protection_enabled === 1 || s.contact_protection_enabled === true) {
    const social = detectSocialMedia(content)
    if (social && social.length > 0) {
      // Determine which violation type to report (first match wins)
      const v = social[0].type
      return {
        safe: false,
        violation_type: v,
        severity: v === VIOLATION.OFF_PLATFORM_TRANSACTION ? SEVERITY.HIGH : SEVERITY.MEDIUM,
        userMessage: USER_MESSAGES[v],
        detection_method: 'social_media',
        detected: social[0].platform || social[0].reason,
      }
    }
  }

  // --- EXTERNAL URL detection ---
  if (s.url_protection_enabled === '1' || s.url_protection_enabled === 1 || s.url_protection_enabled === true) {
    const urls = detectExternalUrl(content, s)
    if (urls && urls.length > 0) {
      return {
        safe: false,
        violation_type: VIOLATION.EXTERNAL_URL,
        severity: SEVERITY.MEDIUM,
        userMessage: USER_MESSAGES[VIOLATION.EXTERNAL_URL],
        detection_method: 'url_pattern',
        detected: urls[0].host,
      }
    }
  }

   // --- CRYPTO WALLET detection ---
   const crypto = detectCryptoWallet(content)
   if (crypto && crypto.length > 0) {
     return {
       safe: false,
       violation_type: VIOLATION.CRYPTO_WALLET,
       severity: SEVERITY.HIGH,
       userMessage: USER_MESSAGES[VIOLATION.CRYPTO_WALLET],
       detection_method: 'crypto_wallet',
       detected: crypto[0].value,
     }
   }

   // --- NFT marketplace detection ---
   const nft = detectNftMarketplaces(content)
   if (nft && nft.length > 0) {
     return {
       safe: false,
       violation_type: VIOLATION.NFT_MARKETPLACE,
       severity: SEVERITY.MEDIUM,
       userMessage: USER_MESSAGES[VIOLATION.NFT_MARKETPLACE],
       detection_method: 'nft_platform',
       detected: nft[0].pattern,
     }
   }

   // --- PAYMENT INFORMATION detection ---
   if (s.payment_protection_enabled === '1' || s.payment_protection_enabled === 1 || s.payment_protection_enabled === true) {
     const payments = detectPaymentInformation(content)
     if (payments && payments.length > 0) {
       const v = payments[0].type
       return {
         safe: false,
         violation_type: v,
         severity: v === VIOLATION.BANK_ACCOUNT ? SEVERITY.HIGH : SEVERITY.MEDIUM,
         userMessage: USER_MESSAGES[v],
         detection_method: 'payment_pattern',
         detected: payments[0].value || payments[0].keyword || payments[0].pattern || payments[0].reason,
       }
     }

     // --- Alternative payment platform detection (Venmo, Cash App, Zelle) ---
     const altPayments = detectAlternativePayment(content)
     if (altPayments && altPayments.length > 0) {
       return {
         safe: false,
         violation_type: VIOLATION.PAYMENT_ACCOUNT,
         severity: SEVERITY.MEDIUM,
         userMessage: USER_MESSAGES[VIOLATION.PAYMENT_ACCOUNT],
         detection_method: 'alternative_payment',
         detected: altPayments[0].pattern,
       }
     }
   }

  // --- SPAM detection (always on) ---
  const spam = detectSpam(content, s)
  if (spam && spam.length > 0) {
    const v = spam[0].type
    return {
      safe: false,
      violation_type: v,
      severity: spam[0].severity || SEVERITY.LOW,
      userMessage: USER_MESSAGES[v],
      detection_method: spam[0].reason,
      detected: '',
    }
  }

  return { safe: true }
}

// ------------------------------------------------------------------
// User stats / restriction management
// ------------------------------------------------------------------

/**
 * Check whether a user is currently restricted from sending messages.
 */
async function checkRestriction(pool, userId) {
  // Check chat_restrictions table
  const [rows] = await pool.query(
    `SELECT id, restricted_until, is_permanent, reason
       FROM chat_restrictions
      WHERE user_id = ? AND (is_permanent = 1 OR restricted_until > NOW())
      ORDER BY created_at DESC LIMIT 1`,
    [userId]
  )

  if (rows.length > 0) {
    return {
      restricted: true,
      permanent: rows[0].is_permanent === 1,
      restricted_until: rows[0].restricted_until,
      reason: rows[0].reason,
    }
  }

  // Also check chat_user_stats for moderation_status
  const [stats] = await pool.query(
    'SELECT moderation_status, restricted_until FROM chat_user_stats WHERE user_id = ?',
    [userId]
  )

  if (stats.length > 0 && stats[0].moderation_status === 'restricted' && stats[0].restricted_until && new Date(stats[0].restricted_until) > new Date()) {
    return {
      restricted: true,
      permanent: false,
      restricted_until: stats[0].restricted_until,
      reason: 'Automatic restriction',
    }
  }

  return { restricted: false }
}

/**
 * Record a moderation violation: inserts an event, updates user stats,
 * and applies warnings or restrictions as thresholds are crossed.
 *
 * @param {object} pool
 * @param {object} params - { userId, conversationId, violationType, severity, detectionMethod, originalMessage, messageId }
 * @returns {Promise<object>} - { actionTaken, userMessage, warningCount }
 */
async function recordViolation(pool, params) {
  const { userId, conversationId = null, violationType, severity = SEVERITY.MEDIUM, detectionMethod = 'auto', originalMessage = '', messageId = null } = params

  const settings = await loadSettings(pool)
  const warningThreshold = parseInt(settings.warning_threshold || '2', 10)
  const restrictionThreshold = parseInt(settings.restriction_threshold || '5', 10)
  const restrictionHours = parseInt(settings.restriction_duration_hours || '24', 10)

  // Insert moderation event
  const [result] = await pool.query(
    `INSERT INTO chat_moderation_events
       (message_id, user_id, conversation_id, violation_type, severity, detection_method, action_taken, original_message)
     VALUES (?, ?, ?, ?, ?, ?, 'blocked', ?)`,
    [messageId, userId, conversationId, violationType, severity, detectionMethod, originalMessage]
  )

  // Update user stats
  const [existing] = await pool.query(
    'SELECT warning_count, restriction_count, moderation_status FROM chat_user_stats WHERE user_id = ?',
    [userId]
  )

  let warningCount
  let actionTaken = 'blocked'
  let userMessage = USER_MESSAGES[violationType]

  if (existing.length === 0) {
    warningCount = 1
    await pool.query(
      `INSERT INTO chat_user_stats
         (user_id, warning_count, restriction_count, last_violation_at, moderation_status)
       VALUES (?, 1, 0, NOW(), 'warned')`,
      [userId]
    )
  } else {
    warningCount = existing[0].warning_count + 1
    await pool.query(
      `UPDATE chat_user_stats
        SET warning_count = ?,
            last_violation_at = NOW(),
            moderation_status = CASE
              WHEN ? >= ? THEN 'restricted'
              WHEN ? >= ? THEN 'warned'
              ELSE moderation_status
            END
      WHERE user_id = ?`,
      [
        warningCount,
        warningCount, restrictionThreshold,
        warningCount, warningThreshold,
        userId,
      ]
    )
  }

  // Apply restriction when threshold is crossed
  if (warningCount >= restrictionThreshold) {
    actionTaken = 'restricted'
    const restrictedUntil = new Date(Date.now() + restrictionHours * 3600000)
    await pool.query(
      `INSERT INTO chat_restrictions (user_id, reason, restricted_until, is_permanent)
       VALUES (?, ?, ?, 0)`,
      [userId, `Automatic restriction: ${warningCount} violations`, restrictedUntil]
    )
    await pool.query(
      'UPDATE chat_user_stats SET moderation_status = ?, restricted_until = ? WHERE user_id = ?',
      ['restricted', restrictedUntil, userId]
    )
    userMessage = 'Your messaging privileges have been temporarily suspended due to repeated policy violations. Please contact support if you believe this is an error.'
  } else if (warningCount >= warningThreshold) {
    actionTaken = 'warned'
  }

  return {
    actionTaken,
    userMessage,
    violationType,
    warningCount,
    severity,
    eventId: result.insertId,
  }
}

// ------------------------------------------------------------------
// Rate limiting check (in-memory, per-user)
// ------------------------------------------------------------------
const rateLimitStore = new Map()

/**
 * Check if a user has exceeded the message rate limit.
 * @returns {object} { allowed: boolean, retryAfter: number }
 */
function checkRateLimit(userId, settings = {}) {
  const maxPerMinute = parseInt(settings.messages_per_minute || '30', 10)
  const key = `rl:${userId}`
  const now = Date.now()
  const windowMs = 60_000

  const record = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs }
  if (now > record.resetTime) {
    record.count = 0
    record.resetTime = now + windowMs
  }
  record.count++
  rateLimitStore.set(key, record)

  if (record.count > maxPerMinute) {
    return { allowed: false, retryAfter: Math.ceil((record.resetTime - now) / 1000) }
  }
  return { allowed: true, retryAfter: 0 }
}

// ------------------------------------------------------------------
// Message-level moderation flow
// ------------------------------------------------------------------

/**
 * Full moderation pipeline for an outgoing message.
 *
 * Checks restrictions → rate limit → content moderation.
 * If the message is blocked, a moderation event is recorded and
 * user stats are updated. If safe, the message is allowed to proceed.
 *
 * @param {object} pool      - MySQL connection pool
 * @param {object} params    - { userId, conversationId, content, messageType }
 * @returns {Promise<object>} - { allowed: boolean, violation_type, severity, userMessage, detection_method }
 */
async function moderateAndRecord(pool, params) {
  const { userId, conversationId, content, messageType = 'text' } = params
  const settings = await loadSettings(pool)

  // 1. Check restriction
  const restriction = await checkRestriction(pool, userId)
  if (restriction.restricted) {
    return {
      allowed: false,
      violation_type: VIOLATION.SPAM,
      severity: SEVERITY.HIGH,
      userMessage: restriction.permanent
        ? 'Your messaging privileges have been suspended. Please contact support.'
        : `Your messaging privileges are temporarily suspended until ${restriction.restricted_until}.`,
      detection_method: 'restriction_active',
      restricted: true,
    }
  }

  // 2. Skip rate-limit/content checks for system messages
  if (messageType === 'system' || messageType === 'order_update' || messageType === 'delivery_update') {
    return { allowed: true }
  }

  // 3. Rate limit check
  const rl = checkRateLimit(userId, settings)
  if (!rl.allowed) {
    return {
      allowed: false,
      violation_type: VIOLATION.SPAM,
      severity: SEVERITY.LOW,
      userMessage: `Rate limit exceeded. Please wait ${rl.retryAfter} seconds before sending another message.`,
      detection_method: 'rate_limit',
    }
  }

  // 4. Content moderation
  const result = moderateMessage(content, settings)

  if (!result.safe) {
    // Record the moderation event and update user stats
    await recordViolation(pool, {
      userId,
      conversationId,
      violationType: result.violation_type,
      severity: result.severity,
      detectionMethod: result.detection_method,
      originalMessage: content,
    })
    return {
      allowed: false,
      violation_type: result.violation_type,
      severity: result.severity,
      userMessage: result.userMessage,
      detection_method: result.detection_method,
    }
  }

  return { allowed: true }
}

module.exports = {
  VIOLATION,
  SEVERITY,
  USER_MESSAGES,
  detectPhoneNumber,
  detectEmail,
  detectExternalUrl,
  detectSocialMedia,
  detectPaymentInformation,
  detectCryptoWallet,
  detectNftMarketplaces,
  detectAlternativePayment,
  detectSpam,
  moderateMessage,
  moderateAndRecord,
  checkRestriction,
  recordViolation,
  checkRateLimit,
  loadSettings,
  getDefaultSettings,
}
