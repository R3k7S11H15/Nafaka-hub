import React, { useState, useEffect, useContext } from 'react'
import { View, Text, Image, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import { ROLES, isAdminRole, ADMIN_MENU_CONFIG } from '../../../src/config/roles'
import { Colors } from '../components/UI'
import {
  Package, Heart, ShoppingBag, MapPin, CreditCard, Bell,
  ChevronRight, Pencil, LogOut, BarChart3, MessageSquare, Users, DollarSign,
  User, Truck, Warehouse, AlertCircle, Gavel, FileText, Gift
} from '../icons'

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext)
  const [avatar, setAvatar] = useState(null)

  const initials = (user?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const iconMap = {
    Package, ShoppingBag, MapPin, CreditCard, Heart, Bell,
    User, ChevronRight, Pencil, LogOut, BarChart3, MessageSquare, Users, DollarSign,
    Truck, Warehouse, AlertCircle, Gavel, FileText
  }

  const getAdminIcon = (name) => iconMap[name] || Package

  const menuSections = [
    {
      title: 'Account',
      items: [
        { icon: Package, label: 'My Orders', onPress: () => navigation.navigate('Orders') },
        { icon: Heart, label: 'My Wishlist', onPress: () => navigation.navigate('Wishlist') },
        { icon: MapPin, label: 'Saved Addresses', onPress: () => {} },
        { icon: CreditCard, label: 'Payment Methods', onPress: () => navigation.navigate('PaymentMethods') },
        { icon: Gift, label: 'Refer a Friend', onPress: () => {} },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: Bell, label: 'Notifications', onPress: () => navigation.navigate('Notifications') },
        { icon: User, label: 'Account Settings', onPress: () => navigation.navigate('Settings') },
      ],
    },
  ]

  if (isAdminRole(user?.role)) {
    const adminItems = ADMIN_MENU_CONFIG[user?.role] || []
    menuSections.push({
      title: 'Administration',
      items: adminItems.map((item) => ({
        icon: getAdminIcon(item.icon),
        label: item.label,
        onPress: () => navigation.navigate(item.screen),
      })),
    })
  }

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ])
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => {}}>
          <Pencil width={20} height={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
          <Text style={styles.userPhone}>{user?.phone || '+255 XXX XXX XXX'}</Text>
        </View>
        <ChevronRight width={18} height={18} color={Colors.textMuted} style={styles.chevron} />
      </View>

      {menuSections.map((section, sIdx) => (
        <View key={sIdx} style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>{section.title}</Text>
          {section.items.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.menuItemIcon, { backgroundColor: `${item.icon === LogOut ? '#fef2f2' : '#dcfce7'}` }]}>
                <item.icon width={20} height={20} color={item.icon === LogOut ? Colors.danger : Colors.primary} />
              </View>
              <Text style={styles.menuItemLabel}>{item.label}</Text>
              <ChevronRight width={16} height={16} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          ))}
        </View>
      ))}

      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <LogOut width={20} height={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarPlaceholder: {
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  userPhone: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  chevron: {
    marginLeft: 12,
  },
  menuSection: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: Colors.textMuted,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  logoutSection: {
    marginTop: 8,
    marginHorizontal: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.danger,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
})
