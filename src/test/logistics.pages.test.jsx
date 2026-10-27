import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { ToastProvider } from '../context/ToastContext'
import LogisticsDashboard from '../pages/LogisticsDashboard'
import LogisticsAvailableDeliveries from '../pages/LogisticsAvailableDeliveries'
import LogisticsEarnings from '../pages/LogisticsEarnings'

const mockUser = { id: 1, name: 'Test User', role: 'logistics_company' }

const renderWithProviders = (ui, { user = mockUser, ...options } = {}) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={{ user, logout: vi.fn() }}>
        <ToastProvider>
          {ui}
        </ToastProvider>
      </AuthContext.Provider>
    </BrowserRouter>,
    options
  )
}

describe('Logistics Pages', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true, requests: [], deliveries: [], history: [], drivers: [], vehicles: [], documents: [], ratings: [], earnings: [], summary: { today: 0, week: 0, month: 0, total: 0, available: 0 }, profile: null, subscription: null, analytics: {} }),
        status: 200,
        ok: true,
      })
    )
  })

  it('renders LogisticsDashboard', async () => {
    renderWithProviders(<LogisticsDashboard />)
    await waitFor(() => {
      expect(screen.getByText('Nafaka Hub Logistics')).toBeDefined()
    })
  })

  it('renders LogisticsAvailableDeliveries', async () => {
    renderWithProviders(<LogisticsAvailableDeliveries />)
    await waitFor(() => {
      expect(screen.getByText('Available Deliveries')).toBeDefined()
    })
  })

  it('renders LogisticsEarnings', async () => {
    renderWithProviders(<LogisticsEarnings />)
    await waitFor(() => {
      expect(screen.getByText('Earnings & Payments')).toBeDefined()
    })
  })

  it('shows empty state when no available deliveries', async () => {
    renderWithProviders(<LogisticsAvailableDeliveries />)
    await waitFor(() => {
      expect(screen.getByText('No available delivery requests at this time.')).toBeDefined()
    })
  })

  it('shows earnings summary cards', async () => {
    renderWithProviders(<LogisticsEarnings />)
    await waitFor(() => {
      expect(screen.getByText('Today')).toBeDefined()
      expect(screen.getByText('This Week')).toBeDefined()
      expect(screen.getByText('This Month')).toBeDefined()
      expect(screen.getByText('Available Balance')).toBeDefined()
    })
  })
})
