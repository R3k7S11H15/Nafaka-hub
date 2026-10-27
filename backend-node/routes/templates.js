const express = require('express')
const { validateRequired, validateEmail, validatePhone, validateAmount, validatePositiveInt, sanitizeString } = require('../middleware/validation')

module.exports = (pool) => {
  const router = express.Router()
  const { requireAuth } = require('../middleware/auth')
  const { requireAdminRole } = require('../middleware/roleCheck')

  router.use(requireAuth)

  router.get('/email', requireAdminRole, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM email_templates ORDER BY template_key ASC')
      res.json({ success: true, templates: rows })
    } catch (err) { next(err) }
  })

  router.get('/email/:key', requireAdminRole, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM email_templates WHERE template_key = ?', [req.params.key])
      if (rows.length === 0) return res.json({ success: false, message: 'Template not found' })
      res.json({ success: true, template: rows[0] })
    } catch (err) { next(err) }
  })

  router.post('/email', requireAdminRole, async (req, res) => {
    try {
      const { template_key, subject, body_html, body_text, variables, is_active } = req.body
      if (!template_key || !subject) return res.json({ success: false, message: 'Template key and subject are required' })
      const [result] = await pool.query(
        `INSERT INTO email_templates (template_key, subject, body_html, body_text, variables, is_active, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE subject = VALUES(subject), body_html = VALUES(body_html), body_text = VALUES(body_text), variables = VALUES(variables), is_active = VALUES(is_active), updated_by = VALUES(updated_by)`,
        [template_key, subject, body_html || null, body_text || null, variables ? JSON.stringify(variables) : null, is_active !== false ? 1 : 0, req.user.customerId]
      )
      res.json({ success: true, template_id: result.insertId, message: 'Email template saved' })
    } catch (err) { next(err) }
  })

  router.put('/email/:key', requireAdminRole, async (req, res) => {
    try {
      const { subject, body_html, body_text, variables, is_active } = req.body
      const [result] = await pool.query(
        `UPDATE email_templates SET subject = ?, body_html = ?, body_text = ?, variables = ?, is_active = ?, updated_by = ? WHERE template_key = ?`,
        [subject, body_html || null, body_text || null, variables ? JSON.stringify(variables) : null, is_active !== false ? 1 : 0, req.user.customerId, req.params.key]
      )
      res.json({ success: true, message: 'Email template updated' })
    } catch (err) { next(err) }
  })

  router.get('/sms', requireAdminRole, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM sms_templates ORDER BY template_key ASC')
      res.json({ success: true, templates: rows })
    } catch (err) { next(err) }
  })

  router.get('/sms/:key', requireAdminRole, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM sms_templates WHERE template_key = ?', [req.params.key])
      if (rows.length === 0) return res.json({ success: false, message: 'Template not found' })
      res.json({ success: true, template: rows[0] })
    } catch (err) { next(err) }
  })

  router.post('/sms', requireAdminRole, async (req, res) => {
    try {
      const { template_key, name, body_text, variables, is_active } = req.body
      if (!template_key || !name || !body_text) return res.json({ success: false, message: 'Template key, name, and body are required' })
      const [result] = await pool.query(
        `INSERT INTO sms_templates (template_key, name, body_text, variables, is_active, updated_by)
         VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), body_text = VALUES(body_text), variables = VALUES(variables), is_active = VALUES(is_active), updated_by = VALUES(updated_by)`,
        [template_key, name, body_text, variables ? JSON.stringify(variables) : null, is_active !== false ? 1 : 0, req.user.customerId]
      )
      res.json({ success: true, template_id: result.insertId, message: 'SMS template saved' })
    } catch (err) { next(err) }
  })

  router.put('/sms/:key', requireAdminRole, async (req, res) => {
    try {
      const { name, body_text, variables, is_active } = req.body
      const [result] = await pool.query(
        `UPDATE sms_templates SET name = ?, body_text = ?, variables = ?, is_active = ?, updated_by = ? WHERE template_key = ?`,
        [name, body_text, variables ? JSON.stringify(variables) : null, is_active !== false ? 1 : 0, req.user.customerId, req.params.key]
      )
      res.json({ success: true, message: 'SMS template updated' })
    } catch (err) { next(err) }
  })

  router.delete('/sms/:key', requireAdminRole, async (req, res) => {
    try {
      await pool.query('DELETE FROM sms_templates WHERE template_key = ?', [req.params.key])
      res.json({ success: true, message: 'SMS template deleted' })
    } catch (err) { next(err) }
  })

  return router
}