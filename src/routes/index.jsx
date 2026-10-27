import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ROLES } from '../config/roles'
import SuperAdminLayout from '../layouts/SuperAdminLayout'
import RequireSuperAdmin from '../components/RequireSuperAdmin'

import Home from '../pages/Home'
import Products from '../pages/Products'
import ProductDetail from '../pages/ProductDetail'
import Cart from '../pages/Cart'
import Checkout from '../pages/Checkout'
import SellerPaymentSettings from '../pages/SellerPaymentSettings'
import Categories from '../pages/Categories'
import Sellers from '../pages/Sellers'
import About from '../pages/About'
import Contact from '../pages/Contact'
import LiveMarketPrices from '../pages/LiveMarketPrices'
import CommodityExchange from '../pages/CommodityExchange'
import FarmerVerification from '../pages/FarmerVerification'
import InventoryPage from '../pages/InventoryPage'
import InwardOutwardPage from '../pages/InwardOutwardPage'
import StorageServicesPage from '../pages/StorageServicesPage'
import VendorApplicationsPage from '../pages/VendorApplicationsPage'
import SuspendedVendorsPage from '../pages/SuspendedVendorsPage'
import VendorReportsPage from '../pages/VendorReportsPage'
import ActiveDeliveriesPage from '../pages/ActiveDeliveriesPage'
import DriversPage from '../pages/DriversPage'
import RoutesPage from '../pages/RoutesPage'
import UserManagementPage from '../pages/UserManagementPage'
import AdminPanelPage from '../pages/AdminPanelPage'
import AdvertisementsPage from '../pages/AdvertisementsPage'
import AuditLogsPage from '../pages/AuditLogsPage'
import SecurityPage from '../pages/SecurityPage'
import SuperAdminSettings from '../pages/SuperAdminSettings'
import SuperAdminHome from '../pages/superadmin/SuperAdminHome'
import SuperAdminUsers from '../pages/superadmin/SuperAdminUsers'
import SuperAdminProducts from '../pages/superadmin/SuperAdminProducts'
import SuperAdminOrders from '../pages/superadmin/SuperAdminOrders'
import SuperAdminSubAdmins from '../pages/superadmin/SuperAdminSubAdmins'
import SuperAdminAudit from '../pages/superadmin/SuperAdminAudit'
import SuperAdminApiKeys from '../pages/superadmin/SuperAdminApiKeys'
import SuperAdminBackups from '../pages/superadmin/SuperAdminBackups'
import SuperAdminHealth from '../pages/superadmin/SuperAdminHealth'
import SuperAdminSettingsEnhanced from '../pages/superadmin/SuperAdminSettings'
import SuperAdminExport from '../pages/superadmin/SuperAdminExport'
import SuperAdminSessions from '../pages/superadmin/SuperAdminSessions'
import SuperAdminMfa from '../pages/superadmin/SuperAdminMfa'
import SuperAdminNotifications from '../pages/superadmin/SuperAdminNotifications'
import SuperAdminUserActivity from '../pages/superadmin/SuperAdminUserActivity'
import SuperAdminSecurity from '../pages/superadmin/SuperAdminSecurity'
import SuperAdminReports from '../pages/superadmin/SuperAdminReports'
import SuperAdminTrash from '../pages/superadmin/SuperAdminTrash'
import SuperAdminWebhooks from '../pages/superadmin/SuperAdminWebhooks'
import SuperAdminAnalytics from '../pages/superadmin/SuperAdminAnalytics'
import SuperAdminActivityFeed from '../pages/superadmin/SuperAdminActivityFeed'
import SuperAdminApiStats from '../pages/superadmin/SuperAdminApiStats'
import SuperAdminScheduledTasks from '../pages/superadmin/SuperAdminScheduledTasks'
import SuperAdminEnhancedMetrics from '../pages/superadmin/SuperAdminEnhancedMetrics'
import ProductApprovalsPage from '../pages/ProductApprovalsPage'
import ReportedProductsPage from '../pages/ReportedProductsPage'
import CustomersPage from '../pages/CustomersPage'
import WithdrawalsPage from '../pages/WithdrawalsPage'
import CustomerDashboard from '../pages/CustomerDashboard'
import SellerDashboard from '../pages/SellerDashboard'
import MarketplaceAdminDashboard from '../pages/MarketplaceAdminDashboard'
import VendorAdminDashboard from '../pages/VendorAdminDashboard'
import WarehouseManagerDashboard from '../pages/WarehouseManagerDashboard'
import TransportManagerDashboard from '../pages/TransportManagerDashboard'
import LogisticsDashboard from '../pages/LogisticsDashboard'
import LogisticsAvailableDeliveries from '../pages/LogisticsAvailableDeliveries'
import LogisticsActiveDeliveries from '../pages/LogisticsActiveDeliveries'
import LogisticsDeliveryHistory from '../pages/LogisticsDeliveryHistory'
import LogisticsVehicles from '../pages/LogisticsVehicles'
import LogisticsDrivers from '../pages/LogisticsDrivers'
import LogisticsEarnings from '../pages/LogisticsEarnings'
import LogisticsDocuments from '../pages/LogisticsDocuments'
import LogisticsProfile from '../pages/LogisticsProfile'
import LogisticsSubscription from '../pages/LogisticsSubscription'
import LogisticsRatings from '../pages/LogisticsRatings'
import LogisticsAnalytics from '../pages/LogisticsAnalytics'
import AdminLogisticsDocuments from '../pages/AdminLogisticsDocuments'
import LogisticsApplicationsPage from '../pages/LogisticsApplicationsPage'
import AdminContentModerationPage from '../pages/AdminContentModerationPage'
import AdminChatModerationPage from '../pages/AdminChatModerationPage'
import WarehouseDashboard from '../pages/WarehouseDashboard'
import WarehouseStorageSpaces from '../pages/WarehouseStorageSpaces'
import WarehouseInbound from '../pages/WarehouseInbound'
import WarehouseOutbound from '../pages/WarehouseOutbound'
import WarehouseBookings from '../pages/WarehouseBookings'
import WarehouseCustomers from '../pages/WarehouseCustomers'
import WarehouseEarnings from '../pages/WarehouseEarnings'
import WarehouseDocuments from '../pages/WarehouseDocuments'
import WarehouseProfile from '../pages/WarehouseProfile'
import WarehouseSubscription from '../pages/WarehouseSubscription'
import WarehouseRatings from '../pages/WarehouseRatings'
import WarehouseAnalytics from '../pages/WarehouseAnalytics'
import WarehousePromote from '../pages/WarehousePromote'
import TransportMarketplace from '../pages/TransportMarketplace'
import CustomerSupportDashboard from '../pages/CustomerSupportDashboard'
import FinanceAdminDashboard from '../pages/FinanceAdminDashboard'
import FinanceNtzsPage from '../pages/FinanceNtzsPage'
import BillPaymentPage from '../pages/BillPaymentPage'
import AdminTaxPage from '../pages/AdminTaxPage'
import TransactionsPage from '../pages/TransactionsPage'
import VendorPayoutsPage from '../pages/VendorPayoutsPage'
import CommissionsPage from '../pages/CommissionsPage'
import RefundsPage from '../pages/RefundsPage'
import MyOrders from '../pages/MyOrders'
import Wishlist from '../pages/Wishlist'
import Messages from '../pages/Messages'
import ChatThread from '../pages/ChatThread'
import Notifications from '../pages/Notifications'
import Profile from '../pages/Profile'
import Settings from '../pages/Settings'
import MyReviews from '../pages/MyReviews'
import PaymentMethods from '../pages/PaymentMethods'
import SavedAddresses from '../pages/SavedAddresses'
import OrderTracking from '../pages/OrderTracking'
import Receipt from '../pages/Receipt'
import SellProducts from '../pages/SellProducts'
import SearchResults from '../pages/SearchResults'
import BulkPurchase from '../pages/BulkPurchase'
import AuctionSystem from '../pages/AuctionSystem'
import AIAssistant from '../pages/AIAssistant'
import AIDashboard from '../pages/AIDashboard'
import QualityInspection from '../pages/QualityInspection'
import EscrowPayment from '../pages/EscrowPayment'
import SmartLogistics from '../pages/SmartLogistics'
import CreditFinancing from '../pages/CreditFinancing'
import WeatherFarming from '../pages/WeatherFarming'
import ExportModule from '../pages/ExportModule'
import BusinessAnalytics from '../pages/BusinessAnalytics'
import LoyaltyReferral from '../pages/LoyaltyReferral'
import RegionalMarketplace from '../pages/RegionalMarketplace'
import AdminDisputesPage from '../pages/AdminDisputesPage'
import DisputeResolution from '../pages/DisputeResolution'
import Sustainability from '../pages/Sustainability'
import GrainExchangeDashboard from '../pages/GrainExchangeDashboard'
import Seeds from '../pages/Seeds'
import Fertilizers from '../pages/Fertilizers'
import FarmEquipment from '../pages/FarmEquipment'
import StorageServices from '../pages/StorageServices'
import LogisticsServices from '../pages/LogisticsServices'
import AgriculturalFinancing from '../pages/AgriculturalFinancing'
import CropInsurance from '../pages/CropInsurance'
import ExportServices from '../pages/ExportServices'
import Login from '../pages/Login'
import Register from '../pages/Register'
import LogisticsRegister from '../pages/LogisticsRegister'
import WarehouseRegister from '../pages/WarehouseRegister'
import ForgotPassword from '../pages/ForgotPassword'
import FAQ from '../pages/FAQ'
import Terms from '../pages/Terms'
import PrivacyPolicy from '../pages/PrivacyPolicy'
import ReturnPolicy from '../pages/ReturnPolicy'
import Careers from '../pages/Careers'
import Blog from '../pages/Blog'
import HelpCenter from '../pages/HelpCenter'
import UssdMarketplace from '../pages/UssdMarketplace'
import Cooperatives from '../pages/Cooperatives'
import ContractFarming from '../pages/ContractFarming'
import PriceForecasting from '../pages/PriceForecasting'
import WarehouseBooking from '../pages/WarehouseBooking'
import GovernmentDashboard from '../pages/GovernmentDashboard'
import SubscriptionPlans from '../pages/SubscriptionPlans'
import FeaturedListings from '../pages/FeaturedListings'
import RevenueDashboard from '../pages/RevenueDashboard'
import MarketIntelligence from '../pages/MarketIntelligence'
import AdminVendorAnalyticsPage from '../pages/AdminVendorAnalyticsPage'
import AdminCategoriesPage from '../pages/AdminCategoriesPage'
import AdminPromotionsPage from '../pages/AdminPromotionsPage'
import AdminTemplatesPage from '../pages/AdminTemplatesPage'
import AdminReportsPage from '../pages/AdminReportsPage'
import AdminCommissionsPage from '../pages/AdminCommissionsPage'
import AdminFeaturedListingsPage from '../pages/AdminFeaturedListingsPage'
import AdminSettingsPage from '../pages/AdminSettingsPage'
import AdminReviewsPage from '../pages/AdminReviewsPage'
import AdminContractsPage from '../pages/AdminContractsPage'
import AdminBlogPage from '../pages/AdminBlogPage'
import AdminFAQsPage from '../pages/AdminFAQsPage'
import AdminTestimonialsPage from '../pages/AdminTestimonialsPage'
import AdminPartnersPage from '../pages/AdminPartnersPage'
import VendorVerificationPage from '../pages/VendorVerificationPage'
import VendorVerificationDetailPage from '../pages/VendorVerificationDetailPage'
import VendorSettingsPage from '../pages/VendorSettingsPage'
import VendorContractsPage from '../pages/VendorContractsPage'
import VendorCommunicationPage from '../pages/VendorCommunicationPage'
import VendorBulkActionsPage from '../pages/VendorBulkActionsPage'
import VendorAuditLogsPage from '../pages/VendorAuditLogsPage'
import VendorSubscriptionPlansPage from '../pages/VendorSubscriptionPlansPage'
import VendorProductsPage from '../pages/VendorProductsPage'
import VendorOrdersPage from '../pages/VendorOrdersPage'
import VendorCommissionPage from '../pages/VendorCommissionPage'
import VendorWithdrawalsPage from '../pages/VendorWithdrawalsPage'
import InvoicesPage from '../pages/InvoicesPage'
import FinancialStatementsPage from '../pages/FinancialStatementsPage'
import PaymentGatewaysPage from '../pages/PaymentGatewaysPage'
import FulfillmentDashboard from '../pages/FulfillmentDashboard'
import BulkProcurementDashboard from '../pages/BulkProcurementDashboard'
import CreateBulkRequest from '../pages/CreateBulkRequest'
import BulkGroupDetail from '../pages/BulkGroupDetail'
import BulkContractManagement from '../pages/BulkContractManagement'

const getDashboardForRole = (userRole) => {
  switch (userRole) {
    case ROLES.SELLER: return <SellerDashboard />
    case ROLES.SUPERADMIN: return <Navigate to="/superadmin" replace />
    case ROLES.MARKETPLACE_ADMIN: return <MarketplaceAdminDashboard />
    case ROLES.VENDOR_ADMIN: return <VendorAdminDashboard />
    case ROLES.WAREHOUSE_MANAGER: return <WarehouseManagerDashboard />
    case ROLES.TRANSPORT_MANAGER: return <TransportManagerDashboard />
    case ROLES.CUSTOMER_SUPPORT: return <CustomerSupportDashboard />
    case ROLES.FINANCE_ADMIN: return <FinanceAdminDashboard />
    case ROLES.LOGISTICS_COMPANY: return <LogisticsDashboard />
    case ROLES.WAREHOUSE: return <WarehouseDashboard />
    case ROLES.CUSTOMER:
    default: return <CustomerDashboard />
  }
}

export function AuthenticatedRoutes({ userRole }) {
  const SuperAdminRoutes = () => (
    <SuperAdminLayout>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SuperAdminHome />} />
        <Route path="users" element={<SuperAdminUsers />} />
        <Route path="products" element={<SuperAdminProducts />} />
        <Route path="orders" element={<SuperAdminOrders />} />
        <Route path="sub-admins" element={<SuperAdminSubAdmins />} />
        <Route path="audit" element={<SuperAdminAudit />} />
        <Route path="api-keys" element={<SuperAdminApiKeys />} />
        <Route path="backups" element={<SuperAdminBackups />} />
        <Route path="health" element={<SuperAdminHealth />} />
        <Route path="settings" element={<SuperAdminSettingsEnhanced />} />
        <Route path="export" element={<SuperAdminExport />} />
        <Route path="sessions" element={<SuperAdminSessions />} />
        <Route path="mfa" element={<SuperAdminMfa />} />
        <Route path="notifications" element={<SuperAdminNotifications />} />
        <Route path="security" element={<SuperAdminSecurity />} />
        <Route path="reports" element={<SuperAdminReports />} />
        <Route path="trash" element={<SuperAdminTrash />} />
        <Route path="webhooks" element={<SuperAdminWebhooks />} />
        <Route path="analytics" element={<SuperAdminAnalytics />} />
        <Route path="activity-feed" element={<SuperAdminActivityFeed />} />
        <Route path="api-stats" element={<SuperAdminApiStats />} />
        <Route path="scheduled-tasks" element={<SuperAdminScheduledTasks />} />
         <Route path="enhanced-metrics" element={<SuperAdminEnhancedMetrics />} />
         <Route path="user-activity/:userId" element={<SuperAdminUserActivity />} />
         <Route path="content/categories" element={<AdminCategoriesPage />} />
         <Route path="content/moderation" element={<AdminContentModerationPage />} />
         <Route path="content/featured-listings" element={<AdminFeaturedListingsPage />} />
         <Route path="content/blog" element={<AdminBlogPage />} />
         <Route path="content/faqs" element={<AdminFAQsPage />} />
         <Route path="content/testimonials" element={<AdminTestimonialsPage />} />
         <Route path="content/partners" element={<AdminPartnersPage />} />
         <Route path="content/reviews" element={<AdminReviewsPage />} />
         <Route path="content/contracts" element={<AdminContractsPage />} />
         <Route path="content/promotions" element={<AdminPromotionsPage />} />
         <Route path="content/templates" element={<AdminTemplatesPage />} />
         <Route path="finance/commissions" element={<AdminCommissionsPage />} />
         <Route path="finance/tax" element={<AdminTaxPage />} />
         <Route path="finance/vendors/analytics" element={<AdminVendorAnalyticsPage />} />
         <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </SuperAdminLayout>
  )

  return (
    <Routes>
      <Route path="/superadmin/*" element={<RequireSuperAdmin><SuperAdminRoutes /></RequireSuperAdmin>} />
      {userRole === ROLES.SUPERADMIN && (
        <>
          <Route path="/admin/categories" element={<Navigate to="/superadmin/content/categories" replace />} />
          <Route path="/admin/featured-listings" element={<Navigate to="/superadmin/content/featured-listings" replace />} />
          <Route path="/admin/blog" element={<Navigate to="/superadmin/content/blog" replace />} />
          <Route path="/admin/faqs" element={<Navigate to="/superadmin/content/faqs" replace />} />
          <Route path="/admin/testimonials" element={<Navigate to="/superadmin/content/testimonials" replace />} />
          <Route path="/admin/partners" element={<Navigate to="/superadmin/content/partners" replace />} />
          <Route path="/admin/reviews" element={<Navigate to="/superadmin/content/reviews" replace />} />
          <Route path="/admin/contracts" element={<Navigate to="/superadmin/content/contracts" replace />} />
          <Route path="/admin/promotions" element={<Navigate to="/superadmin/content/promotions" replace />} />
          <Route path="/admin/templates" element={<Navigate to="/superadmin/content/templates" replace />} />
          <Route path="/admin/commissions" element={<Navigate to="/superadmin/finance/commissions" replace />} />
          <Route path="/admin/tax" element={<Navigate to="/superadmin/finance/tax" replace />} />
          <Route path="/admin/vendors/analytics" element={<Navigate to="/superadmin/finance/vendors/analytics" replace />} />
          <Route path="/admin/settings" element={<Navigate to="/superadmin/settings" replace />} />
          <Route path="/admin/reports" element={<Navigate to="/superadmin/reports" replace />} />
        </>
      )}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={getDashboardForRole(userRole)} />
      <Route path="/logistics/available" element={<LogisticsAvailableDeliveries />} />
      <Route path="/logistics/active" element={<LogisticsActiveDeliveries />} />
      <Route path="/logistics/history" element={<LogisticsDeliveryHistory />} />
      <Route path="/logistics/vehicles" element={<LogisticsVehicles />} />
      <Route path="/logistics/drivers" element={<LogisticsDrivers />} />
      <Route path="/logistics/earnings" element={<LogisticsEarnings />} />
      <Route path="/logistics/documents" element={<LogisticsDocuments />} />
      <Route path="/logistics/profile" element={<LogisticsProfile />} />
      <Route path="/logistics/subscription" element={<LogisticsSubscription />} />
      <Route path="/logistics/ratings" element={<LogisticsRatings />} />
      <Route path="/logistics/analytics" element={<LogisticsAnalytics />} />
      <Route path="/logistics/dashboard" element={<LogisticsDashboard />} />
      <Route path="/products" element={<Products />} />
      <Route path="/products/:id" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/categories" element={<Categories />} />
      <Route path="/sellers" element={<Sellers />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/my-orders" element={<MyOrders />} />
      <Route path="/wishlist" element={<Wishlist />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/messages/:conversationId" element={<ChatThread />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/my-reviews" element={<MyReviews />} />
      <Route path="/payment-methods" element={<PaymentMethods />} />
      <Route path="/bills/pay" element={<BillPaymentPage />} />
      <Route path="/addresses" element={<SavedAddresses />} />
      <Route path="/tracking/:orderId" element={<OrderTracking />} />
      <Route path="/receipt/:id" element={<Receipt />} />
      <Route path="/sell-products" element={<SellProducts />} />
      <Route path="/search" element={<SearchResults />} />
      <Route path="/market-prices" element={<LiveMarketPrices />} />
      <Route path="/exchange" element={<CommodityExchange />} />
      <Route path="/verification" element={<FarmerVerification />} />
     <Route path="/warehouse/inventory" element={<InventoryPage />} />
     <Route path="/warehouse/movements" element={<InwardOutwardPage />} />
     <Route path="/warehouse/dashboard" element={<WarehouseDashboard />} />
     <Route path="/warehouse/spaces" element={<WarehouseStorageSpaces />} />
     <Route path="/warehouse/inbound" element={<WarehouseInbound />} />
     <Route path="/warehouse/outbound" element={<WarehouseOutbound />} />
     <Route path="/warehouse/bookings" element={<WarehouseBookings />} />
     <Route path="/warehouse/customers" element={<WarehouseCustomers />} />
     <Route path="/warehouse/earnings" element={<WarehouseEarnings />} />
     <Route path="/warehouse/documents" element={<WarehouseDocuments />} />
     <Route path="/warehouse/profile" element={<WarehouseProfile />} />
     <Route path="/warehouse/subscription" element={<WarehouseSubscription />} />
     <Route path="/warehouse/ratings" element={<WarehouseRatings />} />
     <Route path="/warehouse/analytics" element={<WarehouseAnalytics />} />
     <Route path="/warehouse/promote" element={<WarehousePromote />} />
      <Route path="/storage-services" element={<StorageServicesPage />} />
     <Route path="/vendor/applications" element={<VendorApplicationsPage />} />
     <Route path="/vendor/suspended" element={<SuspendedVendorsPage />} />
     <Route path="/vendor/reports" element={<VendorReportsPage />} />
     <Route path="/vendor/verify/:id" element={<VendorVerificationDetailPage />} />
     <Route path="/vendor/verification" element={<VendorVerificationPage />} />
     <Route path="/vendor/settings" element={<VendorSettingsPage />} />
     <Route path="/vendor/contracts" element={<VendorContractsPage />} />
     <Route path="/vendor/communications" element={<VendorCommunicationPage />} />
     <Route path="/vendor/bulk-actions" element={<VendorBulkActionsPage />} />
     <Route path="/vendor/audit" element={<VendorAuditLogsPage />} />
     <Route path="/vendor/plans" element={<VendorSubscriptionPlansPage />} />
     <Route path="/vendor/products" element={<VendorProductsPage />} />
      <Route path="/vendor/orders" element={<VendorOrdersPage />} />
      <Route path="/vendor/payment-settings" element={<SellerPaymentSettings />} />
<Route path="/vendor/commissions" element={<VendorCommissionPage />} />
       <Route path="/vendor/withdrawals" element={<VendorWithdrawalsPage />} />
       <Route path="/fulfillments" element={<FulfillmentDashboard />} />
      <Route path="/transport/deliveries" element={<ActiveDeliveriesPage />} />
      <Route path="/transport/drivers" element={<DriversPage />} />
      <Route path="/transport/routes" element={<RoutesPage />} />
      <Route path="/admin/users" element={<UserManagementPage />} />
      <Route path="/admin/panel" element={<AdminPanelPage />} />
      <Route path="/admin/customers" element={<UserManagementPage />} />
      <Route path="/admin/logistics-documents" element={<AdminLogisticsDocuments />} />
      <Route path="/admin/logistics-applications" element={<LogisticsApplicationsPage />} />
      <Route path="/admin/moderation" element={<AdminContentModerationPage />} />
      <Route path="/admin/chat-moderation" element={<AdminChatModerationPage />} />
      <Route path="/admin/ads" element={<AdvertisementsPage />} />
      <Route path="/admin/audit" element={<AuditLogsPage />} />
      <Route path="/admin/finances" element={<FinanceAdminDashboard />} />
      <Route path="/admin/logistics" element={<LogisticsDashboard />} />
      <Route path="/admin/warehouses" element={<WarehouseManagerDashboard />} />
      <Route path="/admin/support" element={<CustomerSupportDashboard />} />
      <Route path="/admin/content" element={<AdminPanelPage />} />
      <Route path="/admin/disputes" element={<AdminDisputesPage />} />
      <Route path="/admin/ai-agents" element={<AIDashboard />} />
      <Route path="/admin/vendors/analytics" element={<AdminVendorAnalyticsPage />} />
      <Route path="/admin/security" element={<SuperAdminSettings />} />
      <Route path="/admin/tax" element={<AdminTaxPage />} />
      <Route path="/admin/settings" element={<AdminSettingsPage />} />
      <Route path="/admin/promotions" element={<AdminPromotionsPage />} />
      <Route path="/admin/contracts" element={<AdminContractsPage />} />
      <Route path="/admin/testimonials" element={<AdminTestimonialsPage />} />
      <Route path="/admin/faqs" element={<AdminFAQsPage />} />
      <Route path="/admin/partners" element={<AdminPartnersPage />} />
      <Route path="/admin/reviews" element={<AdminReviewsPage />} />
      <Route path="/admin/templates" element={<AdminTemplatesPage />} />
      <Route path="/admin/featured-listings" element={<AdminFeaturedListingsPage />} />
      <Route path="/admin/blog" element={<AdminBlogPage />} />
      <Route path="/admin/commissions" element={<AdminCommissionsPage />} />
      <Route path="/admin/reports" element={<AdminReportsPage />} />
      <Route path="/admin/export" element={<ExportModule />} />
      <Route path="/security" element={<SecurityPage />} />
      <Route path="/marketplace/approvals" element={<ProductApprovalsPage />} />
      <Route path="/marketplace/reported" element={<ReportedProductsPage />} />
      <Route path="/seller/customers" element={<CustomersPage />} />
      <Route path="/seller/withdrawals" element={<WithdrawalsPage />} />
      <Route path="/transport" element={<TransportMarketplace />} />
      <Route path="/bulk-purchase" element={<BulkPurchase />} />
      <Route path="/bulk-procurement" element={<BulkProcurementDashboard />} />
      <Route path="/bulk-procurement/create" element={<CreateBulkRequest />} />
      <Route path="/bulk-procurement/:id" element={<BulkGroupDetail />} />
      <Route path="/bulk-procurement/contract/:id" element={<BulkContractManagement />} />
      <Route path="/auctions" element={<AuctionSystem />} />
      <Route path="/ai-assistant" element={<AIAssistant />} />
      <Route path="/ai-dashboard" element={<AIDashboard />} />
      <Route path="/quality" element={<QualityInspection />} />
      <Route path="/escrow" element={<EscrowPayment />} />
      <Route path="/smart-logistics" element={<SmartLogistics />} />
      <Route path="/finance" element={<CreditFinancing />} />
      <Route path="/finance/transactions" element={<TransactionsPage />} />
      <Route path="/finance/payouts" element={<VendorPayoutsPage />} />
      <Route path="/finance/commissions" element={<CommissionsPage />} />
      <Route path="/finance/refunds" element={<RefundsPage />} />
      <Route path="/finance/invoices" element={<InvoicesPage />} />
      <Route path="/finance/statements" element={<FinancialStatementsPage />} />
      <Route path="/finance/payment-methods" element={<PaymentGatewaysPage />} />
      <Route path="/finance/ntzs" element={<FinanceNtzsPage />} />
      <Route path="/weather" element={<WeatherFarming />} />
      <Route path="/export" element={<ExportModule />} />
      <Route path="/analytics" element={<BusinessAnalytics />} />
      <Route path="/loyalty" element={<LoyaltyReferral />} />
      <Route path="/regional" element={<RegionalMarketplace />} />
      <Route path="/disputes" element={<DisputeResolution />} />
      <Route path="/sustainability" element={<Sustainability />} />
      <Route path="/grain-exchange" element={<GrainExchangeDashboard />} />
      <Route path="/seeds" element={<Seeds />} />
      <Route path="/fertilizers" element={<Fertilizers />} />
      <Route path="/farm-equipment" element={<FarmEquipment />} />
      <Route path="/storage-services" element={<StorageServices />} />
      <Route path="/logistics-services" element={<LogisticsServices />} />
      <Route path="/agri-financing" element={<AgriculturalFinancing />} />
      <Route path="/crop-insurance" element={<CropInsurance />} />
      <Route path="/export-services" element={<ExportServices />} />
      <Route path="/ussd-marketplace" element={<UssdMarketplace />} />
      <Route path="/cooperatives" element={<Cooperatives />} />
      <Route path="/contract-farming" element={<ContractFarming />} />
      <Route path="/price-forecasting" element={<PriceForecasting />} />
      <Route path="/warehouse-booking" element={<WarehouseBooking />} />
      <Route path="/government" element={<GovernmentDashboard />} />
      <Route path="/subscription-plans" element={<SubscriptionPlans />} />
      <Route path="/featured-listings" element={<FeaturedListings />} />
      <Route path="/revenue-dashboard" element={<RevenueDashboard />} />
      <Route path="/market-intelligence" element={<MarketIntelligence />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export function PublicRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/products" element={<Products />} />
      <Route path="/products/:id" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/categories" element={<Categories />} />
      <Route path="/sellers" element={<Sellers />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/market-prices" element={<LiveMarketPrices />} />
      <Route path="/bulk-purchase" element={<BulkPurchase />} />
      <Route path="/bulk-procurement" element={<BulkProcurementDashboard />} />
      <Route path="/sell-products" element={<SellProducts />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/returns" element={<ReturnPolicy />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/help-center" element={<HelpCenter />} />
      <Route path="/search" element={<SearchResults />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/register/logistics" element={<LogisticsRegister />} />
      <Route path="/register/warehouse" element={<WarehouseRegister />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/seeds" element={<Seeds />} />
      <Route path="/fertilizers" element={<Fertilizers />} />
      <Route path="/farm-equipment" element={<FarmEquipment />} />
      <Route path="/storage-services" element={<StorageServices />} />
      <Route path="/logistics-services" element={<LogisticsServices />} />
      <Route path="/agri-financing" element={<AgriculturalFinancing />} />
      <Route path="/crop-insurance" element={<CropInsurance />} />
      <Route path="/export-services" element={<ExportServices />} />
      <Route path="/transport" element={<TransportMarketplace />} />
      <Route path="/escrow" element={<EscrowPayment />} />
      <Route path="/warehouse-booking" element={<WarehouseBooking />} />
      <Route path="/contract-farming" element={<ContractFarming />} />
      <Route path="/cooperatives" element={<Cooperatives />} />
      <Route path="/price-forecasting" element={<PriceForecasting />} />
      <Route path="/government" element={<GovernmentDashboard />} />
      <Route path="/ussd-marketplace" element={<UssdMarketplace />} />
      <Route path="/subscription-plans" element={<SubscriptionPlans />} />
      <Route path="/featured-listings" element={<FeaturedListings />} />
      <Route path="/market-intelligence" element={<MarketIntelligence />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
