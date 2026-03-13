'use client'

import { useState } from 'react'
import clsx from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  value: string          // YYYY-MM-DD
  min?: string
  max?: string
  onChange: (iso: string) => void
  onClose: () => void
}

const DAYS    = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS  = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December']

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isoToLocal = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}
const localToIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const todayIso = () => localToIso(new Date())

// ─── Component ────────────────────────────────────────────────────────────────

export default function DateCalendar({ value, min, max, onChange, onClose }: Props) {
  const selected  = isoToLocal(value)
  const today     = isoToLocal(todayIso())
  const minDate   = min ? isoToLocal(min) : today
  const maxDate   = max ? isoToLocal(max) : null

  const [viewYear,  setViewYear]  = useState(selected.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected.getMonth())      // 0-indexed

  const firstDow     = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate()

  // Build grid cells: null = empty padding
  const cells: (Date | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewYear, viewMonth, i + 1)),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const canPrev = new Date(viewYear, viewMonth - 1, 1) >= new Date(minDate.getFullYear(), minDate.getMonth(), 1)
  const canNext = maxDate ? new Date(viewYear, viewMonth + 1, 1) <= new Date(maxDate.getFullYear(), maxDate.getMonth(), 1) : true

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // onChange is responsible for closing (or transitioning to a confirm sheet).
  // onClose is reserved for explicit cancel / backdrop tap.
  const pick = (date: Date) => {
    onChange(localToIso(date))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <button
            onClick={prevMonth}
            disabled={!canPrev}
            className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-slate-700 active:bg-slate-600 disabled:opacity-25 text-white text-2xl"
          >‹</button>
          <span className="font-bold text-white text-lg">
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            disabled={!canNext}
            className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-slate-700 active:bg-slate-600 disabled:opacity-25 text-white text-2xl"
          >›</button>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 px-4 pb-1">
          {DAYS.map((d) => (
            <div key={d} className="h-8 flex items-center justify-center text-xs font-semibold text-slate-500">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid — 44px+ cells for touch */}
        <div className="grid grid-cols-7 px-4 pb-3 gap-y-1">
          {cells.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="h-11" />
            const iso       = localToIso(date)
            const isSelected = iso === value
            const isToday   = iso === todayIso()
            const disabled  = date < minDate || (maxDate ? date > maxDate : false)
            return (
              <button
                key={iso}
                onClick={() => !disabled && pick(date)}
                disabled={disabled}
                className={clsx(
                  'h-11 w-full rounded-xl flex items-center justify-center text-sm font-medium transition-colors',
                  isSelected && 'bg-blue-600 text-white',
                  !isSelected && isToday && 'text-blue-400 ring-2 ring-blue-500/60',
                  !isSelected && !isToday && !disabled && 'text-white hover:bg-slate-700 active:bg-slate-600',
                  disabled && 'text-slate-600 cursor-not-allowed'
                )}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-700">
          <button
            onClick={() => pick(today)}
            className="text-sm font-semibold text-blue-400 hover:text-blue-300 py-2 px-3 rounded-lg hover:bg-slate-700"
          >
            Today
          </button>
          <button
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-white py-2 px-3 rounded-lg hover:bg-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
