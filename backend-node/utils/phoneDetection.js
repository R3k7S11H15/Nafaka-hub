'use strict'

/**
 * Tanzania phone number detection.
 *
 * Recognizes local and international formats including common
 * formatting variations and obfuscation techniques.
 *
 * Local:   07XXXXXXXX  | 06XXXXXXXX           (10 digits, starts with 0, 2nd digit 6/7)
 * Intl:    +2557XXXXXXXX | +2556XXXXXXXX      (12 digits after +)
 *          2557XXXXXXXX  | 2556XXXXXXXX       (12 digits, starts with 255, 3rd digit 6/7)
 *
 * Separators allowed: space, hyphen, dot, slash, parentheses, brackets.
 * Also detects spelled-out digits ("zero seven one two..").
 */

const WORD_DIGITS = {
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9',
}

// Keywords / phrases that strongly suggest a phone-sharing intent
const PHONE_INTENT_RE =
  /\b(?:call\s*(?:me|you|us)?|text|sms|txt|reach|my\s*number|phone\s*(?:me|number)|mobile|whatsapp|contact|tuwasiliane|wasiliana|namba|yangu|namba)\s*(?:me|at|on|is|number|kwenye|nini)?\b/i

// Sequences of word-digits that could represent a phone number.
// We require at least 9 contiguous word-digits to reduce false positives.
const WORD_DIGIT_PHONE_RE =
  /\b(?:zero|one|two|three|four|five|six|seven|eight|nine\s*){9,}\b/i

/**
 * Collapse separators between digits so that "0712 345 678" becomes "0712345678".
 * Keeps the leading + if present.
 */
function normalizeDigits(raw) {
  return raw.replace(/[^0-9+]/g, '')
}

/**
 * Convert spelled-out digits ("zero seven one two") to numeric digits.
 * Only sequences of word-digits are converted; other text is preserved.
 */
function expandWordDigits(text) {
  return text.replace(
    new RegExp(`\\b(${Object.keys(WORD_DIGITS).join('|')})\\b`, 'gi'),
    (match) => WORD_DIGITS[match.toLowerCase()]
  )
}

/**
 * After extracting pure digits (no +), decide whether the sequence
 * is a valid Tanzania phone number.
 *
 * Returns 'local' | 'intl' | null
 */
function classifyDigits(digits) {
  // Local: 07XXXXXXXX or 06XXXXXXXX  (10 digits)
  if (/^0[67]\d{8}$/.test(digits)) return 'local'
  // International without +: 2557XXXXXXXX or 2556XXXXXXXX (12 digits)
  if (/^255[67]\d{8}$/.test(digits)) return 'intl'
  // International with + already stripped: same as above
  return null
}

/**
 * Find phone-number-like digit runs in the text that have separators
 * (so the *original* text had them). This avoids matching large blocks
 * of plain digits that are part of prices or IDs.
 *
 * Strategy: find runs of [digit, space, -, ., /, (, )] of length >= 9
 * and check if removing non-digits yields a valid phone number.
 */
function findSeparatedPhoneNumbers(text) {
  const results = []

  // Match runs that contain at least one separator AND at least 9 digits
  // The run must start and end with a digit.
  const runRegex = /\d[\d\s\-\.\/\(\),]*\d/g
  let m
  while ((m = runRegex.exec(text)) !== null) {
    const run = m[0]
    const digitsOnly = normalizeDigits(run)
    // Strip leading + that normalizeDigits keeps
    const hasPlus = run.includes('+')
    const stripped = digitsOnly.replace(/^\+/, '')
    const classification = classifyDigits(hasPlus ? stripped : (stripped.startsWith('255') ? stripped : stripped))

    // Check directly
    let candidate
    if (hasPlus) {
      candidate = classifyDigits(stripped)
    } else {
      candidate = classifyDigits(stripped)
    }
    if (candidate) {
      results.push({ raw: run, normalized: stripped, classification: candidate })
    }
  }
  return results
}

/**
 * Find raw digit sequences (no separators) that match Tanzania phone formats.
 * Requires exactly 10 (local) or 12 (intl) digits and a valid prefix.
 */
function findPlainPhoneNumbers(text) {
  const results = []

  // With + prefix
  const intlPlus = text.match(/\+255[67]\d{8}/g)
  if (intlPlus) {
    for (const match of intlPlus) {
      results.push({ raw: match, normalized: match.slice(1), classification: 'intl' })
    }
  }

  // Without + prefix, 255 + 9 digits
  const intlPlain = text.match(/(?:^|[\s\-.(])255[67]\d{8}/g)
  if (intlPlain) {
    for (const match of intlPlain) {
      const digits = match.replace(/[^0-9]/g, '')
      results.push({ raw: match.trim(), normalized: digits, classification: 'intl' })
    }
  }

  // Local format with separators: 07XX XXX XXX  etc.
  const localSep = text.match(/(?:^|[\s\-,.])0[67]\d{2}[\s\-\.\/]?\d{3}[\s\-\.\/]?\d{3}(?!\d)/g)
  if (localSep) {
    for (const match of localSep) {
      const digits = normalizeDigits(match)
      if (classifyDigits(digits) === 'local') {
        results.push({ raw: match.trim(), normalized: digits, classification: 'local' })
      }
    }
  }

  return results
}

/**
 * Find spelled-out phone numbers like "zero seven one two three four five six seven eight"
 * Requires at least 9 word-digits in sequence.
 */
function findWordDigitPhones(text) {
  const results = []
  // Expand word digits, then look for 10 or 12 digit sequences
  const expanded = expandWordDigits(text)
  const digitSequence = expanded.match(/\d{10,12}/g)
  if (digitSequence) {
    for (const seq of digitSequence) {
      const classification = classifyDigits(seq)
      if (classification) {
        results.push({ raw: text.substring(0, 50), normalized: seq, classification, method: 'word_digits' })
      }
    }
  }

  // Also detect "zero seven..." pattern directly without expanding (to check word-only)
  const wordOnlyMatch = text.match(new RegExp(`\\b(?:zero|one|two|three|four|five|six|seven|eight|nine\\s*){9,}`, 'gi'))
  if (wordOnlyMatch) {
    for (const match of wordOnlyMatch) {
      const expandedMatch = expandWordDigits(match)
      const digits = normalizeDigits(expandedMatch)
      if (classifyDigits(digits)) {
        results.push({ raw: match.trim(), normalized: digits, classification: classifyDigits(digits), method: 'word_digits' })
      }
    }
  }

  return results
}

/**
 * Main phone number detection.
 * @param {string} content - The message text to analyze.
 * @returns {Array|null} Array of detected phone numbers, or null if none found.
 */
function detectPhoneNumber(content) {
  if (!content || typeof content !== 'string') return null

  const found = []

  // Layer 1: Separated formats (0712 345 678, +255 712 345 678, 0712-345-678, etc.)
  found.push(...findSeparatedPhoneNumbers(content))

  // Layer 2: Plain formats (0712345678, +255712345678)
  found.push(...findPlainPhoneNumbers(content))

  // Layer 3: Spelled-out digits ("zero seven one two...")
  found.push(...findWordDigitPhones(content))

   // Layer 4: Keyword + nearby digits (supports separators like commas, spaces, hyphens, slashes)
   if (PHONE_INTENT_RE.test(content)) {
     // Look for digit sequences of 7+ digits, possibly separated by commas, spaces, etc.
     const digitRuns = content.match(/[\d\,\s\-\.\/]{7,}/g)
     if (digitRuns) {
       for (const run of digitRuns) {
         const digits = run.replace(/[^0-9]/g, '')
         // Check if it's a partial phone number (7-12 digits that could be part of one)
         // We flag these when combined with phone-sharing keywords
         if (digits.length >= 7 && digits.length <= 12) {
           // Make sure it looks like it could be part of a Tanzania phone number
           // (starts with 0, 255, or has valid mobile prefix)
           const candidate = digits
           if (candidate.startsWith('0') || candidate.startsWith('255') || candidate.startsWith('7')) {
             const classification = classifyDigits(candidate) || (digits.length >= 9 ? 'partial' : null)
             if (classification) {
               found.push({ raw: run, normalized: digits, classification, method: 'keyword_context' })
             }
           }
         }
       }
     }
  }

  return found.length > 0 ? found : null
}

module.exports = {
  detectPhoneNumber,
  normalizeDigits,
  classifyDigits,
  expandWordDigits,
  WORD_DIGITS,
  PHONE_INTENT_RE,
}
