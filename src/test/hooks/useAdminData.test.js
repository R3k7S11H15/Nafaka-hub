import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAdminData, useAdminMutation } from '../useAdminData'

describe('useAdminData', () => {
  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAdminData('/test'))
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toEqual([])
    expect(result.current.error).toBe(null)
  })
})

describe('useAdminMutation', () => {
  it('should execute mutation and handle success', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ success: true })
    const { result } = renderHook(() => useAdminMutation(mutationFn))

    await act(async () => {
      const data = await result.current.mutate({ id: 1 })
      expect(data).toEqual({ success: true })
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('should handle mutation errors', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error('Failed'))
    const { result } = renderHook(() => useAdminMutation(mutationFn))

    await act(async () => {
      try {
        await result.current.mutate({ id: 1 })
      } catch (err) {
        expect(err.message).toBe('Failed')
      }
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('Failed')
  })
})
