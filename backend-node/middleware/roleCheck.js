const { extractAuthUser } = require('./auth')

const ROLES = {
  SUPERADMIN: 'superadmin',
  LOGISTICS_COMPANY: 'logistics_company',
  TRANSPORT_MANAGER: 'transport_manager',
  WAREHOUSE_MANAGER: 'warehouse_manager',
  WAREHOUSE: 'warehouse',
  VENDOR_ADMIN: 'vendor_admin',
  SELLER: 'seller',
  MARKETPLACE_ADMIN: 'marketplace_admin',
  CUSTOMER_SUPPORT: 'customer_support',
  FINANCE_ADMIN: 'finance_admin',
}

const ADMIN_ROLES = [
  ROLES.SUPERADMIN,
  ROLES.MARKETPLACE_ADMIN,
  ROLES.TRANSPORT_MANAGER,
  ROLES.FINANCE_ADMIN,
  ROLES.CUSTOMER_SUPPORT,
  ROLES.VENDOR_ADMIN,
]

const LOGISTICS_ROLES = [
  ROLES.SUPERADMIN,
  ROLES.LOGISTICS_COMPANY,
  ROLES.TRANSPORT_MANAGER,
]

const VENDOR_ROLES = [
  ROLES.SUPERADMIN,
  ROLES.VENDOR_ADMIN,
  ROLES.SELLER,
]

const WAREHOUSE_ROLES = [
  ROLES.SUPERADMIN,
  ROLES.WAREHOUSE,
  ROLES.WAREHOUSE_MANAGER,
]

function requireRole(...allowedRoles) {
  const set = new Set(allowedRoles)
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }
    if (!set.has(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions' })
    }
    next()
  }
}

function requireSuperAdmin(req, res, next) {
  const user = req.user || extractAuthUser(req)
  if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' })
  }
  if (user.role !== ROLES.SUPERADMIN) {
    return res.status(403).json({ success: false, message: 'Forbidden: superadmin access required' })
  }
  req.user = user
  next()
}

function requireLogisticsRole(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' })
  }
  if (!LOGISTICS_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden: logistics access required' })
  }
  next()
}

function requireAdminRole(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' })
  }
  if (!ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden: admin access required' })
  }
  next()
}

function requireVendorRole(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' })
  }
  if (!VENDOR_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden: vendor access required' })
  }
  next()
}

function requireWarehouseRole(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' })
  }
  if (!WAREHOUSE_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden: warehouse access required' })
  }
  next()
}

module.exports = {
  ROLES,
  ADMIN_ROLES,
  LOGISTICS_ROLES,
  VENDOR_ROLES,
  WAREHOUSE_ROLES,
  requireRole,
  requireSuperAdmin,
  requireLogisticsRole,
  requireAdminRole,
  requireVendorRole,
  requireWarehouseRole,
}
