'use strict'

/**
 * Email address detection with obfuscation-awareness.
 *
 * Detects:
 *  - Standard emails:  user@example.com, name@company.co.tz
 *  - Obfuscated:       user [at] example [dot] com, user(at)example(dot)com
 *  - Spaced:           user @ example . com
 *  - Symbol variants:  user{at}example{dot}com, user<at>example<dot>com
 */

// Standard email pattern (covers most common cases)
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g

// Obfuscated patterns - word "at" replacing @ and "dot" replacing .
const OBFUSCATION_MAP = {
  '[at]': '@',
  '(at)': '@',
  '{at}': '@',
  '<at>': '@',
  ' at ': '@',
  '[dot]': '.',
  '(dot)': '.',
  '{dot}': '.',
  '<dot>': '.',
  ' dot ': '.',
}

const AT_VARIANTS = ['\\[at\\]', '\\(at\\)', '\\{at\\}', '<at>', ' at ']
const DOT_VARIANTS = ['\\[dot\\]', '\\(dot\\)', '\\{dot\\}', '<dot>', ' dot ']

/**
 * Detect standard email addresses in text.
 */
function detectStandardEmail(content) {
  if (!content || typeof content !== 'string') return null
  const matches = content.match(EMAIL_REGEX)
  return matches && matches.length > 0 ? matches : null
}

/**
 * Detect obfuscated email addresses.
 * Replaces common obfuscation patterns with their real characters,
 * then re-checks for valid email patterns.
 */
function detectObfuscatedEmail(content) {
  if (!content || typeof content !== 'string') return null

  // Build a de-obfuscated version
  let decoded = content

  // Replace [at], (at), {at}, <at>, " at " with @
  for (const variant of AT_VARIANTS) {
    decoded = decoded.replace(new RegExp(variant, 'gi'), '@')
  }

  // Replace [dot], (dot), {dot}, <dot>, " dot " with .
  for (const variant of DOT_VARIANTS) {
    decoded = decoded.replace(new RegExp(variant, 'gi'), '.')
  }

  // Remove spaces around @ and dots that are likely part of an obfuscated email
  decoded = decoded.replace(/\s*@\s*/g, '@')
  decoded = decoded.replace(/@s+/g, '@')
  decoded = decoded.replace(/(\w)\s+(\.)/g, '$1$2')
  decoded = decoded.replace(/(\.)\s+(\w)/g, '$1$2')

  // Now check for email patterns in decoded text
  const matches = decoded.match(EMAIL_REGEX)
  if (matches && matches.length > 0) {
    return matches.map((m) => ({ original: content.match(new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\s\\*/g, '\\s*'), 'gi'))?.[0] || m, decoded: m }))
  }

  return null
}

/**
 * Main email detection entry point.
 * @param {string} content
 * @returns {Array|null}
 */
function detectEmail(content) {
  const standard = detectStandardEmail(content)
  const obfuscated = detectObfuscatedEmail(content)

  if (standard && obfuscated) {
    return [...standard, ...obfuscated]
  }
  if (standard) return standard
  if (obfuscated) return obfuscated
  return null
}

module.exports = {
  detectEmail,
  detectStandardEmail,
  detectObfuscatedEmail,
  EMAIL_REGEX,
  OBFUSCATION_MAP,
}
