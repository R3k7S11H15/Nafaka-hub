import React, { useState } from 'react'
import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '../components/UI'
import { Bell, Eye, Vibrate, Globe, Mail, Lock, ChevronRight, Info, FileText, HelpCircle } from '../icons'

export default function SettingsScreen({ navigation }) {
  const [notifications, setNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [newsletter, setNewsletter] = useState(true)

  const settingsSections = [
    {
      title: 'Notifications',
      items: [
        { icon: Bell, label: 'Push Notifications', type: 'switch', value: pushNotifications, onChange: setPushNotifications },
        { icon: Mail, label: 'Email Notifications', type: 'switch', value: newsletter, onChange: setNewsletter },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: Eye, label: 'Dark Mode', type: 'switch', value: darkMode, onChange: setDarkMode },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: Lock, label: 'Change Password', type: 'link' },
        { icon: Mail, label: 'Email Settings', type: 'link' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', type: 'link', onPress: () => {} },
        { icon: FileText, label: 'Privacy Policy', type: 'link', onPress: () => {} },
        { icon: Info, label: 'About', type: 'link', onPress: () => {} },
      ],
    },
  ]

  const renderSettingItem = (item) => {
    if (item.type === 'switch') {
      return (
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <item.icon width={20} height={20} color={Colors.textMuted} style={styles.settingIcon} />
            <Text style={styles.settingLabel}>{item.label}</Text>
          </View>
          <Switch
            value={item.value}
            onValueChange={item.onChange}
            trackColor={{ false: '#e2e8f0', true: '#16a34a' }}
            thumbColor={item.value ? '#ffffff' : '#94a3b8'}
          />
        </View>
      )
    }

    return (
      <TouchableOpacity style={styles.settingItem} activeOpacity={0.7} onPress={item.onPress}>
        <View style={styles.settingInfo}>
          <item.icon width={20} height={20} color={Colors.textMuted} style={styles.settingIcon} />
          <Text style={styles.settingLabel}>{item.label}</Text>
        </View>
        <ChevronRight width={16} height={16} color={Colors.textMuted} />
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {settingsSections.map((section, sIdx) => (
          <View key={sIdx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, i) => (
                <View key={i}>
                  {renderSettingItem(item)}
                  {i < section.items.length - 1 && <View style={styles.separator} />}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: Colors.textMuted,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  sectionContent: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginHorizontal: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 20,
  },
  settingLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 52,
  },
})
