import React from 'react'

export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <Skeleton className="h-4 w-24 mb-4" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex gap-4">
          {Array(cols).fill(0).map((_, i) => <Skeleton key={i} className="h-4 flex-1" />)}
        </div>
      </div>
      {Array(rows).fill(0).map((_, rowIdx) => (
        <div key={rowIdx} className="px-6 py-4 border-b border-gray-100">
          <div className="flex gap-4">
            {Array(cols).fill(0).map((_, colIdx) => <Skeleton key={colIdx} className="h-4 flex-1" />)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <Skeleton className="h-5 w-32 mb-4" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  )
}
