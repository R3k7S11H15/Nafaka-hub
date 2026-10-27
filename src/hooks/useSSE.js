import { useEffect, useRef, useState, useCallback } from 'react'

const hasEventSource = typeof EventSource !== 'undefined'

export function useSSE(url, options = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [connected, setConnected] = useState(false)
  const connectRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const retryCountRef = useRef(0)
  const esRef = useRef(null)
  const urlRef = useRef(url)
  const onMessageRef = useRef(null)

  const { autoReconnect = true, maxRetries = 10, retryDelay = 3000, enabled = true, onMessage } = options
  urlRef.current = url
  onMessageRef.current = onMessage
  const optsRef = useRef({ autoReconnect, maxRetries, retryDelay, enabled })
  optsRef.current = { autoReconnect, maxRetries, retryDelay, enabled }

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    setConnected(false)
  }, [])

  const connect = useCallback(() => {
    const { autoReconnect, maxRetries, retryDelay, enabled } = optsRef.current
    const currentUrl = urlRef.current

    if (!hasEventSource || !currentUrl || !enabled) {
      setConnected(false)
      return
    }

    cleanup()

    const es = new EventSource(currentUrl)
    esRef.current = es

    es.onopen = () => {
      setConnected(true)
      setError(null)
      retryCountRef.current = 0
    }

    es.onmessage = (event) => {
      let parsed = null
      try {
        parsed = JSON.parse(event.data)
      } catch {
        parsed = { raw: event.data }
      }
      setData(parsed)
      if (onMessageRef.current) onMessageRef.current(parsed)
    }

    es.onerror = () => {
      setConnected(false)
      esRef.current = null

      if (autoReconnect && retryCountRef.current < maxRetries) {
        retryCountRef.current++
        const attempt = retryCountRef.current
        const delay = Math.min(retryDelay * Math.pow(1.5, attempt - 1), 30000)

        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null
          connectRef.current && connectRef.current()
        }, delay)
      } else if (retryCountRef.current >= maxRetries) {
        setError(new Error('SSE connection failed after max retries'))
      }
    }
  }, [cleanup])

  connectRef.current = connect

  useEffect(() => {
    connect()
    return cleanup
  }, [url, enabled, connect, cleanup])

  const reconnect = useCallback(() => {
    retryCountRef.current = 0
    connect()
  }, [connect])

  const disconnect = useCallback(() => {
    cleanup()
  }, [cleanup])

  return { data, error, connected, reconnect, disconnect }
}
