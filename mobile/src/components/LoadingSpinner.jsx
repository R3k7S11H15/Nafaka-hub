import React from 'react'
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native'
import { Colors } from '../components/UI'

export default function LoadingSpinner({ text = 'Loading...', size = 'large', color = Colors.primary }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
})
