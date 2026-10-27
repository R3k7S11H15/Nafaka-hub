import React, { useContext, useEffect, useState } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { ActivityIndicator, View, StyleSheet } from 'react-native'

import { AuthContext } from '../../../src/context/AuthContext'
import { CartContext } from '../../../src/context/CartContext'
import { ROLES } from '../../../src/config/roles'

import {
  Home, ShoppingCart, MapPin, BarChart3,
  User, ShoppingBag, Package, MessageSquare, Bell,
  Truck, Users, DollarSign, ClipboardList, Warehouse,
  Shield, Calendar, UserCheck, TrendingUp
} from '../icons'

import HomeScreen from '../pages/HomeScreen'
import ProductsScreen from '../pages/ProductsScreen'
import ProductDetailScreen from '../pages/ProductDetailScreen'
import CartScreen from '../pages/CartScreen'
import CheckoutScreen from '../pages/CheckoutScreen'
import OrdersScreen from '../pages/OrdersScreen'
import OrderTrackingScreen from '../pages/OrderTrackingScreen'
import ReceiptScreen from '../pages/ReceiptScreen'
import WishlistScreen from '../pages/WishlistScreen'
import NotificationsScreen from '../pages/NotificationsScreen'
import MarketPricesScreen from '../pages/MarketPricesScreen'
import ProfileScreen from '../pages/ProfileScreen'
import SettingsScreen from '../pages/SettingsScreen'
import LoginScreen from '../pages/LoginScreen'
import RegisterScreen from '../pages/RegisterScreen'
import LogisticsRegisterScreen from '../pages/LogisticsRegisterScreen'
import WarehouseRegisterScreen from '../pages/WarehouseRegisterScreen'
import AdminLogisticsScreen from '../pages/AdminLogisticsScreen'
import AdminWarehouseScreen from '../pages/AdminWarehouseScreen'
import AdminDashboardScreen from '../pages/AdminDashboardScreen'
import AdminProductsScreen from '../pages/AdminProductsScreen'
import AdminOrdersScreen from '../pages/AdminOrdersScreen'
import AdminUsersScreen from '../pages/AdminUsersScreen'
import AdminFinanceScreen from '../pages/AdminFinanceScreen'
import AdminSupportScreen from '../pages/AdminSupportScreen'
import MessagesScreen from '../pages/MessagesScreen'
import ChatThreadScreen from '../pages/ChatThreadScreen'
import LogisticsDashboardScreen from '../pages/LogisticsDashboardScreen'
import LogisticsAvailableDeliveriesScreen from '../pages/LogisticsAvailableDeliveriesScreen'
import LogisticsActiveDeliveriesScreen from '../pages/LogisticsActiveDeliveriesScreen'
import LogisticsHistoryScreen from '../pages/LogisticsHistoryScreen'
import LogisticsVehiclesScreen from '../pages/LogisticsVehiclesScreen'
import LogisticsDriversScreen from '../pages/LogisticsDriversScreen'
import LogisticsEarningsScreen from '../pages/LogisticsEarningsScreen'
import DriverDashboardScreen from '../pages/DriverDashboardScreen'
import WarehouseDashboardScreen from '../pages/WarehouseDashboardScreen'
import WarehouseInventoryScreen from '../pages/WarehouseInventoryScreen'
import WarehouseBookingsScreen from '../pages/WarehouseBookingsScreen'
import WarehouseCustomersScreen from '../pages/WarehouseCustomersScreen'
import WarehouseDocumentsScreen from '../pages/WarehouseDocumentsScreen'
import VendorDashboardScreen from '../pages/VendorDashboardScreen'
import VendorApplicationsScreen from '../pages/VendorApplicationsScreen'
import VendorVerificationScreen from '../pages/VendorVerificationScreen'
import VendorAnalyticsScreen from '../pages/VendorAnalyticsScreen'
import VendorSuspendedScreen from '../pages/VendorSuspendedScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

const Colors = {
  primary: '#15803d',
  primaryDark: '#166534',
  accent: '#f59e0b',
  background: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#1e293b',
  textMuted: '#94a3b8',
  white: '#ffffff',
}

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  )
}

function CustomerTabs() {
  const { cartItems } = useContext(CartContext)
  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0)

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = ShoppingBag
          switch (route.name) {
            case 'Home': iconName = Home; break
            case 'Products': iconName = Package; break
            case 'MarketPrices': iconName = MapPin; break
            case 'Messages': iconName = MessageSquare; break
            case 'Profile': iconName = User; break
          }
          return <iconName width={size} height={size} color={color} />
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: 'bold' },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Products" component={ProductsScreen} />
      <Tab.Screen name="MarketPrices" component={MarketPricesScreen} options={{ title: 'Market Prices' }} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

function LogisticsTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = Truck
          switch (route.name) {
            case 'LogisticsDashboard': iconName = ClipboardList; break
            case 'LogisticsAvailable': iconName = Package; break
            case 'LogisticsActive': iconName = Truck; break
            case 'LogisticsEarnings': iconName = DollarSign; break
            case 'LogisticsProfile': iconName = User; break
          }
          return <iconName width={size} height={size} color={color} />
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: 'bold' },
      })}
    >
      <Tab.Screen name="LogisticsDashboard" component={LogisticsDashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="LogisticsAvailable" component={LogisticsAvailableDeliveriesScreen} options={{ title: 'Available' }} />
      <Tab.Screen name="LogisticsActive" component={LogisticsActiveDeliveriesScreen} options={{ title: 'Active' }} />
      <Tab.Screen name="LogisticsEarnings" component={LogisticsEarningsScreen} options={{ title: 'Earnings' }} />
      <Tab.Screen name="LogisticsProfile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  )
}

function DriverTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = Truck
          switch (route.name) {
            case 'DriverDashboard': iconName = ClipboardList; break
            case 'DriverDeliveries': iconName = Package; break
            case 'DriverProfile': iconName = User; break
          }
          return <iconName width={size} height={size} color={color} />
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: 'bold' },
      })}
    >
      <Tab.Screen name="DriverDashboard" component={DriverDashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="DriverDeliveries" component={DriverDashboardScreen} options={{ title: 'Deliveries' }} />
      <Tab.Screen name="DriverProfile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  )
}

function WarehouseTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = Warehouse
          switch (route.name) {
            case 'WarehouseDashboard': iconName = BarChart3; break
            case 'WarehouseInventory': iconName = Package; break
            case 'WarehouseBookings': iconName = Calendar; break
            case 'WarehouseCustomers': iconName = Users; break
            case 'WarehouseProfile': iconName = User; break
          }
          return <iconName width={size} height={size} color={color} />
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: 'bold' },
      })}
    >
      <Tab.Screen name="WarehouseDashboard" component={WarehouseDashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="WarehouseInventory" component={WarehouseInventoryScreen} options={{ title: 'Inventory' }} />
      <Tab.Screen name="WarehouseBookings" component={WarehouseBookingsScreen} options={{ title: 'Bookings' }} />
      <Tab.Screen name="WarehouseCustomers" component={WarehouseCustomersScreen} options={{ title: 'Customers' }} />
      <Tab.Screen name="WarehouseProfile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  )
}

function VendorAdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = Users
          switch (route.name) {
            case 'VendorDashboard': iconName = BarChart3; break
            case 'VendorApplications': iconName = UserCheck; break
            case 'VendorVerification': iconName = Shield; break
            case 'VendorAnalytics': iconName = TrendingUp; break
            case 'VendorProfile': iconName = User; break
          }
          return <iconName width={size} height={size} color={color} />
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: 'bold' },
      })}
    >
      <Tab.Screen name="VendorDashboard" component={VendorDashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="VendorApplications" component={VendorApplicationsScreen} options={{ title: 'Applications' }} />
      <Tab.Screen name="VendorVerification" component={VendorVerificationScreen} options={{ title: 'Verify' }} />
      <Tab.Screen name="VendorAnalytics" component={VendorAnalyticsScreen} options={{ title: 'Analytics' }} />
      <Tab.Screen name="VendorProfile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  )
}

function MainStack({ userRole }) {
  const isLogistics = userRole === ROLES.LOGISTICS_COMPANY || userRole === ROLES.TRANSPORT_MANAGER
  const isDriver = userRole === 'driver'
  const isWarehouse = userRole === ROLES.WAREHOUSE || userRole === ROLES.WAREHOUSE_MANAGER
  const isVendorAdmin = userRole === ROLES.VENDOR_ADMIN

  return (
    <Stack.Navigator>
      {isDriver ? (
        <Stack.Screen name="DriverTabs" component={DriverTabs} options={{ headerShown: false }} />
      ) : isWarehouse ? (
        <Stack.Screen name="WarehouseTabs" component={WarehouseTabs} options={{ headerShown: false }} />
      ) : isVendorAdmin ? (
        <Stack.Screen name="VendorAdminTabs" component={VendorAdminTabs} options={{ headerShown: false }} />
      ) : isLogistics ? (
        <Stack.Screen name="LogisticsTabs" component={LogisticsTabs} options={{ headerShown: false }} />
      ) : (
        <Stack.Screen name="CustomerTabs" component={CustomerTabs} options={{ headerShown: false }} />
      )}
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product Details', headerBackTitle: 'Back' }} />
      <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Shopping Cart', headerBackTitle: 'Back' }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout', headerBackTitle: 'Cart' }} />
      <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'My Orders', headerBackTitle: 'Profile' }} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} options={{ title: 'Order Tracking', headerBackTitle: 'Orders' }} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} options={{ title: 'Receipt', headerBackTitle: 'Orders' }} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} options={{ title: 'My Wishlist', headerBackTitle: 'Profile' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications', headerBackTitle: 'Profile' }} />
      <Stack.Screen name="ChatThread" component={ChatThreadScreen} options={{ title: 'Chat', headerBackTitle: 'Messages' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings', headerBackTitle: 'Profile' }} />
      <Stack.Screen name="AdminLogistics" component={AdminLogisticsScreen} options={{ title: 'Logistics Applications', headerBackTitle: 'Profile' }} />
      <Stack.Screen name="AdminWarehouse" component={AdminWarehouseScreen} options={{ title: 'Warehouse Applications', headerBackTitle: 'Profile' }} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin Dashboard', headerBackTitle: 'Profile' }} />
      <Stack.Screen name="AdminProducts" component={AdminProductsScreen} options={{ title: 'Products', headerBackTitle: 'Admin' }} />
      <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} options={{ title: 'Orders', headerBackTitle: 'Admin' }} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: 'Users', headerBackTitle: 'Admin' }} />
      <Stack.Screen name="AdminFinance" component={AdminFinanceScreen} options={{ title: 'Finance', headerBackTitle: 'Admin' }} />
      <Stack.Screen name="AdminSupport" component={AdminSupportScreen} options={{ title: 'Support', headerBackTitle: 'Admin' }} />
      <Stack.Screen name="LogisticsAvailableDeliveries" component={LogisticsAvailableDeliveriesScreen} options={{ title: 'Available Deliveries', headerBackTitle: 'Logistics' }} />
      <Stack.Screen name="LogisticsActiveDeliveries" component={LogisticsActiveDeliveriesScreen} options={{ title: 'Active Deliveries', headerBackTitle: 'Logistics' }} />
      <Stack.Screen name="LogisticsHistory" component={LogisticsHistoryScreen} options={{ title: 'Delivery History', headerBackTitle: 'Logistics' }} />
      <Stack.Screen name="LogisticsVehicles" component={LogisticsVehiclesScreen} options={{ title: 'Vehicles', headerBackTitle: 'Logistics' }} />
      <Stack.Screen name="LogisticsDrivers" component={LogisticsDriversScreen} options={{ title: 'Drivers', headerBackTitle: 'Logistics' }} />
      <Stack.Screen name="LogisticsEarnings" component={LogisticsEarningsScreen} options={{ title: 'Earnings', headerBackTitle: 'Logistics' }} />
      <Stack.Screen name="DriverDashboard" component={DriverDashboardScreen} options={{ title: 'Driver Dashboard', headerBackTitle: 'Driver' }} />
    </Stack.Navigator>
  )
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="LogisticsRegister" component={LogisticsRegisterScreen} />
      <Stack.Screen name="WarehouseRegister" component={WarehouseRegisterScreen} />
    </Stack.Navigator>
  )
}

export default function RootNavigator() {
  const { user, loading, isAuthenticated } = useContext(AuthContext)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setInitializing(false), 500)
    return () => clearTimeout(timer)
  }, [])

  if (loading || initializing) {
    return <LoadingScreen />
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="MainApp">
          {() => <MainStack userRole={user?.role} />}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
})
