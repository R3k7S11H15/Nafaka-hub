import React, { useState, useContext } from 'react'
import { View, ScrollView, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import { Button, Input, Colors } from '../components/UI'
import { Package, User, Truck } from '../icons'

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useContext(AuthContext)

  const handleSubmit = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }
    setLoading(true)
    try {
      const data = await register(fullName, phone, email, address, password)
      if (!data.success) {
        Alert.alert('Registration Failed', data.message || 'Please try again')
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Package width={48} height={48} color={Colors.white} />
          </View>
          <Text style={styles.title}>Nafaka Hub</Text>
          <Text style={styles.subtitle}>Tanzania</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.heading}>Create Account</Text>
          <Text style={styles.subheading}>Join thousands of farmers and traders</Text>

          <Input label="Full Name" placeholder="John Doe" value={fullName} onChangeText={setFullName} />
          <Input label="Phone" placeholder="+255 XXX XXX XXX" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Input label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Input label="Shipping Address" placeholder="Enter your address" value={address} onChangeText={setAddress} />
          <Input label="Password" placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry />

          <Button
            title={loading ? 'Creating Account...' : 'Create Account'}
            onPress={handleSubmit}
            disabled={loading}
            style={{ marginTop: 8 }}
          />

          <View style={styles.loginLink}>
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginLinkText} onPress={() => navigation.navigate('Login')}>
                Sign In
              </Text>
            </Text>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or register as</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.roleButtons}>
            <TouchableOpacity style={styles.roleBtn} onPress={() => navigation.navigate('LogisticsRegister')}>
              <Truck width={24} height={24} color={Colors.primary} />
              <Text style={styles.roleBtnText}>Logistics Company</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.roleBtn} onPress={() => navigation.navigate('WarehouseRegister')}>
              <Package width={24} height={24} color={Colors.accent} />
              <Text style={styles.roleBtnText}>Warehouse</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.features}>
        <View style={styles.featureItem}>
          <User width={20} height={20} color={Colors.accent} />
          <Text style={styles.featureText}>Verified sellers</Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  logoContainer: {
    width: 72,
    height: 72,
    backgroundColor: Colors.accent,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.white,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.white,
    opacity: 0.85,
  },
  formContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 15,
    color: Colors.textMuted,
    marginBottom: 20,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 12,
  },
  loginText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  loginLinkText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginHorizontal: 12,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  roleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.85,
  },
})
