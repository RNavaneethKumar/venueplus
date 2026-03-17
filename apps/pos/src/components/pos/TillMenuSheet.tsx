'use client'

/**
 * TillMenuSheet — Main till management bottom sheet.
 *
 * States:
 *   no session  → Open Till form
 *   open session → menu with session summary, X-Report, movements, Close Till
 */

import { useState, useEffect } from 'react'
import { usePosStore } from '@/store/posStore'
import { posApi } from '@/lib/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import TillOpenScreen from './TillOpenScreen'
import TillCloseScreen from './TillCloseScreen'
import TillMovementSheet from './TillMovementSheet'
import { getCompanionDevice, getDrawerId, setDrawerId, clearDrawerId } from '@/lib/companionApi'

type View = 'menu' | 'open' | 'close' | 'movement'

interface Props {
  onClose: () => void
}

const fmtCurrency = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

export default function TillMenuSheet({ onClose }: Props) {
  const { tillSession, setTillSession, staff } = usePosStore()
  const [view, setView] = useState<View>(() => (tillSession ? 'menu' : 'open'))
  const [xReportLoading, setXReportLoading] = useState(false)
  const [xReport, setXReport] = useState<any>(null)
  const [tillCloseMode, setTillCloseMode] = useState<'normal' | 'blind'>('normal')

  // Fetch venue settings once to read the configured till close mode
  useEffect(() => {
    posApi.admin.getVenue()
      .then((res) => {
        const mode = res.data.data?.settings?.till_close_mode
        if (mode === 'blind') setTillCloseMode('blind')
      })
      .catch(() => {/* default to normal */})
  }, [])

  // Defensive: re-sync with the API every time the sheet opens.
  // The store may be stale (page refresh, session opened by another user on
  // the same drawer, etc.).  A 404 is normal when there's no active session.
  useEffect(() => {
    Promise.all([getDrawerId(), getCompanionDevice()])
      .then(([drawerId, device]) => {
        const deviceId = device?.id ?? null
        const params = drawerId ? { drawerId } : (deviceId ? { deviceId } : undefined)
        return posApi.till.getActiveSession(params)
      })
      .then((res) => {
        const s = res.data.data
        setTillSession({
          id:            s.id,
          drawerId:      s.drawerId ?? null,
          openedBy:      s.openedBy,
          status:        s.status,
          openTime:      s.openTime,
          openingAmount: Number(s.openingAmount),
          movements:     s.movements ?? [],
        })
      })
      .catch(() => { /* 404 = no active session, keep view as 'open' */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // only on mount — setTillSession is stable

  // If session state changes from outside (e.g. order created), refresh view
  useEffect(() => {
    setView(tillSession ? 'menu' : 'open')
  }, [tillSession?.id])

  const handleSessionOpened = (session: any) => {
    setTillSession({
      id:            session.id,
      drawerId:      session.drawerId ?? null,
      openedBy:      session.openedBy,
      status:        session.status,
      openTime:      session.openTime,
      openingAmount: Number(session.openingAmount),
      movements:     [],
    })
    // In counter mode the session has a drawerId — persist it so any user
    // logging in on this terminal later can find the open session.
    if (session.drawerId) void setDrawerId(session.drawerId)
    toast.success('Till opened successfully')
    setView('menu')
  }

  const handleSessionClosed = () => {
    setTillSession(null)
    void clearDrawerId()
    toast.success('Till closed and Z-Report saved')
    onClose()
  }

  const handleXReport = async () => {
    if (!tillSession) return
    setXReportLoading(true)
    try {
      const res = await posApi.till.xReport(tillSession.id)
      setXReport(res.data.data)
    } catch {
      toast.error('Failed to generate X-Report')
    } finally {
      setXReportLoading(false)
    }
  }

  // ── X-Report viewer ───────────────────────────────────────────────────────

  if (xReport) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70"
        onClick={() => setXReport(null)}
      >
        <div
          className="bg-slate-900 border border-slate-700 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-700 shrink-0">
            <div>
              <h2 className="font-bold text-white text-lg">X-Report</h2>
              <p className="text-slate-400 text-xs">
                Generated {new Date(xReport.generatedAt).toLocaleTimeString('en-IN')}
              </p>
            </div>
            <button
              onClick={() => setXReport(null)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300"
            >✕</button>
          </div>

          <div className="overflow-y-auto p-5 space-y-4 text-sm">
            {/* Reconciliation */}
            <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
              <p className="font-semibold text-slate-300 text-xs uppercase tracking-wider mb-2">
                Cash Reconciliation
              </p>
              {[
                ['Opening Float',  xReport.cashReconciliation.openingAmount],
                ['Cash Sales',     xReport.cashReconciliation.salesNet],
                ['Paid In',        xReport.cashReconciliation.paid_in],
                ['Paid Out',      -xReport.cashReconciliation.paid_out],
                ['Drops',         -xReport.cashReconciliation.drop],
              ].map(([label, amount]) => (
                <div key={String(label)} className="flex justify-between text-slate-300">
                  <span>{label}</span>
                  <span className={clsx('font-mono', Number(amount) < 0 && 'text-red-400')}>
                    {fmtCurrency(Number(amount))}
                  </span>
                </div>
              ))}
              <div className="border-t border-slate-600 pt-2 flex justify-between font-bold text-white">
                <span>Expected in Drawer</span>
                <span>{fmtCurrency(xReport.cashReconciliation.expectedAmount)}</span>
              </div>
            </div>

            {/* Sales Summary */}
            <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
              <p className="font-semibold text-slate-300 text-xs uppercase tracking-wider mb-2">
                Sales Summary
              </p>
              <div className="flex justify-between text-slate-300">
                <span>Orders</span><span>{xReport.salesSummary.orderCount}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Gross Sales</span>
                <span className="font-mono">{fmtCurrency(xReport.salesSummary.grossSales)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Discounts</span>
                <span className="font-mono text-amber-400">
                  −{fmtCurrency(xReport.salesSummary.discounts)}
                </span>
              </div>
              <div className="border-t border-slate-600 pt-2 flex justify-between font-bold text-white">
                <span>Net Sales</span>
                <span className="font-mono">{fmtCurrency(xReport.salesSummary.netSales)}</span>
              </div>
            </div>

            {/* Payment Breakdown */}
            {Object.keys(xReport.salesSummary.paymentSummary).length > 0 && (
              <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
                <p className="font-semibold text-slate-300 text-xs uppercase tracking-wider mb-2">
                  By Payment Method
                </p>
                {Object.entries(xReport.salesSummary.paymentSummary).map(([method, data]: any) => (
                  <div key={method} className="flex justify-between text-slate-300">
                    <span className="capitalize">{method.replace('_', ' ')}</span>
                    <span className="font-mono">{fmtCurrency(data.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => window.print()}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
            >
              Print X-Report
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Nested views ──────────────────────────────────────────────────────────

  if (view === 'open') {
    return (
      <TillOpenScreen
        onOpened={handleSessionOpened}
        onCancel={tillSession ? () => setView('menu') : onClose}
      />
    )
  }

  if (view === 'close' && tillSession) {
    return (
      <TillCloseScreen
        session={tillSession}
        closeType={tillCloseMode}
        onClosed={handleSessionClosed}
        onCancel={() => setView('menu')}
      />
    )
  }

  if (view === 'movement' && tillSession) {
    return (
      <TillMovementSheet
        sessionId={tillSession.id}
        onRecorded={(movement) => {
          setTillSession({
            ...tillSession,
            movements: [...tillSession.movements, movement],
          })
          toast.success('Movement recorded')
          setView('menu')
        }}
        onCancel={() => setView('menu')}
      />
    )
  }

  // ── Main menu (session is open) ────────────────────────────────────────────

  if (!tillSession) return null

  const totalPaidIn  = tillSession.movements.filter((m) => m.movementType === 'paid_in').reduce((s, m) => s + m.amount, 0)
  const totalPaidOut = tillSession.movements.filter((m) => m.movementType === 'paid_out').reduce((s, m) => s + m.amount, 0)
  const totalDrops   = tillSession.movements.filter((m) => m.movementType === 'drop').reduce((s, m) => s + m.amount, 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            <div>
              <h2 className="font-bold text-white text-lg leading-tight">Till Open</h2>
              <p className="text-slate-400 text-xs">
                Since {fmtTime(tillSession.openTime)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300"
          >✕</button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Session summary */}
          <div className="px-5 pt-4 pb-2">
            <div className="bg-slate-800 rounded-2xl p-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-slate-400 text-xs mb-1">Opening Float</p>
                <p className="font-bold text-white text-sm tabular-nums">
                  {fmtCurrency(tillSession.openingAmount)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Movements</p>
                <p className="font-bold text-white text-sm">{tillSession.movements.length}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Drops</p>
                <p className="font-bold text-amber-400 text-sm tabular-nums">
                  {fmtCurrency(totalDrops)}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-5 pt-2 pb-4 space-y-2">

            {/* X-Report */}
            <button
              onClick={handleXReport}
              disabled={xReportLoading}
              className="w-full flex items-center gap-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-2xl px-4 py-3.5 text-left transition-colors"
            >
              <span className="text-xl shrink-0">📊</span>
              <div>
                <p className="font-semibold text-white text-sm">X-Report</p>
                <p className="text-slate-400 text-xs">Live session summary — does not close till</p>
              </div>
              {xReportLoading && (
                <div className="ml-auto w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
            </button>

            {/* Cash movements section */}
            <div className="flex gap-2">
              <button
                onClick={() => setView('movement')}
                className="flex-1 flex flex-col items-center gap-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-2xl px-3 py-3 text-sm font-semibold text-white transition-colors"
              >
                <span className="text-lg">➕</span>Cash In
              </button>
              <button
                onClick={() => setView('movement')}
                className="flex-1 flex flex-col items-center gap-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-2xl px-3 py-3 text-sm font-semibold text-white transition-colors"
              >
                <span className="text-lg">➖</span>Cash Out
              </button>
              <button
                onClick={() => setView('movement')}
                className="flex-1 flex flex-col items-center gap-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-2xl px-3 py-3 text-sm font-semibold text-white transition-colors"
              >
                <span className="text-lg">🔒</span>Drop
              </button>
            </div>

            {/* Movements log (if any) */}
            {tillSession.movements.length > 0 && (
              <div className="bg-slate-800/60 rounded-2xl overflow-hidden">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 pt-3 pb-2">
                  Recent movements
                </p>
                <div className="divide-y divide-slate-700/50 max-h-32 overflow-y-auto">
                  {[...tillSession.movements].reverse().slice(0, 6).map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {m.movementType === 'paid_in' ? '➕' : m.movementType === 'paid_out' ? '➖' : '🔒'}
                        </span>
                        <div>
                          <p className="text-white text-xs font-medium capitalize">
                            {m.movementType.replace('_', ' ')}
                          </p>
                          <p className="text-slate-400 text-xs truncate max-w-[140px]">{m.reason}</p>
                        </div>
                      </div>
                      <span className={clsx(
                        'text-xs font-bold tabular-nums',
                        m.movementType === 'paid_in' ? 'text-green-400' : 'text-red-400'
                      )}>
                        {m.movementType === 'paid_in' ? '+' : '−'}{fmtCurrency(m.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close Till */}
            <button
              onClick={() => setView('close')}
              className="w-full flex items-center gap-3 bg-red-900/30 border border-red-700/50 hover:bg-red-900/50 active:bg-red-900/70 rounded-2xl px-4 py-3.5 text-left transition-colors mt-2"
            >
              <span className="text-xl shrink-0">🔐</span>
              <div>
                <p className="font-semibold text-red-300 text-sm">Close Till</p>
                <p className="text-slate-500 text-xs">
                  {tillCloseMode === 'blind' ? '🙈 Blind close' : '👁 Normal close with cash count'}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
