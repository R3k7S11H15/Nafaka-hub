'use strict'

/**
 * External URL detection.
 *
 * Detects:
 *  - http:// and https:// links
 *  - www. domains
 *  - Bare domain.tld references (e.g., "visit example.com")
 *  - Shortened URLs (bit.ly, tinyurl.com, etc.)
 *
 * Whitelists Nafaka Hub domains and allows future admin configuration.
 */

// Known URL shorteners
const SHORTENERS = [
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'ow.ly', 'buff.ly',
  'cutt.ly', 'tinyurl', 'shorte', 'lnkd.in', 'bit.do', 'clk', 'shortest',
  'tinyurl', 'shrink', 'shorturl', 'v.gd', 'x.co',
]

// Extract allowed domains from settings (defaults to Nafaka Hub)
function getAllowedDomains(settings = {}) {
  const configured = settings.allowed_domains || 'nafakahub.co.tz,nafakahub.com'
  return configured.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean)
}

/**
 * Check whether a host is an allowed (whitelisted) domain.
 */
function isAllowedDomain(host, allowedDomains) {
  if (!host) return false
  const h = host.toLowerCase().trim()
  return allowedDomains.some((domain) => h === domain || h.endsWith('.' + domain))
}

/**
 * Extract all host/domain strings from a URL or bare domain reference.
 */
function extractDomains(content) {
  if (!content || typeof content !== 'string') return []

  const found = []
  const seen = new Set()

  // Match http(s):// URLs
  const urlRegex = /https?:\/\/[^\s<>"']+/gi
  let m
  while ((m = urlRegex.exec(content)) !== null) {
    try {
      const u = new URL(m[0])
      const host = u.hostname
      if (host && !seen.has(host)) {
        found.push({ url: m[0], host, isShortener: SHORTENERS.includes(host) })
        seen.add(host)
      }
    } catch { /* ignore */ }
  }

  // Match www. domains
  const wwwRegex = /https?:\/\/(?:www\.)?([^\s<>"']+)/gi
  // Already covered above, but also catch bare www.
  const bareWwwRegex = /\bwww\.([a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)+)/gi
  while ((m = bareWwwRegex.exec(content)) !== null) {
    const host = 'www.' + m[1]
    if (!seen.has(host)) {
      found.push({ url: m[0], host, isShortener: SHORTENERS.includes(host) })
      seen.add(host)
    }
  }

  // Match bare domain.tld references (e.g., "example.com", "visit mysite.co.tz")
  // Must have a TLD of at least 2 chars, and not be part of an email.
  const bareDomainRegex = /\b([a-zA-Z0-9][a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,}\b/g
  while ((m = bareDomainRegex.exec(content)) !== null) {
    const host = m[0].toLowerCase()
    // Skip if it's part of an email (lookbehind for @)
    const beforeIdx = m.index - 1
    if (beforeIdx >= 0 && content[beforeIdx] === '@') continue
    if (!seen.has(host)) {
      found.push({ url: m[0], host, isShortener: SHORTENERS.includes(host) })
      seen.add(host)
    }
  }

  return found
}

/**
 * Detect external (non-whitelisted) URLs.
 * @param {string} content
 * @param {object} settings - moderation settings
 * @returns {Array|null} array of external URLs found, or null
 */
function detectExternalUrl(content, settings = {}) {
  const domains = extractDomains(content)
  if (!domains || domains.length === 0) return null

  const allowed = getAllowedDomains(settings)
  const external = domains.filter((d) => !isAllowedDomain(d.host, allowed))

  return external.length > 0 ? external : null
}

module.exports = {
  detectExternalUrl,
  extractDomains,
  isAllowedDomain,
  getAllowedDomains,
  SHORTENERS,
}
