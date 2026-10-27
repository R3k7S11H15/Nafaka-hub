const express = require('express')
const { csrfProtection } = require('../middleware/csrf')
const { requireSuperAdmin } = require('../middleware/roleCheck')

module.exports = (pool) => {
  const router = express.Router()

  router.get('/health', async (req, res) => {
    res.json({ success: true, message: 'finance routes ok' })
  })

  router.get('/revenue-summary', requireSuperAdmin, async (req, res, next) => {
    try {
      const { start_date, end_date } = req.query
      const start = start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
      const end = end_date || new Date().toISOString().split('T')[0]

      const [[total]] = await pool.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM revenue_tracking WHERE recorded_date BETWEEN ? AND ?',
        [start, end]
      )
      const [byType] = await pool.query(
        `SELECT revenue_type, COALESCE(SUM(amount), 0) as total, COUNT(*) as transactions
         FROM revenue_tracking WHERE recorded_date BETWEEN ? AND ? GROUP BY revenue_type ORDER BY total DESC`,
        [start, end]
      )
      const [daily] = await pool.query(
        `SELECT recorded_date as date, COALESCE(SUM(amount), 0) as total
         FROM revenue_tracking WHERE recorded_date BETWEEN ? AND ? GROUP BY recorded_date ORDER BY recorded_date`,
        [start, end]
      )

      res.json({ success: true, period: { start, end }, grand_total: total.total, by_type: byType, daily })
    } catch (err) { next(err) }
  })

  router.get('/transactions', requireSuperAdmin, async (req, res, next) => {
    try {
      const { limit = 50, offset = 0, type } = req.query
      const params = []
      let sql = `SELECT * FROM revenue_tracking WHERE 1=1`
      if (type) { sql += ' AND revenue_type = ?'; params.push(type) }
      sql += ' ORDER BY recorded_date DESC, created_at DESC LIMIT ? OFFSET ?'
      params.push(parseInt(limit) || 50, parseInt(offset) || 0)
      const [rows] = await pool.query(sql, params)
      const [[total]] = await pool.query(
        `SELECT COUNT(*) as total FROM revenue_tracking WHERE ${type ? 'revenue_type = ?' : '1=1'}`,
        type ? [type] : []
      )
      res.json({ success: true, transactions: rows, total: total.total, limit: parseInt(limit) || 50, offset: parseInt(offset) || 0 })
    } catch (err) { next(err) }
  })

  router.get('/payouts', requireSuperAdmin, async (req, res, next) => {
    try {
      const { limit = 50, offset = 0, status } = req.query
      const params = []
      let sql = `SELECT w.*, c.full_name, c.email FROM withdrawals w JOIN customers c ON w.customer_id = c.id WHERE 1=1`
      if (status) { sql += ' AND w.status = ?'; params.push(status) }
      sql += ' ORDER BY w.created_at DESC LIMIT ? OFFSET ?'
      params.push(parseInt(limit) || 50, parseInt(offset) || 0)
      const [rows] = await pool.query(sql, params)
      res.json({ success: true, payouts: rows })
    } catch (err) { next(err) }
  })

  router.post('/payouts/:id/approve', requireSuperAdmin, csrfProtection, async (req, res, next) => {
    try {
      const { notes, amount } = req.body
      const [existing] = await pool.query('SELECT * FROM withdrawals WHERE id = ?', [req.params.id])
      if (existing.length === 0) return res.json({ success: false, message: 'Payout not found' })
      await pool.query('UPDATE withdrawals SET status = ?, notes = ?, processed_at = NOW() WHERE id = ?',
        ['approved', notes || null, req.params.id])
      await pool.query(
        `INSERT INTO revenue_tracking (revenue_type, reference_id, reference_type, amount, customer_id, description, recorded_date)
         VALUES ('payout', ?, 'withdrawal', ?, ?, CURDATE())`,
        [req.params.id, existing[0].amount, existing[0].customer_id, `Payout approved: ${existing[0].id}`]
      )
      res.json({ success: true, message: 'Payout approved' })
    } catch (err) { next(err) }
  })

  router.post('/payouts/:id/reject', requireSuperAdmin, csrfProtection, async (req, res, next) => {
    try {
      const { notes } = req.body
      await pool.query('UPDATE withdrawals SET status = ?, notes = ?, processed_at = NOW() WHERE id = ?',
        ['rejected', notes || null, req.params.id])
      res.json({ success: true, message: 'Payout rejected' })
    } catch (err) { next(err) }
  })

  router.get('/tax-summary', requireSuperAdmin, async (req, res, next) => {
    try {
      const { start_date, end_date } = req.query
      const start = start_date || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
      const end = end_date || new Date().toISOString().split('T')[0]

      const [taxRecords] = await pool.query(
        `SELECT revenue_type, COALESCE(SUM(amount), 0) as total, COUNT(*) as transactions
         FROM revenue_tracking WHERE recorded_date BETWEEN ? AND ?
         GROUP BY revenue_type ORDER BY total DESC`,
        [start, end]
      )
      const [[netRevenue]] = await pool.query(
        'SELECT COALESCE(SUM(amount), 0) as net FROM revenue_tracking WHERE recorded_date BETWEEN ? AND ?',
        [start, end]
      )

      res.json({
        success: true,
        period: { start, end },
        gross_revenue: netRevenue.net,
        tax_breakdown: taxRecords,
      })
    } catch (err) { next(err) }
  })

  const parseRange = (req) => {
    const { start_date, end_date } = req.query;
    const start = start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const end = end_date || new Date().toISOString().split('T')[0];
    return { start, end };
  };

  const buildDateSeries = (start, end) => {
    const dates = [];
    const d = new Date(start + 'T00:00:00');
    const last = new Date(end + 'T00:00:00');
    while (d <= last) {
      dates.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() + 1);
    }
    return dates;
  };

  router.get('/overview', requireSuperAdmin, async (req, res, next) => {
    try {
      const { start, end } = parseRange(req);
      const [[revenue]] = await pool.query(
        'SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM revenue_tracking WHERE recorded_date BETWEEN ? AND ?',
        [start, end]
      );
      const [[gmv]] = await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count FROM orders
         WHERE status NOT IN ('draft', 'cancelled', 'refunded') AND DATE(created_at) BETWEEN ? AND ?`,
        [start, end]
      );
      const [[escrow]] = await pool.query(
        `SELECT COALESCE(SUM(CASE WHEN status = 'held' THEN amount ELSE 0 END), 0) as held,
                COALESCE(SUM(CASE WHEN status = 'released' THEN amount ELSE 0 END), 0) as released,
                COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0) as refunded,
                COALESCE(SUM(escrow_fee), 0) as fees, COUNT(*) as count FROM escrow_transactions`
      );
      const [[payouts]] = await pool.query(
        `SELECT COALESCE(SUM(CASE WHEN status IN ('pending', 'processing') THEN amount ELSE 0 END), 0) as pending,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed,
                COUNT(*) as count FROM withdrawals`
      );
      const [[refunds]] = await pool.query(
        `SELECT COALESCE(SUM(CASE WHEN status IN ('pending', 'approved') THEN amount ELSE 0 END), 0) as pending,
                COALESCE(SUM(CASE WHEN status = 'processed' THEN amount ELSE 0 END), 0) as processed,
                COUNT(*) as count FROM refunds`
      );
      const [[payments]] = await pool.query(
        'SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM payment_transactions WHERE status = \'completed\''
      );
      const [[commissions]] = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM revenue_tracking
         WHERE revenue_type = 'commission' AND recorded_date BETWEEN ? AND ?`,
        [start, end]
      );
      const netRevenue = Number(revenue.total) - Number(refunds.processed);
      res.json({
        success: true,
        period: { start, end },
        total_revenue: revenue.total,
        revenue_count: revenue.count,
        gmv: gmv.total,
        order_count: gmv.count,
        commission_revenue: commissions.total,
        commission_count: commissions.count,
        escrow,
        payouts,
        refunds,
        payment_volume: payments.total,
        payment_count: payments.count,
        net_revenue: netRevenue,
      });
    } catch (err) { next(err); }
  });

  router.get('/revenue-trend', requireSuperAdmin, async (req, res, next) => {
    try {
      const days = parseInt(req.query.days) || 30;
      const end = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days + 1);
      const start = startDate.toISOString().split('T')[0];

      const [revenueRows] = await pool.query(
        `SELECT recorded_date as date, COALESCE(SUM(amount), 0) as total
         FROM revenue_tracking WHERE recorded_date BETWEEN ? AND ? GROUP BY recorded_date`,
        [start, end]
      );
      const [gmvRows] = await pool.query(
        `SELECT DATE(created_at) as date, COALESCE(SUM(total_amount), 0) as total, COUNT(*) as orders
         FROM orders WHERE status NOT IN ('draft', 'cancelled', 'refunded')
         AND DATE(created_at) BETWEEN ? AND ? GROUP BY DATE(created_at)`,
        [start, end]
      );
      const [commissionRows] = await pool.query(
        `SELECT recorded_date as date, COALESCE(SUM(amount), 0) as total
         FROM revenue_tracking WHERE revenue_type = 'commission' AND recorded_date BETWEEN ? AND ? GROUP BY recorded_date`,
        [start, end]
      );

      const revenueMap = {};
      revenueRows.forEach(r => { revenueMap[r.date] = Number(r.total); });
      const gmvMap = {};
      gmvRows.forEach(r => { gmvMap[r.date] = { total: Number(r.total), orders: Number(r.orders) }; });
      const commissionMap = {};
      commissionRows.forEach(r => { commissionMap[r.date] = Number(r.total); });

      const series = buildDateSeries(start, end).map(date => ({
        date,
        revenue: revenueMap[date] || 0,
        commission: commissionMap[date] || 0,
        gmv: gmvMap[date] ? gmvMap[date].total : 0,
        orders: gmvMap[date] ? gmvMap[date].orders : 0,
      }));

      res.json({ success: true, period: { start, end, days }, trend: series });
    } catch (err) { next(err); }
  });

  router.get('/revenue-by-type', requireSuperAdmin, async (req, res, next) => {
    try {
      const { start, end } = parseRange(req);
      const [rows] = await pool.query(
        `SELECT revenue_type as type, COALESCE(SUM(amount), 0) as total, COUNT(*) as transactions
         FROM revenue_tracking WHERE recorded_date BETWEEN ? AND ? GROUP BY revenue_type ORDER BY total DESC`,
        [start, end]
      );
      const [[grand]] = await pool.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM revenue_tracking WHERE recorded_date BETWEEN ? AND ?',
        [start, end]
      );
      const total = Number(grand.total) || 1;
      const enriched = rows.map(r => ({
        ...r,
        percentage: Number(((Number(r.total) / total) * 100).toFixed(1)),
      }));
      res.json({ success: true, period: { start, end }, sources: enriched, total: grand.total });
    } catch (err) { next(err); }
  });

  router.get('/commission-breakdown', requireSuperAdmin, async (req, res, next) => {
    try {
      const { start, end } = parseRange(req);
      const [byType] = await pool.query(
        `SELECT commission_type as type, COUNT(*) as transactions,
                COALESCE(SUM(commission_amount), 0) as total,
                COALESCE(AVG(commission_rate), 0) as avg_rate
         FROM platform_commissions WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY commission_type ORDER BY total DESC`,
        [start, end]
      );
      const [byStatus] = await pool.query(
        `SELECT status, COUNT(*) as transactions, COALESCE(SUM(commission_amount), 0) as total
         FROM platform_commissions WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY status`,
        [start, end]
      );
      const [bySeller] = await pool.query(
        `SELECT c.id as seller_id, c.full_name, c.business_name, COUNT(pc.id) as transactions,
                COALESCE(SUM(pc.commission_amount), 0) as total
         FROM platform_commissions pc JOIN customers c ON pc.seller_id = c.id
         WHERE DATE(pc.created_at) BETWEEN ? AND ? GROUP BY c.id ORDER BY total DESC LIMIT 10`,
        [start, end]
      );
      const [[platformTotal]] = await pool.query(
        'SELECT COUNT(*) as count, COALESCE(SUM(commission_amount), 0) as total FROM platform_commissions'
      );

      let sources = byType;
      if (platformTotal.count === 0) {
        const [fallback] = await pool.query(
          `SELECT COALESCE(reference_type, 'sale') as type, COUNT(*) as transactions,
                  COALESCE(SUM(amount), 0) as total, 0 as avg_rate
           FROM revenue_tracking WHERE revenue_type = 'commission'
           AND recorded_date BETWEEN ? AND ? GROUP BY reference_type ORDER BY total DESC`,
          [start, end]
        );
        sources = fallback;
      }
      res.json({
        success: true,
        period: { start, end },
        by_type: sources,
        by_status: byStatus,
        top_sellers: bySeller,
        total: platformTotal.total,
      });
    } catch (err) { next(err); }
  });

  router.get('/escrow-summary', requireSuperAdmin, async (req, res, next) => {
    try {
      const [byStatus] = await pool.query(
        `SELECT status, COUNT(*) as transactions, COALESCE(SUM(amount), 0) as total,
                COALESCE(SUM(escrow_fee), 0) as fees FROM escrow_transactions GROUP BY status`
      );
      const [monthly] = await pool.query(
        `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as transactions,
                COALESCE(SUM(amount), 0) as total, COALESCE(SUM(escrow_fee), 0) as fees
         FROM escrow_transactions GROUP BY month ORDER BY month DESC LIMIT 12`
      );
      const [[totals]] = await pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_volume,
                COALESCE(SUM(escrow_fee), 0) as total_fees FROM escrow_transactions`
      );
      res.json({ success: true, by_status: byStatus, monthly, totals });
    } catch (err) { next(err); }
  });

  router.get('/payout-summary', requireSuperAdmin, async (req, res, next) => {
    try {
      const [byStatus] = await pool.query(
        `SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM withdrawals GROUP BY status`
      );
      const [monthly] = await pool.query(
        `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count,
                COALESCE(SUM(amount), 0) as total FROM withdrawals GROUP BY month ORDER BY month DESC LIMIT 12`
      );
      const [[totals]] = await pool.query(
        'SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM withdrawals'
      );
      res.json({ success: true, by_status: byStatus, monthly, totals });
    } catch (err) { next(err); }
  });

  router.get('/refund-summary', requireSuperAdmin, async (req, res, next) => {
    try {
      const [byStatus] = await pool.query(
        `SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM refunds GROUP BY status`
      );
      const [monthly] = await pool.query(
        `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count,
                COALESCE(SUM(amount), 0) as total FROM refunds GROUP BY month ORDER BY month DESC LIMIT 12`
      );
      const [[totals]] = await pool.query(
        'SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM refunds'
      );
      res.json({ success: true, by_status: byStatus, monthly, totals });
    } catch (err) { next(err); }
  });

  router.get('/subscription-stats', requireSuperAdmin, async (req, res, next) => {
    try {
      const { start, end } = parseRange(req);
      const [monthly] = await pool.query(
        `SELECT recorded_date as date, COALESCE(SUM(amount), 0) as total, COUNT(*) as subscriptions
         FROM revenue_tracking WHERE revenue_type = 'subscription' AND recorded_date BETWEEN ? AND ?
         GROUP BY recorded_date ORDER BY recorded_date`,
        [start, end]
      );
      const [[totals]] = await pool.query(
        `SELECT COUNT(*) as total_subscriptions, COALESCE(SUM(amount), 0) as total_revenue
         FROM revenue_tracking WHERE revenue_type = 'subscription'`
      );
      const [topCustomers] = await pool.query(
        `SELECT c.id, c.full_name, c.business_name, COUNT(rt.id) as subscriptions,
                COALESCE(SUM(rt.amount), 0) as total_spent
         FROM revenue_tracking rt JOIN customers c ON rt.customer_id = c.id
         WHERE rt.revenue_type = 'subscription' GROUP BY c.id ORDER BY total_spent DESC LIMIT 10`
      );
      res.json({ success: true, period: { start, end }, monthly, totals, top_customers: topCustomers });
    } catch (err) { next(err); }
  });

  router.get('/payment-methods', requireSuperAdmin, async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT payment_method as method, COUNT(*) as transactions, COALESCE(SUM(amount), 0) as total
         FROM payment_transactions GROUP BY payment_method ORDER BY total DESC`
      );
      const [[grand]] = await pool.query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM payment_transactions"
      );
      const total = Number(grand.total) || 1;
      const enriched = rows.map(r => ({
        ...r,
        percentage: Number(((Number(r.total) / total) * 100).toFixed(1)),
      }));
      res.json({ success: true, methods: enriched, total: grand.total });
    } catch (err) { next(err); }
  });

  router.get('/top-sellers', requireSuperAdmin, async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const [rows] = await pool.query(
        `SELECT c.id as seller_id, c.full_name, c.business_name, COUNT(o.id) as orders,
                COALESCE(SUM(o.total_amount), 0) as gmv
         FROM orders o JOIN customers c ON o.seller_id = c.id
         WHERE o.status NOT IN ('draft', 'cancelled', 'refunded')
         GROUP BY c.id ORDER BY gmv DESC LIMIT ?`,
        [limit]
      );
      const [[grand]] = await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM orders
         WHERE status NOT IN ('draft', 'cancelled', 'refunded')`
      );
      res.json({ success: true, sellers: rows, total_gmv: grand.total });
    } catch (err) { next(err); }
  });

  router.get('/cash-flow', requireSuperAdmin, async (req, res, next) => {
    try {
      const months = parseInt(req.query.months) || 6;
      const [revenueRows] = await pool.query(
        `SELECT DATE_FORMAT(recorded_date, '%Y-%m') as month, COALESCE(SUM(amount), 0) as total
         FROM revenue_tracking GROUP BY month ORDER BY month DESC LIMIT ?`,
        [months]
      );
      const [paymentRows] = await pool.query(
        `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COALESCE(SUM(amount), 0) as total
         FROM payment_transactions WHERE status = 'completed' GROUP BY month ORDER BY month DESC LIMIT ?`,
        [months]
      );
      const [payoutRows] = await pool.query(
        `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COALESCE(SUM(amount), 0) as total
         FROM withdrawals WHERE status = 'completed' GROUP BY month ORDER BY month DESC LIMIT ?`,
        [months]
      );
      const [refundRows] = await pool.query(
        `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COALESCE(SUM(amount), 0) as total
         FROM refunds WHERE status = 'processed' GROUP BY month ORDER BY month DESC LIMIT ?`,
        [months]
      );

      const inflowMap = {};
      revenueRows.forEach(r => { inflowMap[r.month] = (inflowMap[r.month] || 0) + Number(r.total); });
      paymentRows.forEach(r => { inflowMap[r.month] = (inflowMap[r.month] || 0) + Number(r.total); });
      const outflowMap = {};
      payoutRows.forEach(r => { outflowMap[r.month] = (outflowMap[r.month] || 0) + Number(r.total); });
      refundRows.forEach(r => { outflowMap[r.month] = (outflowMap[r.month] || 0) + Number(r.total); });

      const monthSet = [...new Set([...Object.keys(inflowMap), ...Object.keys(outflowMap)])].sort();
      const series = monthSet.map(month => ({
        month,
        inflow: inflowMap[month] || 0,
        outflow: outflowMap[month] || 0,
        net: (inflowMap[month] || 0) - (outflowMap[month] || 0),
      }));
      res.json({ success: true, months, cash_flow: series });
    } catch (err) { next(err); }
  });

  router.get('/projections', requireSuperAdmin, async (req, res, next) => {
    try {
      const [last30] = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM revenue_tracking
         WHERE recorded_date >= CURDATE() - INTERVAL 30 DAY`
      );
      const [prev30] = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM revenue_tracking
         WHERE recorded_date BETWEEN CURDATE() - INTERVAL 60 DAY AND CURDATE() - INTERVAL 31 DAY`
      );
      const [orders30] = await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count FROM orders
         WHERE status NOT IN ('draft', 'cancelled', 'refunded')
         AND created_at >= CURDATE() - INTERVAL 30 DAY`
      );
      const [ordersPrev30] = await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count FROM orders
         WHERE status NOT IN ('draft', 'cancelled', 'refunded')
         AND created_at BETWEEN CURDATE() - INTERVAL 60 DAY AND CURDATE() - INTERVAL 31 DAY`
      );

      const avgDailyRevenue = Number(last30[0].total) / 30;
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysElapsed = now.getDate();
      const projectedMonthRevenue = avgDailyRevenue * daysInMonth;
      const revenueGrowth = Number(prev30[0].total) > 0
        ? (((Number(last30[0].total) - Number(prev30[0].total)) / Number(prev30[0].total)) * 100)
        : 0;
      const avgDailyGmv = Number(orders30[0].total) / 30;
      const projectedMonthGmv = avgDailyGmv * daysInMonth;
      const gmvGrowth = Number(ordersPrev30[0].total) > 0
        ? (((Number(orders30[0].total) - Number(ordersPrev30[0].total)) / Number(ordersPrev30[0].total)) * 100)
        : 0;

      res.json({
        success: true,
        projections: {
          avg_daily_revenue: avgDailyRevenue,
          projected_month_revenue: projectedMonthRevenue,
          revenue_growth_pct: Number(revenueGrowth.toFixed(1)),
          avg_daily_gmv: avgDailyGmv,
          projected_month_gmv: projectedMonthGmv,
          gmv_growth_pct: Number(gmvGrowth.toFixed(1)),
          days_in_month: daysInMonth,
          days_elapsed: daysElapsed,
          actual_revenue_30d: last30[0].total,
          actual_gmv_30d: orders30[0].total,
          actual_orders_30d: orders30[0].count,
        },
      });
    } catch (err) { next(err); }
  });

  return router
}
