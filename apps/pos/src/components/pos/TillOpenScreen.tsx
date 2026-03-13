'use client'

/**
 * TillOpenScreen — Opening float entry with numeric keypad.
 * Presents drawer selection when drawers exist (counter mode).
 */

import { useState, useEffect } from 'react'
import { posApi } from '@/lib/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface Drawer { id: string; name: string; description: string | null }

interface Props {
  onOpened: (session: any) => void
  onCancel: () => void
}

const PAD_KEYS = ['7','8','9','4','5','6','1','2','3','.','0','⌫']

export default function TillOpenScreen({ onOpened, onCancel }: Props) {
  const [amount, setAmount]         = useState('0')
  const [drawers, setDrawers]       = useState<Drawer[]>([])
  const [drawerId, setDrawerId]     = useState<string | undefined>(undefined)
  const [drawersLoaded, setDrawersLoaded] = useState(false)
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    posApi.till.listDrawers()
      .then((res) => {
        const active = (res.data.data as Drawer[]).filter((d) => (d as any).isActive !== false)
        setDrawers(active)
        if (active.length === 1) setDrawerId(active[0]!.id)
      })
      .catch(() => {/* no drawers — user mode */})
      .finally(() => setDrawersLoaded(true))
  }, [])

  const handleKey = (key: string) => {
    if (key === '⌫') {
      setAmount((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)))
    } else if (key === '') {
      // No-op (empty key placeholder)
    } else if (key === '.' && amount.includes('.')) {
      // Only one decimal point
    } else {
      setAmount((prev) => {
        if (prev === '0' && key !== '.') return key
        if (prev.includes('.') && prev.split('.')[1]!.length >= 2) return prev
        return prev + key
      })
    }
  }

  const handleOpen = async () => {
    const numericAmount = parseFloat(amount) || 0
    if (numericAmount < 0) {
      toast.error('Opening float cannot be negative')
      return
    }
    setLoading(true)
    try {
      const payload: any = { openingAmount: numericAmount }
      if (drawerId) payload.drawerId = drawerId
      const res = await posApi.till.openSession(payload)
      onOpened(res.data.data)
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to open till')
    } finally {
      setLoading(false)
    }
  }

  const displayAmount = `₹${parseFloat(amount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70"
      onClick={onCancel}
    >
      <div
        className="bg-slate-900 border border-slate-700 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-700">
          <div>
            <h2 className="font-bold text-white text-lg">Open Till</h2>
            <p className="text-slate-400 text-xs">Enter the opening float amount</p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300"
          >✕</button>
        </div>

        <div className="px-5 pt-4 pb-2 space-y-4">
          {/* Drawer selection (only when drawers exist) */}
          {drawersLoaded && drawers.length > 1 && (
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-medium">Select Counter</p>
              <div className="flex flex-wrap gap-2">
                {drawers.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDrawerId(d.id)}
                    className={clsx(
                      'px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
                      drawerId === d.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    )}
                  >
                    {d.name}
                  </button>
                ))}
                <button
                  onClick={() => setDrawerId(undefined)}
                  className={clsx(
                    'px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
                    drawerId === undefined
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  )}
                >
                  User Mode
                </button>
              </div>
            </div>
          )}

          {/* Amount display */}
          <div className="bg-slate-800 rounded-2xl px-4 py-5 text-center">
            <p className="text-slate-400 text-xs mb-1">Opening Float</p>
            <p className="text-4xl font-bold text-white tabular-nums tracking-tight">
              {displayAmount}
            </p>
          </div>

          {/* Numeric keypad */}
          <div className="grid grid-cols-3 gap-2">
            {PAD_KEYS.map((key, i) => (
              <button
                key={i}
                onClick={() => key !== '' && handleKey(key)}
                disabled={key === ''}
                className={clsx(
                  'h-14 rounded-2xl font-semibold text-xl transition-colors',
                  key === ''
                    ? 'invisible'
                    : key === '⌫'
                    ? 'bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white'
                )}
              >
                {key}
              </button>
            ))}
          </div>

          {/* Quick amount buttons */}
          <div className="flex gap-2">
            {[500, 1000, 2000, 5000].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className="flex-1 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold"
              >
                ₹{v.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
        </div>

        {/* Open button */}
        <div className="px-5 pb-6 pt-2">
          <button
            onClick={handleOpen}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold text-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>🔓 Open Till</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
