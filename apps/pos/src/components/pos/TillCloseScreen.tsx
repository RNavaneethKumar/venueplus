'use client'

/**
 * TillCloseScreen — Normal or Blind close with cash count, variance approval,
 * and Z-Report preview.
 */

import { useState, useEffect } from 'react'
import { posApi } from '@/lib/api'
import { usePosStore } from '@/store/posStore'
import { type TillSession } from '@/store/posStore'
import { getCompanionDevice } from '@/lib/companionApi'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface Props {
  session: TillSession
  closeType: 'normal' | 'blind'
  onClosed: () => void
  onCancel: () => void
}

type Stage = 'count' | 'variance' | 'zreport'
const PAD_KEYS = ['7','8','9','4','5','6','1','2','3','.','0','⌫']

const fmtCurrency = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function TillCloseScreen({ session, closeType, onClosed, onCancel }: Props) {
  const { staff } = usePosStore()
  const [amount, setAmount]         = useState('0')
  const [stage, setStage]           = useState<Stage>('count')
  const [varianceData, setVarianceData] = useState<{ variance: number; expectedAmount: number; actualAmount: number } | null>(null)
  const [managerNote, setManagerNote] = useState('')
  const [zReport, setZReport]       = useState<any>(null)
  const [loading, setLoading]       = useState(false)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [drawerName, setDrawerName] = useState<string | null>(null)

  // Load device name from Companion and resolve drawer name from session
  useEffect(() => {
    getCompanionDevice().then((d) => setDeviceName(d?.name ?? null))
    if (session.drawerId) {
      posApi.till.listDrawers()
        .then((res) => {
          const match = (res.data.data as Array<{ id: string; name: string }>)
            .find((d) => d.id === session.drawerId)
          if (match) setDrawerName(match.name)
        })
        .catch(() => {})
    }
  }, [session.drawerId])

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
    const actualAmount = parseFloat(amount) || 0
    setLoading(true)
    try {
      const res = await posApi.till.closeSession(session.id, {
        closeType,
        ...(closeType === 'normal' && { actualAmount }),
      })
      setZReport(res.data.data.zReport)
      setStage('zreport')
    } catch (err: any) {
      const errorData = err.response?.data?.error
      if (errorData?.code === 'TILL_VARIANCE_REQUIRES_APPROVAL' && errorData.details) {
        setVarianceData(errorData.details)
        setStage('variance')
      } else {
        toast.error(errorData?.message ?? 'Failed to close till')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVarianceApprove = async () => {
    if (!varianceData) return
    setLoading(true)
    try {
      const res = await posApi.till.closeSession(session.id, {
        closeType,
        actualAmount: varianceData.actualAmount,
        varianceApprovedBy: staff!.id,
        ...(managerNote ? { varianceNote: managerNote } : {}),
      })
      setZReport(res.data.data.zReport)
      setStage('zreport')
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Approval failed')
    } finally {
      setLoading(false)
    }
  }

  // ── Z-Report stage ─────────────────────────────────────────────────────────

  if (stage === 'zreport' && zReport) {
    const recon = zReport.cashReconciliation
    const varAmount = recon.variance ?? 0
    return (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80"
        onClick={onClosed}
      >
        <div
          className="bg-slate-900 border border-slate-700 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-3 border-b border-slate-700 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-xl">✅</div>
              <div>
                <h2 className="font-bold text-white text-lg">Till Closed</h2>
                <p className="text-slate-400 text-xs">Z-Report generated and saved</p>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-4 text-sm">
            {/* Variance banner */}
            {recon.variance !== null && (
              <div className={clsx(
                'rounded-2xl px-4 py-3 flex items-center gap-3',
                Math.abs(varAmount) < 0.01
                  ? 'bg-green-900/30 border border-green-600/50'
                  : varAmount > 0
                  ? 'bg-blue-900/30 border border-blue-600/50'
                  : 'bg-red-900/30 border border-red-600/50'
              )}>
                <span className="text-2xl">
                  {Math.abs(varAmount) < 0.01 ? '✅' : varAmount > 0 ? '⬆️' : '⬇️'}
                </span>
                <div>
                  <p className={clsx(
                    'font-bold',
                    Math.abs(varAmount) < 0.01 ? 'text-green-400' : varAmount > 0 ? 'text-blue-300' : 'text-red-300'
                  )}>
                    {Math.abs(varAmount) < 0.01
                      ? 'Balanced — no variance'
                      : varAmount > 0
                      ? `Overage: +${fmtCurrency(varAmount)}`
                      : `Shortage: ${fmtCurrency(varAmount)}`}
                  </p>
                  <p className="text-xs text-slate-400">
                    Expected {fmtCurrency(recon.expectedAmount)} · Actual {fmtCurrency(recon.actualAmount)}
                  </p>
                </div>
              </div>
            )}

            {/* Reconciliation */}
            <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
              <p className="font-semibold text-slate-300 text-xs uppercase tracking-wider mb-2">
                Cash Reconciliation
              </p>
              {[
                ['Opening Float',   recon.openingAmount],
                ['Cash Sales',      recon.salesNet],
                ['Paid In',         recon.paid_in],
                ['Paid Out',       -recon.paid_out],
                ['Drops',          -recon.drop],
              ].map(([label, v]) => (
                <div key={String(label)} className="flex justify-between text-slate-300">
                  <span>{label}</span>
                  <span className="font-mono">{fmtCurrency(Number(v))}</span>
                </div>
              ))}
              <div className="border-t border-slate-600 pt-2 flex justify-between text-white">
                <span>Expected</span>
                <span className="font-mono font-semibold">{fmtCurrency(recon.expectedAmount)}</span>
              </div>
              {recon.actualAmount !== null && (
                <div className="flex justify-between text-white font-bold">
                  <span>Actual</span>
                  <span className="font-mono">{fmtCurrency(recon.actualAmount)}</span>
                </div>
              )}
            </div>

            {/* Print */}
            <button
              onClick={() => window.print()}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
            >
              🖨️ Print Z-Report
            </button>

            <button
              onClick={onClosed}
              className="w-full py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Variance approval stage ────────────────────────────────────────────────

  if (stage === 'variance' && varianceData) {
    const { variance, expectedAmount, actualAmount } = varianceData
    return (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80"
        onClick={onCancel}
      >
        <div
          className="bg-slate-900 border border-slate-700 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 pt-6 pb-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-2xl mx-auto mb-3">
              ⚠️
            </div>
            <h2 className="font-bold text-white text-lg text-center">Variance Detected</h2>
            <p className="text-slate-400 text-sm text-center mt-1">
              Manager approval required to close
            </p>

            <div className="mt-4 bg-slate-800 rounded-2xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>Expected</span>
                <span className="font-mono">{fmtCurrency(expectedAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Actual</span>
                <span className="font-mono">{fmtCurrency(actualAmount)}</span>
              </div>
              <div className={clsx(
                'flex justify-between font-bold border-t border-slate-600 pt-2',
                variance > 0 ? 'text-blue-300' : 'text-red-300'
              )}>
                <span>Variance</span>
                <span className="font-mono">
                  {variance >= 0 ? '+' : ''}{fmtCurrency(variance)}
                </span>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <input
                type="text"
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                placeholder="Manager note (optional)"
                value={managerNote}
                onChange={(e) => setManagerNote(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Logged in as <strong className="text-slate-300">{staff?.name}</strong>.
                {' '}This will be recorded as the approving manager.
              </p>
            </div>
          </div>

          <div className="px-5 pb-6 flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleVarianceApprove}
              disabled={loading}
              className="flex-1 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold"
            >
              {loading ? 'Approving…' : 'Approve & Close'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Cash count stage ───────────────────────────────────────────────────────

  const displayAmount = `₹${parseFloat(amount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80"
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
            <h2 className="font-bold text-white text-lg">Close Till</h2>
            <p className="text-slate-400 text-xs">
              {deviceName
                ? <>{deviceName}{drawerName ? <span className="text-slate-500"> · {drawerName}</span> : null}</>
                : 'Count the cash and close the session'}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300"
          >✕</button>
        </div>

        <div className="px-5 pt-4 pb-2 space-y-4">
          {/* Blind mode notice */}
          {closeType === 'blind' && (
            <div className="bg-amber-900/20 border border-amber-600/30 rounded-xl px-3 py-2">
              <p className="text-amber-300 text-xs">
                🙈 Blind close — the expected amount is hidden until after you submit your count.
              </p>
            </div>
          )}

          {closeType === 'normal' && (
            <>
              {/* Amount display */}
              <div className="bg-slate-800 rounded-2xl px-4 py-4 text-center">
                <p className="text-slate-400 text-xs mb-1">Cash Count</p>
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
                      'h-13 rounded-2xl font-semibold text-xl py-3 transition-colors',
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
            </>
          )}
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
            disabled={loading || (closeType === 'normal' && !amount)}
            className="flex-1 py-3.5 rounded-2xl bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-bold"
          >
            {loading ? 'Closing…' : closeType === 'blind' ? 'Close (Blind)' : 'Close Till'}
          </button>
        </div>
      </div>
    </div>
  )
}
