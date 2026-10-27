import React from 'react'
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native'
import { Colors } from '../components/UI'

export default function LoadingSpinner({ text = 'Loading...', size = 'large', color = Colors.primary, fullScreen = true }) {
  return (
    <View style={[styles.container, !fullScreen && styles.inlineContainer]}>
      <View style={styles.spinnerWrapper}>
        <ActivityIndicator size={size} color={color} />
        <View style={styles.spinnerGlow} />
      </View>
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
    backgroundColor: Colors.background,
  },
  inlineContainer: {
    flex: 0,
    backgroundColor: 'transparent',
    padding: 12,
  },
  spinnerWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    opacity: 0.15,
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
})
