export const ROLES = {
  SUPERADMIN: 'superadmin',
  MARKETPLACE_ADMIN: 'marketplace_admin',
  VENDOR_ADMIN: 'vendor_admin',
  WAREHOUSE_MANAGER: 'warehouse_manager',
  TRANSPORT_MANAGER: 'transport_manager',
  CUSTOMER_SUPPORT: 'customer_support',
  FINANCE_ADMIN: 'finance_admin',
  SELLER: 'seller',
  CUSTOMER: 'customer',
  LOGISTICS_COMPANY: 'logistics_company',
  WAREHOUSE: 'warehouse',
}

export const ROLE_LIST = [
  {
    value: ROLES.SUPERADMIN,
    label: 'Super Admin',
    permissions: 'Full system access',
    icon: 'Shield',
  },
  {
    value: ROLES.MARKETPLACE_ADMIN,
    label: 'Marketplace Admin',
    permissions: 'Product & listing management',
    icon: 'Settings',
  },
  {
    value: ROLES.VENDOR_ADMIN,
    label: 'Vendor Admin',
    permissions: 'Vendor onboarding & verification',
    icon: 'Users',
  },
  {
    value: ROLES.WAREHOUSE_MANAGER,
    label: 'Warehouse Manager',
    permissions: 'Inventory & storage management',
    icon: 'Settings',
  },
  {
    value: ROLES.TRANSPORT_MANAGER,
    label: 'Transport Manager',
    permissions: 'Logistics & delivery coordination',
    icon: 'Activity',
  },
  {
    value: ROLES.CUSTOMER_SUPPORT,
    label: 'Customer Support',
    permissions: 'User support & ticket resolution',
    icon: 'UserCheck',
  },
  {
    value: ROLES.FINANCE_ADMIN,
    label: 'Finance Admin',
    permissions: 'Transactions & financial reports',
    icon: 'Shield',
  },
  {
    value: ROLES.SELLER,
    label: 'Verified Seller',
    permissions: 'Sell products on marketplace',
    icon: 'Store',
  },
  {
    value: ROLES.CUSTOMER,
    label: 'Customer',
    permissions: 'Buy products on marketplace',
    icon: 'User',
  },
  {
    value: ROLES.LOGISTICS_COMPANY,
    label: 'Logistics Company',
    permissions: 'Provide delivery services',
    icon: 'Truck',
  },
  {
    value: ROLES.WAREHOUSE,
    label: 'Warehouse',
    permissions: 'Provide storage services',
    icon: 'Warehouse',
  },
]

export const ROLE_LABELS = {
  [ROLES.SUPERADMIN]: 'Super Admin',
  [ROLES.MARKETPLACE_ADMIN]: 'Marketplace Admin',
  [ROLES.VENDOR_ADMIN]: 'Vendor Admin',
  [ROLES.WAREHOUSE_MANAGER]: 'Warehouse Manager',
  [ROLES.TRANSPORT_MANAGER]: 'Transport Manager',
  [ROLES.CUSTOMER_SUPPORT]: 'Customer Support',
  [ROLES.FINANCE_ADMIN]: 'Finance Admin',
  [ROLES.SELLER]: 'Verified Seller',
  [ROLES.CUSTOMER]: 'Customer',
  [ROLES.LOGISTICS_COMPANY]: 'Logistics Company',
  [ROLES.WAREHOUSE]: 'Warehouse',
}

export const getRoleLabel = (role) => ROLE_LABELS[role] || 'Customer'

export const isAdminRole = (role) => [
  ROLES.SUPERADMIN,
  ROLES.MARKETPLACE_ADMIN,
  ROLES.VENDOR_ADMIN,
  ROLES.WAREHOUSE_MANAGER,
  ROLES.TRANSPORT_MANAGER,
  ROLES.CUSTOMER_SUPPORT,
  ROLES.FINANCE_ADMIN,
].includes(role)

export const isSuperAdmin = (role) => role === ROLES.SUPERADMIN
export const isMarketplaceAdmin = (role) => role === ROLES.MARKETPLACE_ADMIN
export const isFinanceAdmin = (role) => role === ROLES.FINANCE_ADMIN
export const isCustomerSupport = (role) => role === ROLES.CUSTOMER_SUPPORT
export const isWarehouseManager = (role) => role === ROLES.WAREHOUSE_MANAGER
export const isTransportManager = (role) => role === ROLES.TRANSPORT_MANAGER
export const isVendorAdmin = (role) => role === ROLES.VENDOR_ADMIN

export const ADMIN_MENU_CONFIG = {
  [ROLES.SUPERADMIN]: [
    { icon: 'BarChart3', label: 'Admin Dashboard', screen: 'AdminDashboard' },
    { icon: 'Package', label: 'Manage Products', screen: 'AdminProducts' },
    { icon: 'ShoppingCart', label: 'Manage Orders', screen: 'AdminOrders' },
    { icon: 'Users', label: 'Manage Users', screen: 'AdminUsers' },
    { icon: 'DollarSign', label: 'Finance', screen: 'AdminFinance' },
    { icon: 'MessageSquare', label: 'Support Tickets', screen: 'AdminSupport' },
    { icon: 'Truck', label: 'Logistics Applications', screen: 'AdminLogistics' },
    { icon: 'Warehouse', label: 'Warehouse Applications', screen: 'AdminWarehouse' },
  ],
  [ROLES.MARKETPLACE_ADMIN]: [
    { icon: 'BarChart3', label: 'Admin Dashboard', screen: 'AdminDashboard' },
    { icon: 'Package', label: 'Manage Products', screen: 'AdminProducts' },
    { icon: 'ShoppingCart', label: 'Manage Orders', screen: 'AdminOrders' },
    { icon: 'MessageSquare', label: 'Support Tickets', screen: 'AdminSupport' },
    { icon: 'AlertCircle', label: 'Reported Products', screen: 'AdminProducts' },
  ],
  [ROLES.VENDOR_ADMIN]: [
    { icon: 'Users', label: 'Vendors', screen: 'AdminUsers' },
    { icon: 'Package', label: 'Products', screen: 'AdminProducts' },
  ],
  [ROLES.WAREHOUSE_MANAGER]: [
    { icon: 'Warehouse', label: 'Warehouse Applications', screen: 'AdminWarehouse' },
    { icon: 'Package', label: 'Inventory', screen: 'AdminWarehouse' },
  ],
  [ROLES.TRANSPORT_MANAGER]: [
    { icon: 'Truck', label: 'Logistics Applications', screen: 'AdminLogistics' },
    { icon: 'ShoppingCart', label: 'Deliveries', screen: 'AdminLogistics' },
  ],
  [ROLES.CUSTOMER_SUPPORT]: [
    { icon: 'MessageSquare', label: 'Support Tickets', screen: 'AdminSupport' },
    { icon: 'Gavel', label: 'Disputes', screen: 'AdminSupport' },
  ],
  [ROLES.FINANCE_ADMIN]: [
    { icon: 'DollarSign', label: 'Finance', screen: 'AdminFinance' },
    { icon: 'CreditCard', label: 'Withdrawals', screen: 'AdminFinance' },
    { icon: 'FileText', label: 'Transactions', screen: 'AdminFinance' },
  ],
}

export const isBusinessRole = (role) => [
  ROLES.SELLER,
  ROLES.LOGISTICS_COMPANY,
  ROLES.WAREHOUSE,
].includes(role)
