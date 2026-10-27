import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'http'

const BASE = 'http://localhost:3000/api'

let server
let serverReady = false

async function waitForServer(maxAttempts = 40) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BASE}/health`, { method: 'GET' })
      if (res.ok) {
        serverReady = true
        return
      }
    } catch {
      // ignore
    }
    await new Promise(r => setTimeout(r, 250))
  }
}

describe('Backend health', () => {
  beforeAll(async () => {
    server = require('../server.js')
    await waitForServer()
  })

  afterAll(async () => {
    if (server && typeof server.close === 'function') {
      server.close()
    }
  })

  it('health endpoint returns success', async () => {
    const res = await fetch(`${BASE}/health`, { method: 'GET' })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.database).toBe('connected')
  })
})
