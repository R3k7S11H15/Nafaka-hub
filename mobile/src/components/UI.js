import React from 'react'
import { TouchableOpacity, Text, StyleSheet, View, TextInput } from 'react-native'

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
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#d97706',
}

export { Colors }

export function Button({ title, onPress, variant = 'primary', disabled = false, style, textStyle, icon: Icon, iconPosition = 'left' }) {
  const isPrimary = variant === 'primary'
  const isDanger = variant === 'danger'
  const isSecondary = variant === 'secondary'

  const backgroundColor = disabled
    ? Colors.textMuted
    : isPrimary
      ? Colors.primary
      : isDanger
        ? Colors.danger
        : isSecondary
          ? Colors.card
          : Colors.primary

  const textColor = disabled
    ? Colors.white
    : isPrimary
      ? Colors.white
      : isDanger
        ? Colors.white
        : isSecondary
          ? Colors.text
          : Colors.white

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        { backgroundColor, borderColor: isSecondary ? Colors.border : backgroundColor },
        style,
      ]}
      activeOpacity={0.8}
    >
      {Icon && iconPosition === 'left' && (
        <Icon width={20} height={20} color={textColor} style={{ marginRight: 8 }} />
      )}
      <Text style={[styles.buttonText, { color: textColor }, textStyle]}>{title}</Text>
      {Icon && iconPosition === 'right' && (
        <Icon width={20} height={20} color={textColor} style={{ marginLeft: 8 }} />
      )}
    </TouchableOpacity>
  )
}

export function Card({ children, style, padding = 16 }) {
  return (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  )
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  error,
  style,
  rightIcon: RightIcon,
  onRightIconPress,
}) {
  return (
    <View style={styles.inputContainer}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputError, style]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={Colors.textMuted}
        />
        {RightIcon && (
          <TouchableOpacity onPress={onRightIconPress}>
            <RightIcon width={20} height={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minHeight: 48,
    borderWidth: 1,
    borderStyle: 'solid',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: '#dc2626',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
})
