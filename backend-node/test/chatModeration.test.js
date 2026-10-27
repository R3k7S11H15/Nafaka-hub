import { describe, it, expect } from 'vitest'

const { moderateMessage, checkRateLimit } = require('../services/chatModerationService')
const { VIOLATION } = require('../services/chatModerationService')

describe('Phone Number Detection', () => {
  it('detects standard Tanzania mobile numbers', () => {
    expect(moderateMessage('+255 712 345 678').safe).toBe(false)
    expect(moderateMessage('+255712345678').safe).toBe(false)
    expect(moderateMessage('Call me at +255 712 345 678').safe).toBe(false)
  })

  it('detects 0-prefix Tanzania numbers', () => {
    expect(moderateMessage('My number is 0712 345 678').safe).toBe(false)
    expect(moderateMessage('0712345678').safe).toBe(false)
  })

  it('detects spelled-out digit patterns', () => {
    expect(moderateMessage('My phone is zero seven one two three four five six seven eight').safe).toBe(false)
  })

  it('detects numbers with sharing intent keywords', () => {
    expect(moderateMessage('You can reach me on WhatsApp 255712345678').safe).toBe(false)
    expect(moderateMessage('call me: +255 712 345 678').safe).toBe(false)
    expect(moderateMessage('my tel is 0712345678').safe).toBe(false)
  })

  it('does NOT flag prices, stock, or non-phone numbers', () => {
    expect(moderateMessage('100 bags of rice').safe).toBe(true)
    expect(moderateMessage('TZS 85,000 per bag').safe).toBe(true)
    expect(moderateMessage('25kg of produce').safe).toBe(true)
    expect(moderateMessage('2026 harvest').safe).toBe(true)
    expect(moderateMessage('The product costs 5000').safe).toBe(true)
  })

  it('does NOT flag normal text without phone patterns', () => {
    expect(moderateMessage('Hello, how are you?').safe).toBe(true)
    expect(moderateMessage('I will pick up the order tomorrow.').safe).toBe(true)
  })
})

describe('Email Detection', () => {
  it('detects standard email addresses', () => {
    expect(moderateMessage('My email is john@example.com').safe).toBe(false)
    expect(moderateMessage('Contact: alice@test.org').safe).toBe(false)
  })

  it('detects obfuscated email addresses', () => {
    expect(moderateMessage('Email: john [at] example [dot] com').safe).toBe(false)
    expect(moderateMessage('john{at}example.com').safe).toBe(false)
    expect(moderateMessage('john<at>example.com').safe).toBe(false)
  })

  it('does NOT flag normal text', () => {
    expect(moderateMessage('Please send the invoice').safe).toBe(true)
    expect(moderateMessage('The order will ship tomorrow').safe).toBe(true)
  })
})

describe('URL Detection', () => {
  it('detects external http URLs', () => {
    const result = moderateMessage('Check this out: https://example.com/page')
    expect(result.safe).toBe(false)
    expect(result.violation_type).toBe(VIOLATION.EXTERNAL_URL)
  })

  it('detects bare domain references', () => {
    expect(moderateMessage('Visit example.com for details').safe).toBe(false)
  })

  it('detects URL shorteners', () => {
    expect(moderateMessage('Click bit.ly/abc123 for the link').safe).toBe(false)
  })

  it('allows whitelisted Nafaka Hub domains', () => {
    expect(moderateMessage('See our site at https://www.nafakahub.co.tz').safe).toBe(true)
    expect(moderateMessage('Visit nafakahub.com for more info').safe).toBe(true)
  })

  it('allows normal text without URLs', () => {
    expect(moderateMessage('The delivery will arrive today').safe).toBe(true)
  })
})

describe('Social Media Detection', () => {
  it('detects WhatsApp sharing intent', () => {
    expect(moderateMessage("Add me on WhatsApp: +255712345678").safe).toBe(false)
    expect(moderateMessage('Let\'s chat on WhatsApp. My number is 0712345678').safe).toBe(false)
  })

  it('detects Instagram sharing intent', () => {
    expect(moderateMessage('My Instagram is @johndoe').safe).toBe(false)
    expect(moderateMessage('Follow me on instagram @johndoe').safe).toBe(false)
  })

  it('detects Telegram sharing intent', () => {
    expect(moderateMessage('Find me on Telegram: @johndoe').safe).toBe(false)
    expect(moderateMessage('t.me/johndoe').safe).toBe(false)
  })

  it('detects off-platform transaction intent', () => {
    expect(moderateMessage('Let\'s talk outside this platform').safe).toBe(false)
    expect(moderateMessage('We can discuss privately via WhatsApp').safe).toBe(false)
  })
})

describe('Payment Information Detection', () => {
  it('detects bank account-like long numbers', () => {
    const result = moderateMessage('Send money to my account 12345678901234')
    expect(result.safe).toBe(false)
    expect(result.violation_type).toBe(VIOLATION.BANK_ACCOUNT)
  })

  it('detects PayPal links', () => {
    expect(moderateMessage('Pay me via paypal.me/johndoe').safe).toBe(false)
  })

  it('detects mobile money keywords with send intent', () => {
    expect(moderateMessage('Send money to my M-Pesa number').safe).toBe(false)
    expect(moderateMessage('Lipa via Airtel Money').safe).toBe(false)
  })

  it('does NOT flag normal text', () => {
    expect(moderateMessage('The total amount is 5000').safe).toBe(true)
  })
})

describe('Spam Detection', () => {
  it('flags excessively long messages', () => {
    const longText = 'a'.repeat(3000)
    const result = moderateMessage(longText)
    expect(result.safe).toBe(false)
    expect(result.violation_type).toBe(VIOLATION.SPAM)
  })

  it('flags excessive character repetition', () => {
    expect(moderateMessage('AAAAAAAAAAAAAA').safe).toBe(false)
  })
})

describe('Moderation Pipeline', () => {
  it('allows safe messages', () => {
    expect(moderateMessage('Hi, I am interested in your rice. How much is it?').safe).toBe(true)
    expect(moderateMessage('Can you deliver to Morogoro?').safe).toBe(true)
    expect(moderateMessage('I would like to order 50 bags').safe).toBe(true)
  })

  it('prioritizes phone detection over other checks', () => {
    const result = moderateMessage('My email is test@test.com and my phone is +255712345678')
    expect(result.safe).toBe(false)
    expect(result.violation_type).toBe(VIOLATION.PHONE_NUMBER)
  })

  it('returns appropriate user-facing messages', () => {
    const phoneResult = moderateMessage('+255712345678')
    expect(phoneResult.safe).toBe(false)
    expect(phoneResult.userMessage).toContain('Phone numbers')
  })
})

describe('Rate Limiting', () => {
  it('allows messages within limit', () => {
    const settings = { messages_per_minute: '30' }
    for (let i = 0; i < 30; i++) {
      const result = checkRateLimit(123, settings)
      expect(result.allowed).toBe(true)
    }
  })

  it('blocks messages exceeding limit', () => {
    const settings = { messages_per_minute: '3' }
    checkRateLimit(456, settings)
    checkRateLimit(456, settings)
    checkRateLimit(456, settings)
    const result = checkRateLimit(456, settings)
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBeGreaterThan(0)
  })
})
