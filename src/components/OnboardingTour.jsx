import React, { useState, useEffect, useCallback } from 'react'
import { X, ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-react'
import storage from '../utils/storage'

const STEPS = [
  {
    target: '[data-tour="sidebar"]',
    title: 'Navigation Sidebar',
    content: 'Access all admin features from here. Use keyboard shortcuts for faster navigation.',
    position: 'right',
  },
  {
    target: '[data-tour="search"]',
    title: 'Global Search',
    content: 'Press Cmd+K to open quick actions. Search for any page or action instantly.',
    position: 'bottom',
  },
  {
    target: '[data-tour="stats"]',
    title: 'Dashboard Stats',
    content: 'Real-time platform metrics. Drag widgets to customize your dashboard layout.',
    position: 'bottom',
  },
  {
    target: '[data-tour="users"]',
    title: 'User Management',
    content: 'Manage all users, assign roles, and control permissions from this page.',
    position: 'right',
  },
  {
    target: '[data-tour="notifications"]',
    title: 'Notifications',
    content: 'Stay updated with admin alerts. Configure notification preferences in Settings.',
    position: 'right',
  },
]

export default function OnboardingTour({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const seen = storage.getItem('onboarding_completed')
    if (!seen) {
      setTimeout(() => setVisible(true), 500)
    }
  }, [])

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1)
    } else {
      handleComplete()
    }
  }, [currentStep])

  const handlePrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep(s => s - 1)
  }, [currentStep])

  const handleComplete = useCallback(() => {
    storage.setItem('onboarding_completed', 'true')
    setVisible(false)
    onComplete?.()
  }, [onComplete])

  const handleSkip = useCallback(() => {
    storage.setItem('onboarding_completed', 'true')
    setVisible(false)
  }, [])

  if (!visible) return null

  const step = STEPS[currentStep]

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleSkip} />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6 transform transition-all">
        <button onClick={handleSkip} className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded">
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <Sparkles className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
        </div>

        <p className="text-sm text-gray-600 mb-6">{step.content}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStep ? 'w-6 bg-red-600' : 'w-1.5 bg-gray-300'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button onClick={handlePrev} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <button onClick={handleNext} className="flex items-center gap-1 px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
              {currentStep === STEPS.length - 1 ? (
                <>Done <Check className="w-4 h-4" /></>
              ) : (
                <>Next <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>

        <button onClick={handleSkip} className="mt-4 text-xs text-gray-400 hover:text-gray-600">
          Skip tour
        </button>
      </div>
    </div>
  )
}
