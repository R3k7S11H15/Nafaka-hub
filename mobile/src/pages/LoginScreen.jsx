import React, { useState, useContext } from 'react'
import { View, ScrollView, Text, TouchableOpacity, Alert, StyleSheet, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import { Button, Input, Colors } from '../components/UI'
import { Package, Eye, EyeOff, Mail, Lock } from '../icons'

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useContext(AuthContext)

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter BOTH your email and password')
      return
    }
    setLoading(true)
    try {
      const data = await login(email, password)
      if (!data.success) {
        Alert.alert('Login Failed', data.message || 'Invalid credentials')
      }
    } catch (err) {
      const message = (err && err.message) || 'Network error - check your connection'
      Alert.alert('Login Error', `Failed to connect to server.\n\n${message}`, [{ text: 'OK' }])
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
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subheading}>Sign in to your account</Text>

           <Input
             label="Email address"
             placeholder="you@example.com"
             value={email}
             onChangeText={setEmail}
             keyboardType="email-address"
             autoCapitalize="none"
             icon={<Mail width={20} height={20} color={Colors.textMuted} />}
           />

           <Input
             label="Password"
             placeholder="Enter your password"
             value={password}
             onChangeText={setPassword}
             secureTextEntry={!showPassword}
             icon={<Lock width={20} height={20} color={Colors.textMuted} />}
             rightIcon={showPassword ? EyeOff : Eye}
             onRightIconPress={() => setShowPassword(!showPassword)}
           />

           <TouchableOpacity
             style={styles.forgotPassword}
             onPress={() => Alert.alert('Forgot Password', 'Please contact support to reset your password')}
           >
             <Text style={styles.forgotPasswordText}>Forgot password?</Text>
           </TouchableOpacity>

           <Button
             title={loading ? 'Signing In...' : 'Sign In'}
             onPress={handleSubmit}
             disabled={loading}
             style={{ marginTop: 8 }}
           />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialText}>Facebook</Text>
            </TouchableOpacity>
          </View>

           <View style={styles.registerLink}>
            <Text style={styles.registerText}>
              Don't have an account?{' '}
              <Text
                style={styles.registerLinkText}
                onPress={() => navigation.navigate('Register')}
              >
                Sign up
              </Text>
            </Text>
          </View>
        </View>
        </ScrollView>
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
    paddingVertical: 28,
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: Colors.accent,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.white,
    opacity: 0.85,
    marginTop: 2,
  },
  formContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
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
    marginBottom: 24,
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
    marginHorizontal: 12,
    fontSize: 13,
    color: Colors.textMuted,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  socialButton: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  socialText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  registerLink: {
    alignItems: 'center',
    marginTop: 8,
  },
  registerText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  registerLinkText: {
    color: Colors.primary,
    fontWeight: '600',
  },
})
