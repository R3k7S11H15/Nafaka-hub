import React, { useState, useContext } from 'react'
import { View, ScrollView, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import { ROLES } from '../../../src/config/roles'
import { Button, Input, Colors } from '../components/UI'
import { Package, User } from '../icons'

export default function WarehouseRegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('')
  const [warehouseName, setWarehouseName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [location, setLocation] = useState('')
  const [region, setRegion] = useState('')
  const [businessRegNumber, setBusinessRegNumber] = useState('')
  const [tinNumber, setTinNumber] = useState('')
  const [capacityTonnes, setCapacityTonnes] = useState('')
  const [storageTypes, setStorageTypes] = useState('')
  const [ratePerTonneDay, setRatePerTonneDay] = useState('')
  const [insuranceInfo, setInsuranceInfo] = useState('')
  const [referenceContacts, setReferenceContacts] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useContext(AuthContext)

  const handleSubmit = async () => {
    if (!fullName || !warehouseName || !phone || !password) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }
    setLoading(true)
    try {
      const data = await register(fullName, phone, email, null, password, ROLES.WAREHOUSE, {
        warehouse_name: warehouseName,
        contact_person: contactPerson,
        business_registration_number: businessRegNumber,
        tin_number: tinNumber,
        location: location,
        region: region,
        capacity_tonnes: capacityTonnes,
        storage_types: storageTypes,
        rate_per_tonne_day: ratePerTonneDay,
        insurance_info: insuranceInfo,
        reference_contacts: referenceContacts,
      })
      if (!data.success) {
        Alert.alert('Registration Failed', data.message || 'Please try again')
      } else if (data.pending_approval) {
        Alert.alert('Application Submitted', 'Your application has been submitted for review. You can log in but your account will be pending approval.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ])
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
          <Text style={styles.title}>Warehouse Registration</Text>
          <Text style={styles.subtitle}>Join Nafaka Hub storage network</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.heading}>Warehouse Details</Text>
          <Text style={styles.subheading}>Your application will be reviewed by our team</Text>

          <Input label="Full Name *" placeholder="Your full name" value={fullName} onChangeText={setFullName} />
          <Input label="Warehouse Name *" placeholder="e.g. Mbeya Grain Storage" value={warehouseName} onChangeText={setWarehouseName} />
          <Input label="Contact Person" placeholder="Primary contact name" value={contactPerson} onChangeText={setContactPerson} />
          <Input label="Phone *" placeholder="+255 XXX XXX XXX" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Input label="Email" placeholder="warehouse@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Input label="Location" placeholder="Full address of warehouse" value={location} onChangeText={setLocation} />
          <Input label="Region *" placeholder="e.g. Mbeya, Iringa, Arusha" value={region} onChangeText={setRegion} />
          <Input label="Business Registration Number" placeholder="e.g. BRN-12345" value={businessRegNumber} onChangeText={setBusinessRegNumber} />
          <Input label="TIN Number" placeholder="Tax Identification Number" value={tinNumber} onChangeText={setTinNumber} />
          <Input label="Capacity (Tonnes)" placeholder="e.g. 500" value={capacityTonnes} onChangeText={setCapacityTonnes} keyboardType="numeric" />
          <Input label="Storage Types" placeholder="e.g. Silos, Open yards, Cold storage" value={storageTypes} onChangeText={setStorageTypes} />
          <Input label="Rate per Tonne/Day (TZS)" placeholder="e.g. 2000" value={ratePerTonneDay} onChangeText={setRatePerTonneDay} keyboardType="numeric" />
          <Input label="Insurance Info" placeholder="Insurance provider and policy number" value={insuranceInfo} onChangeText={setInsuranceInfo} />
          <Input label="Reference Contacts" placeholder="At least 2 existing clients (name, phone)" value={referenceContacts} onChangeText={setReferenceContacts} />
          <Input label="Password *" placeholder="Create a password" value={password} onChangeText={setPassword} secureTextEntry />

          <Button
            title={loading ? 'Submitting...' : 'Submit Application'}
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

          <View style={styles.registerLink}>
            <Text style={styles.loginText}>
              Register as{' '}
              <Text style={styles.loginLinkText} onPress={() => navigation.navigate('LogisticsRegister')}>
                Logistics Company
              </Text>
              {' '}or{' '}
              <Text style={styles.loginLinkText} onPress={() => navigation.navigate('Register')}>
                Customer
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
    fontSize: 22,
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
  registerLink: {
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  loginLinkText: {
    color: Colors.primary,
    fontWeight: '600',
  },
})
