import storage from '../utils/storage';

// React Native sets global.window = global for compatibility, so checking typeof window
// alone is not reliable. Use document detection instead, as RN's global doesn't have document.
const isWeb = typeof document !== 'undefined' && typeof window !== 'undefined' && window.location;
let API_BASE;
let _tokenCache = null;

if (isWeb) {
  API_BASE = '/api';
} else {
  let _host = 'localhost';
  try {
    const Constants = require('expo-constants').default;
    let hostPort = null;
    try {
      hostPort = Constants?.expoGoConfig?.debuggerHost ||
        Constants?.manifest?.debuggerHost ||
        Constants?.expoConfig?.hostUri;
    } catch (e) { hostPort = null; }
    if (hostPort) {
      _host = String(hostPort).split(':')[0];
    }
    API_BASE =
      Constants?.expoConfig?.extra?.apiBase ||
      Constants?.manifest?.extra?.apiBase ||
      `http://${_host}:3001/api`;
  } catch (e) {
    API_BASE = `http://${_host}:3001/api`;
  }
}

function getBaseUrl() {
  if (typeof document !== 'undefined' && typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin + '/api';
  }
  return API_BASE;
}

function getTokenFromCache() {
  return _tokenCache || null;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = _tokenCache || (await storage.getItem('auth_token'));
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    cache: 'no-store',
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    if (typeof FormData !== 'undefined' && config.body instanceof FormData) {
      // Let the browser set Content-Type with multipart boundary
      delete config.headers['Content-Type'];
    } else {
      config.body = JSON.stringify(config.body);
    }
  }

  const response = await fetch(url, config);
  let data;
  try {
    data = await response.json();
  } catch (e) {
    if (!response.ok) {
      data = {
        success: false,
        message: `Server returned ${response.status}`,
        status: response.status,
      };
    } else {
      data = { success: true };
    }
  }
  if (!response.ok && data.success !== false) {
    data.success = false;
    data.message = data.message || `Server returned ${response.status}`;
    data.status = response.status;
  }
  return { response, data };
}

const api = {
  request,
  getBaseURL: () => API_BASE,

  async getCSRFToken() {
    const { data } = await request('/auth.php?get_csrf_token=1', { method: 'GET' });
    return data;
  },

  async login(email, password) {
    const csrf = await this.getCSRFToken();
    const token = csrf?.csrf_token || '';
    const { data } = await request('/auth.php', {
      method: 'POST',
      body: { action: 'login', email, password, csrf_token: token },
    });
    if (data.success && data.token) {
      _tokenCache = data.token;
      await storage.setItem('auth_token', data.token);
    }
    return data;
  },

  async register(
    full_name,
    phone,
    email,
    shipping_address,
    password,
    role = 'customer',
    extra = {}
  ) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/register.php', {
      method: 'POST',
      body: {
        action: 'register',
        full_name,
        phone,
        email,
        shipping_address,
        password,
        role,
        ...extra,
        csrf_token: csrf?.csrf_token || '',
      },
    });
    return data;
  },

  async logout() {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/auth.php', {
      method: 'POST',
      body: { action: 'logout', csrf_token: csrf?.csrf_token || '' },
    });
    _tokenCache = null;
    await storage.removeItem('auth_token');
    await storage.removeItem('csrf_token');
    return data;
  },

  async getProfile() {
    const { data } = await request('/auth.php?action=get_profile', { method: 'GET' });
    return data;
  },

  async getMyApplication() {
    const { data } = await request('/my-application.php', { method: 'GET' });
    return data;
  },

  async getLogisticsApplications(status) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const { data } = await request(`/content/admin/logistics-applications?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async getWarehouseApplications(status) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const { data } = await request(`/content/admin/warehouse-applications?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async approveLogisticsApplication(id, notes) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/logistics-applications/${id}/approve`, {
      method: 'POST',
      body: { notes, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async rejectLogisticsApplication(id, notes) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/logistics-applications/${id}/reject`, {
      method: 'POST',
      body: { notes, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getAdminLogisticsDocuments() {
    const { data } = await request(`/content/admin/logistics/documents`, { method: 'GET' });
    return data;
  },

  async verifyLogisticsDocument(id, isVerified, notes) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/logistics/documents/${id}/verify`, {
      method: 'PUT',
      body: { is_verified: isVerified ? 1 : 0, notes, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async approveWarehouseApplication(id, notes) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/warehouse-applications/${id}/approve`, {
      method: 'POST',
      body: { notes, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async rejectWarehouseApplication(id, notes) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/warehouse-applications/${id}/reject`, {
      method: 'POST',
      body: { notes, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getProducts(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/products.php?${params.toString()}`, { method: 'GET' });
    return data;
  },

  async getProduct(id) {
    const { data } = await request(`/products.php?id=${id}`, { method: 'GET' });
    return data;
  },

  async createProduct(productData) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/products.php', {
      method: 'POST',
      body: { ...productData, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  // Upload product with images via multipart/form-data
  async createProductWithImages(productData, images = []) {
    const csrf = await this.getCSRFToken();
    const form = new FormData();
    Object.entries(productData).forEach(([key, value]) => {
      form.append(key, value);
    });
    form.append('csrf_token', csrf?.csrf_token || '');
    images.forEach((img, idx) => {
      form.append('images', img);
    });
    const { data } = await request('/products/create', {
      method: 'POST',
      body: form,
    });
    return data;
  },

  async getCategories() {
    const { data } = await request('/products.php?action=categories', { method: 'GET' });
    return data;
  },

  async getCart() {
    const { data } = await request('/cart.php', { method: 'GET' });
    return data;
  },

  async addToCart(productId, quantity = 1) {
    const { data } = await request('/cart.php', {
      method: 'POST',
      body: { action: 'add', product_id: productId, quantity },
    });
    return data;
  },

  async updateCartItem(productId, quantity) {
    const { data } = await request('/cart.php', {
      method: 'POST',
      body: { action: 'update', product_id: productId, quantity },
    });
    return data;
  },

  async removeFromCart(productId) {
    const { data } = await request('/cart.php', {
      method: 'POST',
      body: { action: 'remove', product_id: productId },
    });
    return data;
  },

  async clearCart() {
    const { data } = await request('/cart.php', {
      method: 'POST',
      body: { action: 'clear' },
    });
    return data;
  },

  async getOrders(customerId) {
    const { data } = await request(`/orders.php?customer_id=${customerId}`, { method: 'GET' });
    return data;
  },

  async getOrder(orderNumber) {
    const { data } = await request(`/orders.php?order_number=${encodeURIComponent(orderNumber)}`, {
      method: 'GET',
    });
    return data;
  },

  async createOrder(orderData) {
    const { data } = await request('/orders.php', {
      method: 'POST',
      body: orderData,
    });
    return data;
  },

  async updateOrderStatus(orderId, status) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/orders.php', {
      method: 'PUT',
      body: { order_id: orderId, status, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  // ============ ORDER LIFECYCLE ============

  async getOrderLifecycle(orderId) {
    const { data } = await request(
      `/order_lifecycle.php?action=get&order_id=${encodeURIComponent(orderId)}`,
      { method: 'GET' }
    );
    return data;
  },

  async getOrderTimeline(orderId) {
    const { data } = await request(
      `/order_lifecycle.php?action=timeline&order_id=${encodeURIComponent(orderId)}`,
      { method: 'GET' }
    );
    return data;
  },

  async getOrderActions(orderId) {
    const { data } = await request(
      `/order_lifecycle.php?action=actions&order_id=${encodeURIComponent(orderId)}`,
      { method: 'GET' }
    );
    return data;
  },

  async getLifecycleStages() {
    const { data } = await request('/order_lifecycle.php?action=stages', { method: 'GET' });
    return data;
  },

  async performOrderAction(payload) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/order_lifecycle.php', {
      method: 'POST',
      body: { ...payload, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async performFulfillmentUpdate(fulfillmentId, status, notes = null, trackingNumber = null) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/order_lifecycle.php', {
      method: 'POST',
      body: {
        action: 'fulfillment_update',
        fulfillment_id: fulfillmentId,
        status,
        notes,
        tracking_number: trackingNumber,
        csrf_token: csrf?.csrf_token || '',
      },
    });
    return data;
  },

  // ============ PAYMENTS (direct buyer → seller) ============

  async initPayment({
    order_id,
    amount,
    method,
    idempotency_key,
    phone,
    card_token,
    bank_reference,
    redirect_url,
    cancel_url,
    notes,
  }) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/payments/checkout', {
      method: 'POST',
      body: {
        order_id,
        amount,
        method,
        idempotency_key,
        phone,
        card_token,
        bank_reference,
        redirect_url,
        cancel_url,
        notes,
        csrf_token: csrf?.csrf_token || '',
      },
    });
    return data;
  },

  async getPaymentStatus(paymentId) {
    const { data } = await request(`/payments/${paymentId}`, { method: 'GET' });
    return data;
  },

  async pollPaymentStatus(paymentId) {
    const { data } = await request(`/payments/${paymentId}/poll`, { method: 'GET' });
    return data;
  },

  async getPaymentReceipt(paymentId) {
    const { data } = await request(`/payments/${paymentId}/receipt`, { method: 'GET' });
    return data;
  },

  async approveCashOnDelivery(paymentId) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/payments/${paymentId}/approve-cod`, {
      method: 'POST',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  // === Direct buyer → seller payment (no escrow) ===

  async getSellerPaymentMethods(sellerId) {
    const { data } = await request(`/seller/payment-methods`, { method: 'GET' });
    return data;
  },

  async getSellerDefaultPaymentMethod(sellerId) {
    const { data } = await request(`/seller/payment-methods/default`, { method: 'GET' });
    return data;
  },

  async createSellerPaymentMethod(method) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/seller/payment-methods', {
      method: 'POST',
      body: { ...method, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async updateSellerPaymentMethod(id, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/seller/payment-methods/${id}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async deleteSellerPaymentMethod(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/seller/payment-methods/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async markPaymentSubmitted({ order_id, payment_id, payment_reference }) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/payments/mark-submitted', {
      method: 'POST',
      body: {
        order_id,
        payment_id,
        payment_reference,
        csrf_token: csrf?.csrf_token || '',
      },
    });
    return data;
  },

  async confirmSellerPayment({ order_id, payment_id, seller_notes }) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/payments/confirm', {
      method: 'POST',
      body: {
        order_id,
        payment_id,
        seller_notes,
        csrf_token: csrf?.csrf_token || '',
      },
    });
    return data;
  },

  async rejectSellerPayment({ order_id, payment_id, reason }) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/payments/reject', {
      method: 'POST',
      body: {
        order_id,
        payment_id,
        reason,
        csrf_token: csrf?.csrf_token || '',
      },
    });
    return data;
  },

  async getPaymentMethods() {
    const { data } = await request('/content/me/payment-methods', { method: 'GET' });
    return data;
  },

  async addPaymentMethod(method) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/me/payment-methods', {
      method: 'POST',
      body: { ...method, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getUserStats(customerId) {
    const { data } = await request(`/orders.php?action=get_user_stats&user_id=${customerId}`, {
      method: 'GET',
    });
    return data;
  },

  async getSellerStats(sellerId) {
    const { data } = await request(`/orders.php?action=get_seller_stats&user_id=${sellerId}`, {
      method: 'GET',
    });
    return data;
  },

  async getSellerOrders(sellerId) {
    const { data } = await request(`/orders.php?action=get_seller_orders&user_id=${sellerId}`, {
      method: 'GET',
    });
    return data;
  },

  async getSellerTopProducts(sellerId) {
    const { data } = await request(`/orders.php?action=get_seller_products&user_id=${sellerId}`, {
      method: 'GET',
    });
    return data;
  },

  async getNotifications(customerId, options = {}) {
    const params = new URLSearchParams({ customer_id: customerId });
    if (options.unreadOnly) params.append('unread_only', 'true');
    if (options.limit) params.append('limit', String(options.limit));
    const { data } = await request(`/notifications.php?${params.toString()}`, { method: 'GET' });
    return data;
  },

  async markNotificationsRead(customerId, notificationIds = null) {
    const { data } = await request('/notifications.php', {
      method: 'PUT',
      body: { customer_id: customerId, notification_ids: notificationIds },
    });
    return data;
  },

  async getWishlist(customerId) {
    const { data } = await request(`/products.php?action=get_wishlist&user_id=${customerId}`, {
      method: 'GET',
    });
    return data;
  },

  async addToWishlist(customerId, productId) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/products.php', {
      method: 'POST',
      body: {
        action: 'add_to_wishlist',
        product_id: productId,
        user_id: customerId,
        csrf_token: csrf?.csrf_token || '',
      },
    });
    return data;
  },

  async removeFromWishlist(customerId, productId) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/products.php', {
      method: 'POST',
      body: {
        action: 'remove_from_wishlist',
        product_id: productId,
        user_id: customerId,
        csrf_token: csrf?.csrf_token || '',
      },
    });
    return data;
  },

  async getMarketPrices() {
    const { data } = await request('/market_prices.php', { method: 'GET' });
    return data;
  },

  async getMarketPricesByRegion(region) {
    const { data } = await request(
      `/market_prices.php?action=prices_by_region&region=${encodeURIComponent(region)}`,
      { method: 'GET' }
    );
    return data;
  },

  async getAllRegionsPrices() {
    const { data } = await request('/market_prices.php?action=all_regions', { method: 'GET' });
    return data;
  },

  async getPriceHistory(commodity, region, days = 30) {
    const params = new URLSearchParams({
      action: 'price_history',
      commodity,
      region,
      days: String(days),
    });
    const { data } = await request(`/market_prices.php?${params.toString()}`, { method: 'GET' });
    return data;
  },

  async getDashboardData() {
    const { data } = await request('/market_prices.php?action=dashboard_data', { method: 'GET' });
    return data;
  },

  async createPriceAlert(customerId, commodity, targetPrice, direction, region = null) {
    const { data } = await request('/market_prices.php', {
      method: 'POST',
      body: { customer_id: customerId, commodity, target_price: targetPrice, direction, region },
    });
    return data;
  },

  async updateProfile(updates) {
    const csrf = await this.getCSRFToken();
    const token = csrf?.csrf_token || '';
    const { data } = await request('/auth.php', {
      method: 'POST',
      body: { action: 'update_profile', csrf_token: token, ...updates },
    });
    return data;
  },

  async changePassword({ current_password, new_password }) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/auth.php', {
      method: 'POST',
      body: {
        action: 'change_password',
        csrf_token: csrf?.csrf_token || '',
        current_password,
        new_password,
      },
    });
    return data;
  },

  // Subscription Plans
  async getSubscriptionPlans() {
    const { data } = await request('/subscriptions.php?action=plans', { method: 'GET' });
    return data;
  },

  async getPlanBySlug(slug) {
    const { data } = await request(`/subscriptions.php?action=plan&slug=${slug}`, {
      method: 'GET',
    });
    return data;
  },

  async subscribe(customerId, planSlug, period = 'monthly', paymentMethod = 'mpesa') {
    const { data } = await request('/subscriptions.php', {
      method: 'POST',
      body: {
        action: 'subscribe',
        customer_id: customerId,
        plan_slug: planSlug,
        period,
        payment_method: paymentMethod,
      },
    });
    return data;
  },

  async getMySubscription(customerId) {
    const { data } = await request(
      `/subscriptions.php?action=my_subscription&customer_id=${customerId}`,
      { method: 'GET' }
    );
    return data;
  },

  async updateVendorProfile(customerId, businessName, businessType, tinNumber) {
    const { data } = await request('/subscriptions.php', {
      method: 'POST',
      body: {
        action: 'update_vendor_profile',
        customer_id: customerId,
        business_name: businessName,
        business_type: businessType,
        tin_number: tinNumber,
      },
    });
    return data;
  },

  // Commissions
  async getCommissions(sellerId = null, status = '') {
    const params = new URLSearchParams();
    if (sellerId) params.append('seller_id', sellerId);
    if (status) params.append('status', status);
    const { data } = await request(`/commissions.php?action=list&${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async getSellerCommissionSummary(sellerId) {
    const { data } = await request(`/commissions.php?action=seller_summary&seller_id=${sellerId}`, {
      method: 'GET',
    });
    return data;
  },

  async getPlatformCommissionOverview() {
    const { data } = await request('/commissions.php?action=platform_overview', { method: 'GET' });
    return data;
  },

  async calculateCommission(orderId, sellerId) {
    const { data } = await request('/commissions.php', {
      method: 'POST',
      body: { action: 'calculate', order_id: orderId, seller_id: sellerId },
    });
    return data;
  },

  async recordCommission(orderId, sellerId) {
    const { data } = await request('/commissions.php', {
      method: 'POST',
      body: { action: 'record', order_id: orderId, seller_id: sellerId },
    });
    return data;
  },

  // Featured Listings
  async getAdPackages() {
    const { data } = await request('/featured_listings.php?action=packages', { method: 'GET' });
    return data;
  },

  async getActiveListings(type = 'search') {
    const { data } = await request(`/featured_listings.php?action=active&type=${type}`, {
      method: 'GET',
    });
    return data;
  },

  async getHomepageBanners() {
    const { data } = await request('/featured_listings.php?action=homepage', { method: 'GET' });
    return data;
  },

  async getMyListings(sellerId) {
    const { data } = await request(
      `/featured_listings.php?action=my_listings&seller_id=${sellerId}`,
      { method: 'GET' }
    );
    return data;
  },

  async purchaseFeaturedListing(productId, sellerId, packageSlug, paymentMethod = 'mpesa') {
    const { data } = await request('/featured_listings.php', {
      method: 'POST',
      body: {
        action: 'purchase',
        product_id: productId,
        seller_id: sellerId,
        package_slug: packageSlug,
        payment_method: paymentMethod,
      },
    });
    return data;
  },

  async trackImpression(listingId) {
    const csrf = await this.getCSRFToken();
    await request('/featured_listings.php', {
      method: 'POST',
      body: {
        action: 'track_impression',
        listing_id: listingId,
        csrf_token: csrf?.csrf_token || '',
      },
    });
  },

  async trackClick(listingId) {
    const csrf = await this.getCSRFToken();
    await request('/featured_listings.php', {
      method: 'POST',
      body: { action: 'track_click', listing_id: listingId, csrf_token: csrf?.csrf_token || '' },
    });
  },

  // Logistics
  async getTransportProviders(region = '') {
    const params = region ? `?action=providers&region=${region}` : '?action=providers';
    const { data } = await request(`/logistics.php${params}`, { method: 'GET' });
    return data;
  },

  async getLogisticsCommissions() {
    const { data } = await request('/logistics.php?action=commissions', { method: 'GET' });
    return data;
  },

  async bookTransport(orderId, providerId, distance, deliveryCost) {
    const { data } = await request('/logistics.php', {
      method: 'POST',
      body: {
        action: 'book_transport',
        order_id: orderId,
        provider_id: providerId,
        distance,
        delivery_cost: deliveryCost,
      },
    });
    return data;
  },

  async addTransportProvider(providerData) {
    const { data } = await request('/logistics.php', {
      method: 'POST',
      body: { action: 'add_provider', ...providerData },
    });
    return data;
  },

  // Warehouse
  async getWarehouses(region = '') {
    const params = region ? `?action=warehouses&region=${region}` : '?action=warehouses';
    const { data } = await request(`/warehouse.php${params}`, { method: 'GET' });
    return data;
  },

  async getWarehouseBookings(customerId) {
    const { data } = await request(`/warehouse.php?action=bookings&customer_id=${customerId}`, {
      method: 'GET',
    });
    return data;
  },

  async bookWarehouse(warehouseId, customerId, productType, quantity, startDate, endDate) {
    const { data } = await request('/warehouse.php', {
      method: 'POST',
      body: {
        action: 'book',
        warehouse_id: warehouseId,
        customer_id: customerId,
        product_type: productType,
        quantity,
        start_date: startDate,
        end_date: endDate,
      },
    });
    return data;
  },

  async addWarehouse(warehouseData) {
    const { data } = await request('/warehouse.php', {
      method: 'POST',
      body: { action: 'add_warehouse', ...warehouseData },
    });
    return data;
  },

  // Market Intelligence
  async getMarketReports(filters = {}) {
    const params = new URLSearchParams({ action: 'reports' });
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) params.append(k, v);
    });
    const { data } = await request(`/market_intelligence.php?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async getReport(slug) {
    const { data } = await request(`/market_intelligence.php?action=report&slug=${slug}`, {
      method: 'GET',
    });
    return data;
  },

  async getMyMarketSubscription(customerId) {
    const { data } = await request(
      `/market_intelligence.php?action=my_subscription&customer_id=${customerId}`,
      { method: 'GET' }
    );
    return data;
  },

  async subscribeMarketIntel(
    customerId,
    planType,
    commodities = 'rice,maize,wheat',
    frequency = 'weekly'
  ) {
    const { data } = await request('/market_intelligence.php', {
      method: 'POST',
      body: {
        action: 'subscribe',
        customer_id: customerId,
        plan_type: planType,
        commodities,
        frequency,
      },
    });
    return data;
  },

  async purchaseReport(reportId, customerId) {
    const { data } = await request('/market_intelligence.php', {
      method: 'POST',
      body: { action: 'purchase_report', report_id: reportId, customer_id: customerId },
    });
    return data;
  },

  async createReport(reportData) {
    const { data } = await request('/market_intelligence.php', {
      method: 'POST',
      body: { action: 'create_report', ...reportData },
    });
    return data;
  },

  // Value-Added Services
  async getValueAddedServices(category = '') {
    const params = category ? `?action=services&category=${category}` : '?action=services';
    const { data } = await request(`/value_added_services.php${params}`, { method: 'GET' });
    return data;
  },

  async getServiceCategories() {
    const { data } = await request('/value_added_services.php?action=categories', {
      method: 'GET',
    });
    return data;
  },

  async getMyServiceBookings(customerId) {
    const { data } = await request(
      `/value_added_services.php?action=my_bookings&customer_id=${customerId}`,
      { method: 'GET' }
    );
    return data;
  },

  async bookService(serviceId, customerId, quantity = 1, notes = '') {
    const { data } = await request('/value_added_services.php', {
      method: 'POST',
      body: {
        action: 'book_service',
        service_id: serviceId,
        customer_id: customerId,
        quantity,
        notes,
      },
    });
    return data;
  },

  async updateServiceBookingStatus(bookingId, status, providerResponse = '') {
    const { data } = await request('/value_added_services.php', {
      method: 'POST',
      body: {
        action: 'update_status',
        booking_id: bookingId,
        status,
        provider_response: providerResponse,
      },
    });
    return data;
  },

  // Revenue Dashboard
  async getRevenueOverview(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const { data } = await request(`/finance/overview?${params.toString()}`, { method: 'GET' });
    return data;
  },

  async getRevenueProjections() {
    const { data } = await request('/finance/projections', { method: 'GET' });
    return data;
  },

  async getTopRevenueSources(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const { data } = await request(`/finance/revenue-by-type?${params.toString()}`, { method: 'GET' });
    return data;
  },

  async getSubscriptionStats(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const { data } = await request(`/finance/subscription-stats?${params.toString()}`, { method: 'GET' });
    return data;
  },

  async getEscrowFees() {
    const { data } = await request('/finance/escrow-summary', { method: 'GET' });
    return data;
  },

  async getCommissionBreakdown(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const { data } = await request(`/finance/commission-breakdown?${params.toString()}`, { method: 'GET' });
    return data;
  },

  async getFinanceTrend(days = 30) {
    const { data } = await request(`/finance/revenue-trend?days=${parseInt(days) || 30}`, { method: 'GET' });
    return data;
  },

  async getPayoutSummary() {
    const { data } = await request('/finance/payout-summary', { method: 'GET' });
    return data;
  },

  async getRefundSummary() {
    const { data } = await request('/finance/refund-summary', { method: 'GET' });
    return data;
  },

  async getFinancePaymentMethods() {
    const { data } = await request('/finance/payment-methods', { method: 'GET' });
    return data;
  },

  async getTopSellers(limit = 10) {
    const { data } = await request(`/finance/top-sellers?limit=${parseInt(limit) || 10}`, { method: 'GET' });
    return data;
  },

  async getCashFlow(months = 6) {
    const { data } = await request(`/finance/cash-flow?months=${parseInt(months) || 6}`, { method: 'GET' });
    return data;
  },

  async recordRevenue(
    revenueType,
    amount,
    referenceId = null,
    referenceType = '',
    customerId = null,
    description = ''
  ) {
    const { data } = await request('/revenue_dashboard.php', {
      method: 'POST',
      body: {
        action: 'record_revenue',
        revenue_type: revenueType,
        amount,
        reference_id: referenceId,
        reference_type: referenceType,
        customer_id: customerId,
        description,
      },
    });
    return data;
  },

  // ============ Escrow ============
  async getEscrowTransactions(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/escrow.php?${params.toString()}`, { method: 'GET' });
    return data;
  },

  async getEscrowTransaction(id) {
    const { data } = await request(`/escrow.php?id=${encodeURIComponent(String(id))}`, {
      method: 'GET',
    });
    return data;
  },

  async createEscrow(payload) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/escrow.php', {
      method: 'POST',
      body: { action: 'create', ...payload, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async releaseEscrow(transactionId, notes = '') {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/escrow.php/${transactionId}/release`, {
      method: 'POST',
      body: { notes, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async refundEscrow(transactionId, notes = '') {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/escrow.php/${transactionId}/refund`, {
      method: 'POST',
      body: { notes, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async disputeEscrow(transactionId, reason) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/escrow.php/${transactionId}/dispute`, {
      method: 'POST',
      body: { reason, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async cancelEscrow(transactionId, reason = '') {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/escrow.php/${transactionId}/cancel`, {
      method: 'POST',
      body: { reason, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getConversations() {
    const params = new URLSearchParams({ action: 'conversations' });
    const { data } = await request(`/messages.php?${params.toString()}`, { method: 'GET' });
    return data;
  },

  async getMessages(conversationId) {
    const { data } = await request(
      `/messages.php?action=messages&conversation_id=${conversationId}`,
      { method: 'GET' }
    );
    return data;
   },

  async editMessage(messageId, content) {
    const { data } = await request('/messages.php', {
      method: 'POST',
      body: { action: 'edit', message_id: messageId, content },
    });
    return data;
  },

  async deleteMessage(messageId) {
    const { data } = await request('/messages.php', {
      method: 'POST',
      body: { action: 'delete', message_id: messageId },
    });
    return data;
  },

  async sendMessage(recipientId, content, opts = {}) {
    const body = { action: 'send', recipient_id: recipientId, content };
    if (opts.replyToMessageId) body.reply_to_message_id = opts.replyToMessageId;
    const { data } = await request('/messages.php', { method: 'POST', body });
    return data;
  },

  async sendMessageReply(recipientId, content, replyToMessageId) {
    const { data } = await request('/messages.php', {
      method: 'POST',
      body: { action: 'reply', recipient_id: recipientId, content, reply_to_message_id: replyToMessageId },
    });
    return data;
  },

  async uploadMessageAttachment(conversationId, file, caption = '') {
    const form = new FormData();
    form.append('conversation_id', conversationId);
    form.append('image', file);
    if (caption) form.append('caption', caption);
    const { data } = await request('/messages.php/attachment', {
      method: 'POST',
      body: form,
    });
    return data;
  },

  async openConversation(sellerId, productId = null, orderId = null, requestedQuantity = null) {
    const { data } = await request('/conversations.php', {
      method: 'POST',
      body: {
        action: 'open_or_create',
        seller_id: sellerId,
        product_id: productId,
        order_id: orderId,
        requested_quantity: requestedQuantity,
      },
    });
    return data;
  },

  async getConversationContext(conversationId) {
    const { data } = await request(
      `/conversations.php?action=context&conversation_id=${conversationId}`,
      { method: 'GET' }
    );
    return data;
  },

  async archiveConversation(conversationId) {
    const { data } = await request('/conversations.php', {
      method: 'POST',
      body: { action: 'archive', conversation_id: conversationId },
    });
    return data;
  },

  async closeConversation(conversationId) {
    const { data } = await request('/conversations.php', {
      method: 'POST',
      body: { action: 'close', conversation_id: conversationId },
    });
    return data;
  },

  async reopenConversation(conversationId) {
    const { data } = await request('/conversations.php', {
      method: 'POST',
      body: { action: 'reopen', conversation_id: conversationId },
    });
    return data;
  },

  async getConversationDetail(conversationId) {
    const { data } = await request(
      `/conversations.php?action=get_detail&conversation_id=${conversationId}`,
      { method: 'GET' }
    );
    return data;
  },

  async markConversationRead(conversationId) {
    const { data } = await request('/messages.php', {
      method: 'POST',
      body: { action: 'mark_read', conversation_id: conversationId },
    });
    return data;
  },

  async sendTypingIndicator(conversationId) {
    const { data } = await request('/messages.php', {
      method: 'POST',
      body: { action: 'typing', conversation_id: conversationId },
    });
    return data;
  },

  async getOffers(conversationId) {
    const { data } = await request(`/offers.php?conversation_id=${conversationId}`, {
      method: 'GET',
    });
    return data;
  },

  async getOffer(offerId) {
    const { data } = await request(`/offers.php?id=${offerId}`, { method: 'GET' });
    return data;
  },

  async createOffer(conversationId, offerData) {
    const { data } = await request('/offers.php', {
      method: 'POST',
      body: { action: 'create', conversation_id: conversationId, ...offerData },
    });
    return data;
  },

  async updateOffer(offerId, status, counterOffer = null) {
    const { data } = await request('/offers.php', {
      method: 'POST',
      body: { action: 'update', offer_id: offerId, status, counter_offer: counterOffer },
    });
    return data;
  },

  async reportMessage(messageId, category, description = '') {
    const { data } = await request('/message_reports.php', {
      method: 'POST',
      body: { action: 'create', message_id: messageId, category, description },
    });
    return data;
  },

  // ============ MULTI-SELLER FULFILLMENT ============

  async getFulfillmentsByOrder(orderId) {
    const { data } = await request(`/fulfillments.php?action=by_order&order_id=${orderId}`, {
      method: 'GET',
    });
    return data;
  },

  async getFulfillmentsBySeller(sellerId, status = null, limit = null) {
    let url = `/fulfillments.php?action=by_seller&seller_id=${sellerId}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    if (limit) url += `&limit=${limit}`;
    const { data } = await request(url, { method: 'GET' });
    return data;
  },

  async updateFulfillmentStatus(fulfillmentId, status, trackingNumber = null, notes = null) {
    const { data } = await request('/fulfillments.php', {
      method: 'POST',
      body: {
        action: 'update_status',
        fulfillment_id: fulfillmentId,
        status,
        tracking_number: trackingNumber,
        notes,
      },
    });
    return data;
  },

  async blockUser(userId) {
    const { data } = await request('/blocks.php', {
      method: 'POST',
      body: { action: 'block', user_id: userId },
    });
    return data;
  },

  async unblockUser(userId) {
    const { data } = await request('/blocks.php', {
      method: 'POST',
      body: { action: 'unblock', user_id: userId },
    });
    return data;
  },

  async checkBlock(userId) {
    const { data } = await request(`/blocks.php?action=check&user_id=${userId}`, { method: 'GET' });
    return data;
  },

  async getBlockedUsers() {
    const { data } = await request('/blocks.php?action=list', { method: 'GET' });
    return data;
  },

  async getModerationStats() {
    const { data } = await request('/admin/chat_moderation.php?action=stats', { method: 'GET' });
    return data;
  },

  async getModerationEvents(filters = {}) {
    const params = new URLSearchParams({ action: 'events' });
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/admin/chat_moderation.php?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async getReportedMessages(filters = {}) {
    const params = new URLSearchParams({ action: 'reported_messages' });
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/admin/chat_moderation.php?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async getModerationSettings() {
    const { data } = await request('/admin/chat_moderation.php?action=settings', { method: 'GET' });
    return data;
  },

  async getUserWarnings(userId = null) {
    const params = new URLSearchParams({ action: 'user_warnings' });
    if (userId) params.append('user_id', userId);
    const { data } = await request(`/admin/chat_moderation.php?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async liftRestriction(userId) {
    const { data } = await request('/admin/chat_moderation.php', {
      method: 'POST',
      body: { action: 'lift_restriction', user_id: userId },
    });
    return data;
  },

  async resolveReport(reportId, status, adminNotes = '') {
    const { data } = await request('/admin/chat_moderation.php', {
      method: 'POST',
      body: { action: 'resolve_report', report_id: reportId, status, admin_notes: adminNotes },
    });
    return data;
  },

  async updateChatSettings(settings) {
    const { data } = await request('/admin/chat_moderation.php', {
      method: 'POST',
      body: { action: 'update_settings', settings },
    });
    return data;
  },

  async searchUsers(query, role = '') {
    const params = new URLSearchParams({ action: 'search', q: query });
    if (role) params.set('role', role);
    const { data } = await request(`/users.php?${params.toString()}`, { method: 'GET' });
    return data;
  },

  async getUserProfile(userId) {
    const { data } = await request(`/users.php?action=profile&id=${userId}`, { method: 'GET' });
    return data;
  },

  async getAIAgent() {
    const { data } = await request('/ai/agent', { method: 'GET' });
    return data;
  },

  async askAI(message) {
    const { data } = await request('/ai/ask', {
      method: 'POST',
      body: { message },
    });
    return data;
  },

  async getAIRecommendations(status = 'pending') {
    const { data } = await request(`/ai/recommendations?status=${status}`, { method: 'GET' });
    return data;
  },

  async generateAIRecommendations() {
    const { data } = await request('/ai/recommendations/generate', { method: 'POST' });
    return data;
  },

  async updateAIRecommendationStatus(recommendationId, status) {
    const { data } = await request(`/ai/recommendations/${recommendationId}/status`, {
      method: 'PUT',
      body: { status },
    });
    return data;
  },

  async getAIMemories(type = null) {
    const params = type ? `?type=${type}` : '';
    const { data } = await request(`/ai/memories${params}`, { method: 'GET' });
    return data;
  },

  async addAIMemory(memoryType, content, importance = 5) {
    const { data } = await request('/ai/memories', {
      method: 'POST',
      body: { memory_type: memoryType, content, importance },
    });
    return data;
  },

  async deleteAIMemory(memoryId) {
    const { data } = await request(`/ai/memories/${memoryId}`, { method: 'DELETE' });
    return data;
  },

  async clearAIMemories() {
    const { data } = await request('/ai/memories', { method: 'DELETE' });
    return data;
  },

  async getAIConversations(limit = 50) {
    const { data } = await request(`/ai/conversations?limit=${limit}`, { method: 'GET' });
    return data;
  },

  async clearAIConversations() {
    const { data } = await request('/ai/conversations', { method: 'DELETE' });
    return data;
  },

  async executeAITool(tool, params = {}) {
    const { data } = await request('/ai/actions', {
      method: 'POST',
      body: { tool, params },
    });
    return data;
  },

  async getAITools() {
    const { data } = await request('/ai/tools', { method: 'GET' });
    return data;
  },

  async updateAIPreferences(preferences) {
    const { data } = await request('/ai/preferences', {
      method: 'POST',
      body: { preferences },
    });
    return data;
  },

  messagesStreamUrl(customerId) {
    const token = getTokenFromCache();
    const base = getBaseUrl();
    return `${base}/messages_realtime.php?customer_id=${customerId}&token=${encodeURIComponent(token || '')}`;
  },

  // ============ CMS / Site Content ============
  async getSiteCategories() {
    const { data } = await request('/content/site/categories', { method: 'GET' });
    return data;
  },
  async getSiteStats() {
    const { data } = await request('/content/site/stats', { method: 'GET' });
    return data;
  },
  async getTestimonials() {
    const { data } = await request('/content/site/testimonials', { method: 'GET' });
    return data;
  },
  async getPartners() {
    const { data } = await request('/content/site/partners', { method: 'GET' });
    return data;
  },
  async getFaqs() {
    const { data } = await request('/content/site/faqs', { method: 'GET' });
    return data;
  },
  async getBlogPosts() {
    const { data } = await request('/content/site/blog', { method: 'GET' });
    return data;
  },
  async getBlogPost(slug) {
    const { data } = await request(`/content/site/blog/${encodeURIComponent(slug)}`, {
      method: 'GET',
    });
    return data;
  },
  async getJobs() {
    const { data } = await request('/content/site/jobs', { method: 'GET' });
    return data;
  },

  // ============ Auctions ============
  async getAuctions(status = null) {
    const q = status ? `?status=${status}` : '';
    const { data } = await request(`/content/auctions${q}`, { method: 'GET' });
    return data;
  },
  async getAuction(id) {
    const { data } = await request(`/content/auctions/${id}`, { method: 'GET' });
    return data;
  },
  async placeBid(auctionId, bidAmount) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/auctions/${auctionId}/bid`, {
      method: 'POST',
      body: { bid_amount: bidAmount, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  // ============ Cooperatives ============
  async getCooperatives() {
    const { data } = await request('/content/cooperatives', { method: 'GET' });
    return data;
  },
  async getCooperative(id) {
    const { data } = await request(`/content/cooperatives/${id}`, { method: 'GET' });
    return data;
  },

  // ============ Loans / Insurance / Contracts ============
  async getLoanProducts() {
    const { data } = await request('/content/loans/products', { method: 'GET' });
    return data;
  },
  async getMyLoans() {
    const { data } = await request('/content/loans/my', { method: 'GET' });
    return data;
  },
  async applyForLoan(loanProductId, principal, termMonths) {
    const { data } = await request('/content/loans/apply', {
      method: 'POST',
      body: { loan_product_id: loanProductId, principal, term_months: termMonths },
    });
    return data;
  },
  async getInsurancePolicies() {
    const { data } = await request('/content/insurance/policies', { method: 'GET' });
    return data;
  },
  async getMyContracts() {
    const { data } = await request('/content/contracts', { method: 'GET' });
    return data;
  },

  // ============ Disputes / Quality ============
  async getDisputes() {
    const { data } = await request('/content/disputes', { method: 'GET' });
    return data;
  },
  async createDispute(payload) {
    const { data } = await request('/content/disputes', { method: 'POST', body: payload });
    return data;
  },
  async getQualityInspections(productId = null) {
    const q = productId ? `?product_id=${productId}` : '';
    const { data } = await request(`/content/quality/inspections${q}`, { method: 'GET' });
    return data;
  },

  // ============ Sustainability / Weather ============
  async getSustainability() {
    const { data } = await request('/content/sustainability/practices', { method: 'GET' });
    return data;
  },
  async createSustainabilityProject(projectData) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/sustainability/project', {
      method: 'POST',
      body: { ...projectData, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async getWeather(region = null) {
    const q = region ? `?region=${encodeURIComponent(region)}` : '';
    const { data } = await request(`/content/weather/current${q}`, { method: 'GET' });
    return data;
  },
  async getPlantingCalendar(region = null, crop = null) {
    const params = new URLSearchParams();
    if (region) params.append('region', region);
    if (crop) params.append('crop', crop);
    const { data } = await request(`/content/weather/calendar?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  // ============ Loyalty ============
  async getLoyaltyLevels() {
    const { data } = await request('/content/loyalty/levels', { method: 'GET' });
    return data;
  },
  async getLoyaltyRewards() {
    const { data } = await request('/content/loyalty/rewards', { method: 'GET' });
    return data;
  },
  async getMyLoyalty() {
    const { data } = await request('/content/loyalty/my', { method: 'GET' });
    return data;
  },

  // ============ Admin / Operations ============
  async getAdminUsers(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/admin/users?${params.toString()}`, { method: 'GET' });
    return data;
  },
  async getAdminCustomers() {
    const { data } = await request('/content/admin/customers', { method: 'GET' });
    return data;
  },
  async getApplications(status = null) {
    const q = status ? `?status=${status}` : '';
    const { data } = await request(`/content/admin/applications${q}`, { method: 'GET' });
    return data;
  },
  async getReportedProducts() {
    const { data } = await request('/content/admin/reported-products', { method: 'GET' });
    return data;
  },
  async getWithdrawals() {
    const { data } = await request('/content/admin/withdrawals', { method: 'GET' });
    return data;
  },
  async getRefunds() {
    const { data } = await request('/content/admin/refunds', { method: 'GET' });
    return data;
  },
  async getAuditLogs() {
    const { data } = await request('/content/admin/audit-logs', { method: 'GET' });
    return data;
  },
  async getSuspendedVendors() {
    const { data } = await request('/content/admin/suspended-vendors', { method: 'GET' });
    return data;
  },
  async getAdvertisements(placement = null) {
    const q = placement ? `?placement=${placement}` : '';
    const { data } = await request(`/content/admin/advertisements${q}`, { method: 'GET' });
    return data;
  },
  async getSupportTickets() {
    const { data } = await request('/content/admin/support-tickets', { method: 'GET' });
    return data;
  },

  async getAdminVendorAnalytics(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/admin/vendors/analytics?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async getAdminVendorAnalyticsDetail(vendorId) {
    const { data } = await request(`/content/admin/vendors/${vendorId}/analytics`, {
      method: 'GET',
    });
    return data;
  },

  async getAdminTopVendors(metric = 'revenue', limit = 10) {
    const params = new URLSearchParams({ metric, limit });
    const { data } = await request(`/content/admin/vendors/top?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  // ============ Tax / VAT Configuration ============
  async getAdminTax(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/admin/tax?${params.toString()}`, { method: 'GET' });
    return data;
  },
  async createAdminTax(tax) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/admin/tax', {
      method: 'POST',
      body: { ...tax, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async updateAdminTax(id, tax) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/tax/${id}`, {
      method: 'PUT',
      body: { ...tax, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async deleteAdminTax(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/tax/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async getAdminTaxExemptions() {
    const { data } = await request('/content/admin/tax/exemptions', { method: 'GET' });
    return data;
  },
  async createAdminTaxExemption(exemption) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/admin/tax/exemptions', {
      method: 'POST',
      body: { ...exemption, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async deleteAdminTaxExemption(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/tax/exemptions/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  // ============ Content Moderation ============
  async getAdminModerationQueue(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/admin/moderation/queue?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },
  async getModerationQueueItem(id) {
    const { data } = await request(`/content/admin/moderation/queue/${id}`, { method: 'GET' });
    return data;
  },
  async moderateContent(queueId, actionType, notes) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/moderation/queue/${queueId}/action`, {
      method: 'POST',
      body: { action_type: actionType, notes, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async getModerationRules() {
    const { data } = await request('/content/admin/moderation/rules', { method: 'GET' });
    return data;
  },
  async createModerationRule(rule) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/admin/moderation/rules', {
      method: 'POST',
      body: { ...rule, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async updateModerationRule(id, rule) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/moderation/rules/${id}`, {
      method: 'PUT',
      body: { ...rule, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async deleteModerationRule(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/moderation/rules/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  // ============ Logistics / Inventory ============
  async getRoutes() {
    const { data } = await request('/content/logistics/routes', { method: 'GET' });
    return data;
  },
  async getDrivers() {
    const { data } = await request('/content/logistics/drivers', { method: 'GET' });
    return data;
  },
  async getActiveDeliveries() {
    const { data } = await request('/content/logistics/active-deliveries', { method: 'GET' });
    return data;
  },
  async getInventory() {
    const { data } = await request('/content/inventory', { method: 'GET' });
    return data;
  },
  async getInventoryMovements() {
    const { data } = await request('/content/inventory/movements', { method: 'GET' });
    return data;
  },

  async getMyDeliveries() {
    const { data } = await request('/content/me/my-deliveries', { method: 'GET' });
    return data;
  },

  async updateDeliveryLocation(id, currentLocation, latitude, longitude) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/me/my-deliveries/${id}/location`, {
      method: 'PUT',
      body: {
        current_location: currentLocation,
        latitude,
        longitude,
        csrf_token: csrf?.csrf_token || '',
      },
    });
    return data;
  },

  async getMyDeliveryRealtime(providerId) {
    const { data } = await request(`/deliveries_realtime.php?provider_id=${providerId}`, {
      method: 'GET',
    });
    return data;
  },

  async getMyWarehouseBookings() {
    const { data } = await request('/content/me/my-warehouse-bookings', { method: 'GET' });
    return data;
  },

  async getMyWarehouseInventory() {
    const { data } = await request('/content/me/my-warehouse-inventory', { method: 'GET' });
    return data;
  },

  async getMyWarehouseSpaces() {
    const { data } = await request('/content/me/my-warehouse-spaces', { method: 'GET' });
    return data;
  },

  async addWarehouseSpace(spaceData) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/me/my-warehouse-spaces', {
      method: 'POST',
      body: { ...spaceData, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async updateWarehouseSpace(id, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/me/my-warehouse-spaces/${id}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getMyWarehouseCustomers() {
    const { data } = await request('/content/me/my-warehouse-customers', { method: 'GET' });
    return data;
  },

  async getMyWarehouseEarnings() {
    const { data } = await request('/content/me/my-warehouse-earnings', { method: 'GET' });
    return data;
  },

  async withdrawWarehouseEarnings(amount) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/me/my-warehouse-earnings/withdraw', {
      method: 'POST',
      body: { amount, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getMyWarehouseDocuments() {
    const { data } = await request('/content/me/my-warehouse-documents', { method: 'GET' });
    return data;
  },

  async addWarehouseDocument(docData) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/me/my-warehouse-documents', {
      method: 'POST',
      body: { ...docData, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async updateWarehouseDocument(id, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/me/my-warehouse-documents/${id}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async deleteWarehouseDocument(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/me/my-warehouse-documents/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getMyWarehouseProfile() {
    const { data } = await request('/content/me/my-warehouse-profile', { method: 'GET' });
    return data;
  },

  async updateMyWarehouseProfile(profileData) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/me/my-warehouse-profile', {
      method: 'PUT',
      body: { ...profileData, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getMyWarehouseSubscription() {
    const { data } = await request('/content/me/my-warehouse-subscription', { method: 'GET' });
    return data;
  },

  async subscribeWarehousePlan(planData) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/me/my-warehouse-subscription', {
      method: 'POST',
      body: { ...planData, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getMyWarehouseRatings() {
    const { data } = await request('/content/me/my-warehouse-ratings', { method: 'GET' });
    return data;
  },

  async getMyWarehouseAnalytics() {
    const { data } = await request('/content/me/my-warehouse-analytics', { method: 'GET' });
    return data;
  },

  async confirmInbound(bookingId, data) {
    const csrf = await this.getCSRFToken();
    const res = await request('/content/me/warehouse/inbound/confirm', {
      method: 'POST',
      body: { booking_id: bookingId, ...data, csrf_token: csrf?.csrf_token || '' },
    });
    return res.data;
  },

  async approveOutbound(bookingId, data) {
    const csrf = await this.getCSRFToken();
    const res = await request('/content/me/warehouse/outbound/approve', {
      method: 'POST',
      body: { booking_id: bookingId, ...data, csrf_token: csrf?.csrf_token || '' },
    });
    return res.data;
  },

  async getMyDrivers() {
    const { data } = await request('/content/me/my-drivers', { method: 'GET' });
    return data;
  },

  async addDriver(name, phone, licenseNumber, region) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/me/my-drivers', {
      method: 'POST',
      body: {
        name,
        phone,
        license_number: licenseNumber,
        region,
        csrf_token: csrf?.csrf_token || '',
      },
    });
    return data;
  },

  async updateDriver(id, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/me/my-drivers/${id}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async deleteDriver(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/me/my-drivers/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getMyVehicles() {
    const { data } = await request('/content/me/my-vehicles', { method: 'GET' });
    return data;
  },

  async addVehicle(vehicleType, registrationNumber, model, capacityTonnes) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/me/my-vehicles', {
      method: 'POST',
      body: {
        vehicle_type: vehicleType,
        registration_number: registrationNumber,
        model,
        capacity_tonnes: capacityTonnes,
        csrf_token: csrf?.csrf_token || '',
      },
    });
    return data;
  },

  async updateVehicle(id, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/me/my-vehicles/${id}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async deleteVehicle(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/me/my-vehicles/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getDeliveryRequests() {
    const { data } = await request('/content/me/delivery-requests', { method: 'GET' });
    return data;
  },

  async acceptDeliveryRequest(orderId, details) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/me/delivery-requests/${orderId}/accept`, {
      method: 'POST',
      body: { ...details, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async declineDeliveryRequest(orderId) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/me/delivery-requests/${orderId}/decline`, {
      method: 'POST',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async updateDeliveryStatus(deliveryId, status) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/me/deliveries/${deliveryId}/status`, {
      method: 'PUT',
      body: { status, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getDeliveryHistory() {
    const { data } = await request('/content/me/delivery-history', { method: 'GET' });
    return data;
  },

  async getMyDeliveryTracking() {
    const { data } = await request('/content/me/delivery-tracking', { method: 'GET' });
    return data;
  },

  async getSellerDeliveryTracking() {
    const { data } = await request('/content/me/seller/delivery-tracking', { method: 'GET' });
    return data;
  },

  // ============ User-specific ============
  async getSavedAddresses() {
    const { data } = await request('/content/me/saved-addresses', { method: 'GET' });
    return data;
  },

  async getMyDocuments() {
    const { data } = await request('/content/me/my-documents', { method: 'GET' });
    return data;
  },

  async addDocument(documentType, documentUrl, documentNumber, issuedDate, expiryDate) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/me/my-documents', {
      method: 'POST',
      body: {
        document_type: documentType,
        document_url: documentUrl,
        document_number: documentNumber,
        issued_date: issuedDate,
        expiry_date: expiryDate,
        csrf_token: csrf?.csrf_token || '',
      },
    });
    return data;
  },

  async deleteDocument(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/me/my-documents/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async updateDocument(id, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/me/my-documents/${id}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getMyRatings() {
    const { data } = await request('/content/me/my-ratings', { method: 'GET' });
    return data;
  },

  async getMyEarnings() {
    const { data } = await request('/content/me/my-earnings', { method: 'GET' });
    return data;
  },

  async withdrawEarnings(amount) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/me/my-earnings/withdraw', {
      method: 'POST',
      body: { amount, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getMyAnalytics() {
    const { data } = await request('/content/me/my-analytics', { method: 'GET' });
    return data;
  },

  async getMyLogisticsProfile() {
    const { data } = await request('/content/me/my-profile', { method: 'GET' });
    return data;
  },

  async updateMyLogisticsProfile(updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/me/my-profile', {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getMyLogisticsSubscription() {
    const { data } = await request('/content/me/my-subscription', { method: 'GET' });
    return data;
  },

  async subscribeToPlan(planData) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/me/subscribe', {
      method: 'POST',
      body: { ...planData, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async promoteCompany(promoteData) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/me/promote', {
      method: 'POST',
      body: { ...promoteData, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getMyLogisticsNotifications() {
    const { data } = await request('/content/me/my-notifications', { method: 'GET' });
    return data;
  },

  async getMyEarningsSummary() {
    const { data } = await request('/content/me/my-earnings/summary', { method: 'GET' });
    return data;
  },

  // ============ Bulk Procurement Network ============

  async getBulkRequests(filters = {}) {
    const params = new URLSearchParams({ action: 'list_requests' });
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/bulk_procurement.php?${params.toString()}`, { method: 'GET' });
    return data;
  },

  async createBulkRequest(data) {
    const csrf = await this.getCSRFToken();
    const { data: res } = await request('/bulk_procurement.php', {
      method: 'POST',
      body: { action: 'create_request', ...data, csrf_token: csrf?.csrf_token || '' },
    });
    return res;
  },

  async getBulkRequest(id) {
    const { data } = await request(`/bulk_procurement.php?action=get_request&id=${id}`, {
      method: 'GET',
    });
    return data;
  },

  async getMyBulkRequests() {
    const { data } = await request('/bulk_procurement.php?action=my_requests', { method: 'GET' });
    return data;
  },

  async getMyBulkGroups() {
    const { data } = await request('/bulk_procurement.php?action=my_groups', { method: 'GET' });
    return data;
  },

  async getAvailableBulkRequests(filters = {}) {
    const params = new URLSearchParams({ action: 'available_for_seller' });
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/bulk_procurement.php?${params.toString()}`, { method: 'GET' });
    return data;
  },

  async joinBulkRequest(requestId, data) {
    const csrf = await this.getCSRFToken();
    const { data: res } = await request(`/bulk_procurement.php/${requestId}/join`, {
      method: 'POST',
      body: { ...data, csrf_token: csrf?.csrf_token || '' },
    });
    return res;
  },

  async joinBuyerGroup(requestId, data) {
    const csrf = await this.getCSRFToken();
    const { data: res } = await request(`/bulk_procurement.php/${requestId}/join_buyer`, {
      method: 'POST',
      body: { ...data, csrf_token: csrf?.csrf_token || '' },
    });
    return res;
  },

  async withdrawFromGroup(memberId) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/bulk_procurement.php/members/${memberId}/withdraw`, {
      method: 'POST',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async confirmBulkGroup(requestId) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/bulk_procurement.php/${requestId}/confirm`, {
      method: 'POST',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async updateBulkRequest(id, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/bulk_procurement.php/${id}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async cancelBulkRequest(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/bulk_procurement.php/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async createBulkContract(requestId, data) {
    const csrf = await this.getCSRFToken();
    const { data: res } = await request(`/bulk_procurement.php/${requestId}/contract`, {
      method: 'POST',
      body: { ...data, csrf_token: csrf?.csrf_token || '' },
    });
    return res;
  },

  async getBulkContract(id) {
    const { data } = await request(`/bulk_procurement.php/contracts/${id}`, { method: 'GET' });
    return data;
  },

  async recordBulkInspection(contractId, data) {
    const csrf = await this.getCSRFToken();
    const { data: res } = await request(`/bulk_procurement.php/contracts/${contractId}/inspect`, {
      method: 'POST',
      body: { ...data, csrf_token: csrf?.csrf_token || '' },
    });
    return res;
  },

  async releaseBulkPayment(paymentId) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/bulk_procurement.php/payments/${paymentId}/release`, {
      method: 'POST',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  getBulkProcurementStreamUrl() {
    const token = getTokenFromCache();
    const base = getBaseUrl();
    return `${base}/bulk_procurement_realtime.php?token=${encodeURIComponent(token || '')}`;
  },

  // ============ Super Admin ============
  async getSuperAdminStats() {
    const { data } = await request('/superadmin/stats', { method: 'GET' });
    return data;
  },

  getSuperAdminRealtime() {
    const token = getTokenFromCache();
    const base = getBaseUrl();
    return `${base}/superadmin/realtime?token=${encodeURIComponent(token || '')}`;
  },

  async getSuperAdminUsers(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/superadmin/users?${params.toString()}`, { method: 'GET' });
    return data;
  },

  async updateSuperAdminUser(userId, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/users/${userId}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async deleteSuperAdminUser(userId) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/users/${userId}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getSuperAdminOrders(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/superadmin/orders?${params.toString()}`, { method: 'GET' });
    return data;
  },

  async updateSuperAdminOrder(orderId, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/orders/${orderId}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getSuperAdminProducts(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/superadmin/products?${params.toString()}`, { method: 'GET' });
    return data;
  },

  async updateSuperAdminProduct(productId, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/products/${productId}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async deleteSuperAdminProduct(productId) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/products/${productId}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getSuperAdminAnalytics(days = 30) {
    const { data } = await request(`/superadmin/analytics?days=${days}`, { method: 'GET' });
    return data;
  },

  async getSuperAdminSettings() {
    const { data } = await request('/superadmin/settings', { method: 'GET' });
    return data;
  },

  async updateSuperAdminSettings(settings) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/settings', {
      method: 'PUT',
      body: { settings, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getSuperAdminNotifications() {
    const { data } = await request('/superadmin/notifications', { method: 'GET' });
    return data;
  },

  async sendSuperAdminNotification(notificationData) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/notifications', {
      method: 'POST',
      body: { ...notificationData, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getSuperAdminTickets(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/superadmin/support-tickets?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async updateSuperAdminTicket(ticketId, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/support-tickets/${ticketId}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getSuperAdminWithdrawals(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/superadmin/withdrawals?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async updateSuperAdminWithdrawal(withdrawalId, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/withdrawals/${withdrawalId}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getSuperAdminReportedProducts() {
    const { data } = await request('/superadmin/reported-products', { method: 'GET' });
    return data;
  },

  async updateSuperAdminReportedProduct(reportId, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/reported-products/${reportId}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  // ============ Admin Disputes ============
  async getAdminDisputes(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/content/admin/disputes?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async getAdminDispute(id) {
    const { data } = await request(`/content/admin/disputes/${id}`, { method: 'GET' });
    return data;
  },

  async updateAdminDispute(id, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/disputes/${id}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getSuperAdminAuditLogs(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/superadmin/audit-logs?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async createSuperAdminAuditLog(logData) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/audit-logs', {
      method: 'POST',
      body: { ...logData, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getSuperAdminApplications(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/superadmin/applications?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async updateSuperAdminApplication(type, appId, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/applications/${type}/${appId}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getSuperAdminHealth() {
    const { data } = await request('/superadmin/health', { method: 'GET' });
    return data;
  },

  async getSuperAdminHealthDetailed() {
    const { data } = await request('/superadmin/health/detailed', { method: 'GET' });
    return data;
  },

  async getSuperAdminSlowQueries(limit = 50) {
    const { data } = await request(`/superadmin/health/slow-queries?limit=${limit}`, {
      method: 'GET',
    });
    return data;
  },

  async getSuperAdminHealthHistory(hours = 24) {
    const { data } = await request(`/superadmin/health/history?hours=${hours}`, { method: 'GET' });
    return data;
  },

  async bulkUpdateUsers(ids, action) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/bulk/users', {
      method: 'POST',
      body: { ids, action, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async bulkUpdateProducts(ids, action) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/bulk/products', {
      method: 'POST',
      body: { ids, action, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async bulkUpdateOrders(ids, action) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/bulk/orders', {
      method: 'POST',
      body: { ids, action, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async exportUsers(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/superadmin/export/users?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async exportOrders(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/superadmin/export/orders?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async exportProducts(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/superadmin/export/products?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async exportFinancial(days = 30) {
    const { data } = await request(`/superadmin/export/financial?days=${days}`, { method: 'GET' });
    return data;
  },

  async exportAuditLogs(limit = 5000) {
    const { data } = await request(`/superadmin/export/audit?limit=${limit}`, { method: 'GET' });
    return data;
  },

  async previewImport(entity_type, data) {
    const csrf = await this.getCSRFToken();
    const { data: result } = await request('/superadmin/import/preview', {
      method: 'POST',
      body: { entity_type, data, csrf_token: csrf?.csrf_token || '' },
    });
    return result;
  },

  async confirmImport(entity_type, data) {
    const csrf = await this.getCSRFToken();
    const { data: result } = await request('/superadmin/import/confirm', {
      method: 'POST',
      body: { entity_type, data, csrf_token: csrf?.csrf_token || '' },
    });
    return result;
  },

  async getSubAdmins(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/superadmin/sub-admins?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async createSubAdmin(payload) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/sub-admins', {
      method: 'POST',
      body: { ...payload, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async updateSubAdmin(id, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/sub-admins/${id}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async deleteSubAdmin(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/sub-admins/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getApiKeys() {
    const { data } = await request('/superadmin/api-keys', { method: 'GET' });
    return data;
  },

  async createApiKey(payload) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/api-keys', {
      method: 'POST',
      body: { ...payload, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async updateApiKey(id, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/api-keys/${id}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async deleteApiKey(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/api-keys/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getBackups() {
    const { data } = await request('/superadmin/backups', { method: 'GET' });
    return data;
  },

  async createBackup(type = 'full') {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/backups', {
      method: 'POST',
      body: { type, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async restoreBackup(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/backups/${id}/restore`, {
      method: 'POST',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async deleteBackup(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/backups/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getSuperAdminSettingsFull() {
    const { data } = await request('/superadmin/settings', { method: 'GET' });
    return data;
  },

  async updateSuperAdminSettingsFull(settings) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/settings', {
      method: 'PUT',
      body: { settings, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getEmailTemplates() {
    const { data } = await request('/superadmin/email-templates', { method: 'GET' });
    return data;
  },

  async saveEmailTemplate(template) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/email-templates', {
      method: 'POST',
      body: { ...template, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async saveRateLimit(limit) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/rate-limits', {
      method: 'POST',
      body: { ...limit, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async deleteRateLimit(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/rate-limits/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getSuperAdminAuditLogsFiltered(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/superadmin/audit-logs?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  // Session Management
  async getAdminSessions(active_only = false) {
    const params = new URLSearchParams({ active_only });
    const { data } = await request(`/superadmin/sessions?${params.toString()}`, { method: 'GET' });
    return data;
  },

  async forceLogoutSession(sessionId) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/sessions/${sessionId}/force-logout`, {
      method: 'POST',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async logoutAllSessions(exclude_current = true) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/sessions/logout-all', {
      method: 'POST',
      body: { exclude_current, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getSessionSettings() {
    const { data } = await request('/superadmin/sessions/settings', { method: 'GET' });
    return data;
  },

  async updateSessionSettings(settings) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/sessions/settings', {
      method: 'PUT',
      body: { ...settings, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  // MFA Enforcement
  async getMfaSettings() {
    const { data } = await request('/superadmin/mfa/settings', { method: 'GET' });
    return data;
  },

  async updateMfaPolicy(policy) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/mfa/settings', {
      method: 'PUT',
      body: { ...policy, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async enforceMfa(adminId) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/mfa/enforce/${adminId}`, {
      method: 'POST',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  // Admin Notifications
  async getAdminNotifications(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/superadmin/notifications?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async markNotificationRead(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/notifications/${id}/read`, {
      method: 'PUT',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async markAllNotificationsRead() {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/notifications/read-all', {
      method: 'PUT',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async dismissNotification(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/notifications/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async createAdminNotification(notification) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/notifications', {
      method: 'POST',
      body: { ...notification, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getUnreadNotificationCount() {
    const { data } = await request('/superadmin/notifications/unread-count', { method: 'GET' });
    return data;
  },

  // Scheduled Backups
  async getScheduledBackups() {
    const { data } = await request('/superadmin/scheduled-backups', { method: 'GET' });
    return data;
  },

  async createScheduledBackup(schedule) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/scheduled-backups', {
      method: 'POST',
      body: { ...schedule, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async updateScheduledBackup(id, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/scheduled-backups/${id}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async deleteScheduledBackup(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/scheduled-backups/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  // Dashboard Widgets
  async getDashboardWidgets() {
    const { data } = await request('/superadmin/dashboard/widgets', { method: 'GET' });
    return data;
  },

  async updateDashboardWidgets(widgets) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/dashboard/widgets', {
      method: 'PUT',
      body: { widgets, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  // Audit Log Search
  async searchAuditLogs(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/superadmin/audit-logs/search?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async exportAuditLogsFiltered(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/superadmin/audit-logs/export?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  // Audit Retention
  async getAuditRetentionSettings() {
    const { data } = await request('/superadmin/audit-retention', { method: 'GET' });
    return data;
  },

  async updateAuditRetentionSettings(settings) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/audit-retention', {
      method: 'PUT',
      body: { settings, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  // IP Whitelist
  async getIpWhitelist() {
    const { data } = await request('/superadmin/ip-whitelist', { method: 'GET' });
    return data;
  },

  async addIpWhitelist(ip_address, description) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/ip-whitelist', {
      method: 'POST',
      body: { ip_address, description, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async removeIpWhitelist(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/ip-whitelist/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async toggleIpWhitelist(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/ip-whitelist/${id}/toggle`, {
      method: 'PUT',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  // Login History
  async getLoginHistory(adminId) {
    const { data } = await request(`/superadmin/login-history/${adminId}`, { method: 'GET' });
    return data;
  },

  async getAllLoginHistory(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/superadmin/login-history?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  // Permission Templates
  async getPermissionTemplates() {
    const { data } = await request('/superadmin/permission-templates', { method: 'GET' });
    return data;
  },

  async createPermissionTemplate(template) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/permission-templates', {
      method: 'POST',
      body: { ...template, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async deletePermissionTemplate(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/permission-templates/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  // Scheduled Reports
  async getScheduledReports() {
    const { data } = await request('/superadmin/scheduled-reports', { method: 'GET' });
    return data;
  },

  async createScheduledReport(report) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/scheduled-reports', {
      method: 'POST',
      body: { ...report, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async updateScheduledReport(id, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/scheduled-reports/${id}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async deleteScheduledReport(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/scheduled-reports/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  // User Activity Timeline
  async getUserActivity(userId, limit = 50) {
    const { data } = await request(`/superadmin/user-activity/${userId}?limit=${limit}`, {
      method: 'GET',
    });
    return data;
  },

  getSuperAdminRealtimeMetrics() {
    const token = getTokenFromCache();
    const base = getBaseUrl();
    return `${base}/superadmin/realtime-metrics?token=${encodeURIComponent(token || '')}`;
  },

  // Soft Delete / Trash
  async trashItem(entityType, id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/trash/${entityType}/${id}`, {
      method: 'POST',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getTrash(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params.append(k, v);
    });
    const { data } = await request(`/superadmin/trash?${params.toString()}`, { method: 'GET' });
    return data;
  },

  async restoreTrashItem(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/trash/${id}/restore`, {
      method: 'POST',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async permanentDelete(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/trash/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async purgeExpiredTrash() {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/trash/expire', {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async archiveAuditLogs(days = 90) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/audit-logs/archive', {
      method: 'POST',
      body: { days, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getWebhooks() {
    const { data } = await request('/superadmin/webhooks', { method: 'GET' });
    return data;
  },

  async createWebhook(webhook) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/superadmin/webhooks', {
      method: 'POST',
      body: { ...webhook, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async deleteWebhook(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/webhooks/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getWebhookDeliveries(webhookId, status, limit = 50, offset = 0) {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (webhookId) params.append('webhook_id', webhookId);
    if (status) params.append('status', status);
    const { data } = await request(`/superadmin/webhook-deliveries?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async getWebhookDeliveryStats(webhookId) {
    const { data } = await request(`/superadmin/webhook-deliveries/stats?webhook_id=${webhookId}`, {
      method: 'GET',
    });
    return data;
  },

  async retryWebhookDelivery(deliveryId) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/webhook-deliveries/${deliveryId}/retry`, {
      method: 'POST',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async deleteWebhookDelivery(deliveryId) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/superadmin/webhook-deliveries/${deliveryId}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getAdminEmailTemplates() {
    const { data } = await request('/templates/email', { method: 'GET' });
    return data;
  },
  async getAdminEmailTemplate(key) {
    const { data } = await request(`/templates/email/${encodeURIComponent(key)}`, {
      method: 'GET',
    });
    return data;
  },
  async saveAdminEmailTemplate(template) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/templates/email', {
      method: 'POST',
      body: { ...template, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async getAdminSmsTemplates() {
    const { data } = await request('/templates/sms', { method: 'GET' });
    return data;
  },
  async getAdminSmsTemplate(key) {
    const { data } = await request(`/templates/sms/${encodeURIComponent(key)}`, { method: 'GET' });
    return data;
  },
  async saveAdminSmsTemplate(template) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/templates/sms', {
      method: 'POST',
      body: { ...template, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async deleteAdminSmsTemplate(key) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/templates/sms/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  // ============ Admin Finance / Support ============
  async getAdminWithdrawals() {
    const { data } = await request('/content/admin/withdrawals', { method: 'GET' });
    return data;
  },
  async getAdminSupportTickets() {
    const { data } = await request('/content/admin/support-tickets', { method: 'GET' });
    return data;
  },
  async updateSupportTicket(id, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/support-tickets/${id}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getAdminCategories() {
    const { data } = await request('/content/admin/categories', { method: 'GET' });
    return data;
  },
  async createAdminCategory(category) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/admin/categories', {
      method: 'POST',
      body: { ...category, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async updateAdminCategory(id, category) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/categories/${id}`, {
      method: 'PUT',
      body: { ...category, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async deleteAdminCategory(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/categories/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async getAdminAttributes() {
    const { data } = await request('/content/admin/attributes', { method: 'GET' });
    return data;
  },
  async createAdminAttribute(attr) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/admin/attributes', {
      method: 'POST',
      body: { ...attr, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async updateAdminAttribute(id, attr) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/attributes/${id}`, {
      method: 'PUT',
      body: { ...attr, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async deleteAdminAttribute(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/attributes/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async mapAttributeToCategory(categoryId, mapping) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/categories/${categoryId}/attributes`, {
      method: 'POST',
      body: { ...mapping, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async unmapAttributeFromCategory(categoryId, attributeId) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(
      `/content/admin/categories/${categoryId}/attributes/${attributeId}`,
      {
        method: 'DELETE',
        body: { csrf_token: csrf?.csrf_token || '' },
      }
    );
    return data;
  },
  async getCategoryAttributes(categoryId) {
    const { data } = await request(`/content/admin/categories/${categoryId}/attributes`, {
      method: 'GET',
    });
    return data;
  },

  async getAdminPromotions(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/admin/promotions?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },
  async createAdminPromotion(promo) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/admin/promotions', {
      method: 'POST',
      body: { ...promo, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async updateAdminPromotion(id, promo) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/promotions/${id}`, {
      method: 'PUT',
      body: { ...promo, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async deleteAdminPromotion(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/promotions/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async getAdminCoupons(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/admin/coupons?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },
  async createAdminCoupon(coupon) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/admin/coupons', {
      method: 'POST',
      body: { ...coupon, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async updateAdminCoupon(id, coupon) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/coupons/${id}`, {
      method: 'PUT',
      body: { ...coupon, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async deleteAdminCoupon(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/coupons/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getAdminReviews(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/admin/reviews?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },
  async moderateAdminReview(id, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/reviews/${id}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async deleteAdminReview(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/reviews/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getAdminContracts(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/admin/contracts?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },
  async updateAdminContract(id, updates) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/contracts/${id}`, {
      method: 'PUT',
      body: { ...updates, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async cancelAdminContract(id, reason) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/contracts/${id}/cancel`, {
      method: 'POST',
      body: { reason, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getAdminBlogPosts(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/admin/blog-posts?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },
  async createAdminBlogPost(post) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/admin/blog-posts', {
      method: 'POST',
      body: { ...post, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async updateAdminBlogPost(id, post) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/blog-posts/${id}`, {
      method: 'PUT',
      body: { ...post, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async deleteAdminBlogPost(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/blog-posts/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getAdminFAQs(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/admin/faqs?${params.toString()}`, { method: 'GET' });
    return data;
  },
  async createAdminFAQ(faq) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/admin/faqs', {
      method: 'POST',
      body: { ...faq, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async updateAdminFAQ(id, faq) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/faqs/${id}`, {
      method: 'PUT',
      body: { ...faq, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async deleteAdminFAQ(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/faqs/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getAdminTestimonials(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/admin/testimonials?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },
  async createAdminTestimonial(testimonial) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/admin/testimonials', {
      method: 'POST',
      body: { ...testimonial, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async updateAdminTestimonial(id, testimonial) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/testimonials/${id}`, {
      method: 'PUT',
      body: { ...testimonial, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async deleteAdminTestimonial(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/testimonials/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getAdminPartners(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/admin/partners?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },
  async createAdminPartner(partner) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/admin/partners', {
      method: 'POST',
      body: { ...partner, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async updateAdminPartner(id, partner) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/partners/${id}`, {
      method: 'PUT',
      body: { ...partner, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async deleteAdminPartner(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/partners/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getAdminCommissions(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/admin/commissions?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async getAdminFeaturedListings() {
    const { data } = await request('/content/admin/featured-listings', { method: 'GET' });
    return data;
  },
  async createAdminFeaturedListing(listing) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/admin/featured-listings', {
      method: 'POST',
      body: { ...listing, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async updateAdminFeaturedListing(id, listing) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/featured-listings/${id}`, {
      method: 'PUT',
      body: { ...listing, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async deleteAdminFeaturedListing(id) {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/featured-listings/${id}`, {
      method: 'DELETE',
      body: { csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getAdminSettings() {
    const { data } = await request('/content/admin/settings', { method: 'GET' });
    return data;
  },
  async updateAdminSettings(settings) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/admin/settings', {
      method: 'PUT',
      body: { ...settings, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },
  async getAdminReports(filters = {}) {
    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.start_date) params.set('start_date', filters.start_date);
    if (filters.end_date) params.set('end_date', filters.end_date);
    const { data } = await request(`/content/admin/reports?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async getMyVendorProducts(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/me/my-vendor-products?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async updateMyProduct(productId, data) {
    const { data: responseData } = await request(`/content/me/products/${productId}`, {
      method: 'PUT',
      body: data,
    });
    return responseData;
  },

  async deleteMyProduct(productId) {
    const { data } = await request(`/content/me/products/${productId}`, {
      method: 'DELETE',
    });
    return data;
  },

  async getMyVendorOrders(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/me/my-vendor-orders?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async getMyVendorCommissions(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/me/my-vendor-commissions?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async getMyVendorCommissionSummary() {
    const { data } = await request('/content/me/my-vendor-commissions/summary', { method: 'GET' });
    return data;
  },

  async getMyVendorWithdrawals(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/me/my-vendor-withdrawals?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async requestVendorWithdrawal(data) {
    const csrf = await this.getCSRFToken();
    const { data: res } = await request('/content/me/my-vendor-withdrawals/request', {
      method: 'POST',
      body: { ...data, csrf_token: csrf?.csrf_token || '' },
    });
    return res;
  },

  // ============ System Monitoring ============
  async getSuperAdminActivityFeed(limit = 50, offset = 0) {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    const { data } = await request(`/superadmin/monitoring/activity-feed?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async getSuperAdminApiStats(hours = 24) {
    const { data } = await request(`/superadmin/monitoring/api-stats?hours=${hours}`, {
      method: 'GET',
    });
    return data;
  },

  async getSuperAdminScheduledTasks() {
    const { data } = await request('/superadmin/monitoring/scheduled-tasks', { method: 'GET' });
    return data;
  },

  async getSuperAdminEnhancedMetrics() {
    const { data } = await request('/superadmin/monitoring/enhanced-metrics', { method: 'GET' });
    return data;
  },

  async getAdminAuditLogs(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/admin/audit-logs?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async getAdminVendorReports(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/admin/vendor-reports?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async approveVendorApplication(applicationId, notes = '') {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/applications/${applicationId}/approve`, {
      method: 'POST',
      body: { notes, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async rejectVendorApplication(applicationId, notes = '') {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/applications/${applicationId}/reject`, {
      method: 'POST',
      body: { notes, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getAdminVendorSettings() {
    const { data } = await request('/content/admin/vendor-settings', { method: 'GET' });
    return data;
  },

  async updateAdminVendorSettings(settings) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/admin/vendor-settings', {
      method: 'PUT',
      body: { settings, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async getAdminTransactions(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/admin/transactions?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async getAdminInvoices(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/admin/invoices?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async createInvoice(data) {
    const csrf = await this.getCSRFToken();
    const { data: res } = await request('/content/admin/invoices', {
      method: 'POST',
      body: { ...data, csrf_token: csrf?.csrf_token || '' },
    });
    return res;
  },

  async getFinancialStatements(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const { data } = await request(`/content/admin/financial-statements?${params.toString()}`, {
      method: 'GET',
    });
    return data;
  },

  async getPaymentGateways() {
    const { data } = await request('/superadmin/payment-gateways', { method: 'GET' });
    return data;
  },

  async updatePaymentGateway(gatewayId, data) {
    const csrf = await this.getCSRFToken();
    const { data: res } = await request(`/superadmin/payment-gateways/${gatewayId}`, {
      method: 'PUT',
      body: { ...data, csrf_token: csrf?.csrf_token || '' },
    });
    return res;
  },

  async approveRefund(refundId, notes = '') {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/refunds/${refundId}/approve`, {
      method: 'POST',
      body: { notes, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async rejectRefund(refundId, notes = '') {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/refunds/${refundId}/reject`, {
      method: 'POST',
      body: { notes, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async approveWithdrawal(withdrawalId, notes = '') {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/withdrawals/${withdrawalId}/approve`, {
      method: 'POST',
      body: { notes, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async rejectWithdrawal(withdrawalId, notes = '') {
    const csrf = await this.getCSRFToken();
    const { data } = await request(`/content/admin/withdrawals/${withdrawalId}/reject`, {
      method: 'POST',
      body: { notes, csrf_token: csrf?.csrf_token || '' },
    });
    return data;
  },

  async bulkApprovePayouts(withdrawalIds) {
    const csrf = await this.getCSRFToken();
    const { data } = await request('/content/admin/payouts/bulk', {
      method: 'POST',
      body: {
        withdrawal_ids: withdrawalIds,
        action: 'approve',
        csrf_token: csrf?.csrf_token || '',
      },
    });
    return data;
  },

  async exportTransactions() {
    const url = '/content/admin/export/transactions';
    window.open(url, '_blank');
  },

  async exportPayouts() {
    const url = '/content/admin/export/payouts';
    window.open(url, '_blank');
  },

  async exportCommissions() {
    const url = '/content/admin/export/commissions';
    window.open(url, '_blank');
  },

  async exportRefunds() {
    const url = '/content/admin/export/refunds';
    window.open(url, '_blank');
  },
};

export default api;
