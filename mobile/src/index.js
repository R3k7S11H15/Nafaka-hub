import 'react-native-gesture-handler'
import { registerRootComponent } from 'expo'
import React from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'

import { AuthProvider } from '../../src/context/AuthContext'
import { CartProvider } from '../../src/context/CartContext'
import RootNavigator from './navigation/RootNavigator'

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AuthProvider>
          <CartProvider>
            <RootNavigator />
            <StatusBar style="light" backgroundColor="#15803d" />
          </CartProvider>
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}

registerRootComponent(App)
