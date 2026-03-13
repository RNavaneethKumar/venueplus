'use client'

import { useState } from 'react'
import { posApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface Props {
  productName: string
  currentPrice: number
  onApprove: (newPrice: number) => void
  onClose: () => void
}

/**
 * Manager override modal for price changes.
 * The manager enters their PIN to authorise the new price.
 * On success it fires onApprove with the new price.
 */
export default function ManagerOverrideModal({
  productName,
  currentPrice,
  onApprove,
  onClose,
}: Props) {
  const [managerIdentifier, setManagerIdentifier] = useState('')
  const [managerPin, setManagerPin] = useState('')
  const [newPrice, setNewPrice] = useState(currentPrice.toString())
  const [loading, setLoading] = useState(false)

  const venueId = process.env.NEXT_PUBLIC_VENUE_ID ?? ''

  const handleApprove = async () => {
    const parsed = parseFloat(newPrice)
    if (isNaN(parsed) || parsed < 0) {
      toast.error('Enter a valid price')
      return
    }
    if (!managerIdentifier || managerPin.length !== 4) {
      toast.error('Manager credentials required')
      return
    }
    setLoading(true)
    try {
      const res = await posApi.auth.login(managerIdentifier, managerPin, venueId)
      const { user } = res.data.data
      const roles: string[] = user.roles ?? []
      const permissions: string[] = user.permissions ?? []

      const canOverride =
        permissions.includes('order.price_override') ||
        roles.includes('manager') ||
        roles.includes('venue_admin') ||
        roles.includes('super_admin')

      if (!canOverride) {
        toast.error('This staff member does not have price override permission')
        return
      }

      onApprove(parsed)
      toast.success(`Price override approved by ${user.name}`)
    } catch {
      toast.error('Invalid manager credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-600 rounded-2xl w-full max-w-sm p-5 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-white text-lg">Manager Override</h3>
            <p className="text-slate-400 text-sm">Authorise price change for:</p>
            <p className="text-blue-400 text-sm font-semibold mt-0.5">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Current → New price */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 bg-slate-700 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">Current</p>
            <p className="text-white font-bold">₹{currentPrice.toLocaleString('en-IN')}</p>
          </div>
          <span className="text-slate-400">→</span>
          <div className="flex-1">
            <p className="text-xs text-slate-400 mb-1 text-center">New Price (₹)</p>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="input text-center font-bold text-white"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Manager credentials */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Manager Username / Email</label>
            <input
              type="text"
              className="input"
              placeholder="manager@venueplus.io"
              value={managerIdentifier}
              onChange={(e) => setManagerIdentifier(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Manager PIN</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              className="input text-center tracking-[0.5em] text-xl"
              placeholder="••••"
              value={managerPin}
              onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-ghost border border-slate-600 py-2.5">
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 btn-primary py-2.5"
          >
            {loading ? 'Verifying…' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}
