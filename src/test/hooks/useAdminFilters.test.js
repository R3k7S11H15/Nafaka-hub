import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAdminFilters } from '../useAdminFilters'
import storage from '../../utils/storage'

vi.mock('../../utils/storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}))

describe('useAdminFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with empty filters when no saved data', () => {
    storage.getItem.mockReturnValue(null)
    const { result } = renderHook(() => useAdminFilters('test_filters'))
    expect(result.current.filters).toEqual({})
  })

  it('should load saved filters from storage', () => {
    storage.getItem.mockReturnValue(JSON.stringify({ status: 'active', search: 'test' }))
    const { result } = renderHook(() => useAdminFilters('test_filters'))
    expect(result.current.filters).toEqual({ status: 'active', search: 'test' })
  })

  it('should update filters and save to storage', () => {
    storage.getItem.mockReturnValue(null)
    const { result } = renderHook(() => useAdminFilters('test_filters'))

    act(() => {
      result.current.updateFilter('status', 'active')
    })

    expect(result.current.filters).toEqual({ status: 'active' })
    expect(storage.setItem).toHaveBeenCalledWith('test_filters', JSON.stringify({ status: 'active' }))
  })

  it('should clear filters', () => {
    storage.getItem.mockReturnValue(JSON.stringify({ status: 'active' }))
    const { result } = renderHook(() => useAdminFilters('test_filters'))

    act(() => {
      result.current.clearFilters()
    })

    expect(result.current.filters).toEqual({})
    expect(storage.removeItem).toHaveBeenCalledWith('test_filters')
  })
})
