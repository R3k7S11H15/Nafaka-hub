import React, { useState, useRef, useEffect } from 'react'

export default function HelpTooltip({ text, children, position = 'top' }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setVisible(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative inline-block" ref={ref}>
      <div
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible(!visible)}
        className="cursor-help"
      >
        {children}
      </div>
      {visible && (
        <div className={`absolute z-[60] w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg ${
          position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
        }`}>
          {text}
          <div className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
            position === 'top' ? 'top-full border-t-gray-900' : 'bottom-full border-b-gray-900'
          }`} />
        </div>
      )}
    </div>
  )
}
