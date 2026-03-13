'use client'

/**
 * TillMovementSheet — Record a cash movement (drop, paid-in, paid-out).
 */

import { useState } from 'react'
import { posApi } from '@/lib/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type MovementType = 'drop' | 'paid_in' | 'paid_out'

interface Props {
  sessionId: string
  onRecorded: (movement: any) => void
  onCancel: () => void
}

const MOVEMENT_TYPES: Array<{ type: MovementType; label: string; icon: string; description: string; color: string }> = [
  { type: 'paid_in',  label: 'Cash In',   icon: '➕', description: 'Petty cash top-up or received cash', color: 'green'  },
  { type: 'paid_out', label: 'Cash Out',  icon: '➖', description: 'Expense paid from drawer',           color: 'red'    },
  { type: 'drop',     label: 'Cash Drop', icon: '🔒', description: 'Safe drop — cash removed to safe',   color: 'amber'  },
]

const PAD_KEYS = ['7','8','9','4','5','6','1','2','3','','0','⌫']

export default function TillMovementSheet({ sessionId, onRecorded, onCancel }: Props) {
  const [movementType, setMovementType] = useState<MovementType>('paid_in')
  const [amount, setAmount]             = useState('0')
  const [reason, setReason]             = useState('')
  const [loading, setLoading]           = useState(false)

  const handleKey = (key: string) => {
    if (key === '⌫') {
      setAmount((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)))
    } else if (key !== '') {
      setAmount((prev) => {
        if (prev === '0' && key !== '.') return key
        if (key === '.' && prev.includes('.')) return prev
        if (prev.includes('.') && prev.split('.')[1]!.length >= 2) return prev
        return prev + key
      })
    }
  }

  const handleSubmit = async () => {
    const numericAmount = parseFloat(amount) || 0
    if (numericAmount <= 0) {
      toast.error('Enter an amount greater than 0')
      return
    }
    if (!reason.trim()) {
      toast.error('A reason is required')
      return
    }

    setLoading(true)
    try {
      const res = await posApi.till.recordMovement({
        sessionId,
        movementType,
        amount: numericAmount,
        reason: reason.trim(),
      })
      onRecorded({
        ...res.data.data,
        amount: numericAmount,
        movementType,
      })
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to record movement')
    } finally {
      setLoading(false)
    }
  }

  const displayAmount = `₹${parseFloat(amount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const selected = MOVEMENT_TYPES.find((m) => m.type === movementType)!

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
            <h2 className="font-bold text-white text-lg">Cash Movement</h2>
            <p className="text-slate-400 text-xs">Record cash in, out, or drop to safe</p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300"
          >✕</button>
        </div>

        <div className="px-5 pt-4 pb-2 space-y-3">
          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2">
            {MOVEMENT_TYPES.map((m) => (
              <button
                key={m.type}
                onClick={() => setMovementType(m.type)}
                className={clsx(
                  'flex flex-col items-center gap-1 py-3 rounded-2xl text-xs font-semibold transition-colors',
                  movementType === m.type
                    ? m.color === 'green'
                      ? 'bg-green-700 text-white'
                      : m.color === 'red'
                      ? 'bg-red-700 text-white'
                      : 'bg-amber-700 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                )}
              >
                <span className="text-lg">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>

          <p className="text-slate-400 text-xs text-center">{selected.description}</p>

          {/* Amount display */}
          <div className="bg-slate-800 rounded-2xl px-4 py-4 text-center">
            <p className="text-slate-400 text-xs mb-1">Amount</p>
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
                  'h-12 rounded-2xl font-semibold text-xl transition-colors',
                  key === ''
                    ? 'invisible'
                    : key === '⌫'
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                )}
              >
                {key}
              </button>
            ))}
          </div>

          {/* Reason input */}
          <input
            type="text"
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="Reason (required)"
            maxLength={100}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {/* Submit */}
        <div className="px-5 pb-6 pt-2 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason.trim() || parseFloat(amount) <= 0}
            className={clsx(
              'flex-1 py-3.5 rounded-2xl font-bold text-white disabled:opacity-50 transition-colors',
              selected.color === 'green'
                ? 'bg-green-600 hover:bg-green-500'
                : selected.color === 'red'
                ? 'bg-red-700 hover:bg-red-600'
                : 'bg-amber-600 hover:bg-amber-500'
            )}
          >
            {loading ? 'Recording…' : `Record ${selected.label}`}
          </button>
        </div>
      </div>
    </div>
  )
}
