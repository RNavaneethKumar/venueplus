'use client'

import { useEffect, useState } from 'react'
import { posApi } from '@/lib/api'
import AdminPageShell from '@/components/admin/AdminPageShell'
import clsx from 'clsx'

const fmt = (n: number | null | undefined) =>
  n !== null && n !== undefined
    ? `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    : '—'

const fmtTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'

const STATUS_COLORS: Record<string, string> = {
  open:         'bg-green-900/50 text-green-300 border border-green-700/50',
  closed:       'bg-slate-700 text-slate-300',
  blind_closed: 'bg-blue-900/50 text-blue-300 border border-blue-700/50',
  forced:       'bg-red-900/50 text-red-300 border border-red-700/50',
  auto:         'bg-amber-900/50 text-amber-300 border border-amber-700/50',
}

export default function TillSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    posApi.till.listSessions({ limit: '50' })
      .then((res) => setSessions(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const viewZReport = async (session: any) => {
    if (session.zReportData) {
      setSelected(session)
    } else {
      // Open session: fetch X-Report
      try {
        const res = await posApi.till.xReport(session.id)
        setSelected({ ...session, _xReport: res.data.data })
      } catch {
        setSelected(session)
      }
    }
  }

  return (
    <AdminPageShell
      title="Till Sessions"
      description="Cash drawer session history, Z-Reports, and reconciliation"
      icon="💰"
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-64 rounded-2xl border border-dashed border-slate-600 bg-slate-900/40 py-12 text-center">
          <div className="text-4xl mb-4">💰</div>
          <h2 className="font-bold text-white text-lg mb-2">No till sessions yet</h2>
          <p className="text-slate-400 text-sm">Open the till from the POS to start a session.</p>
        </div>
      ) : (
        <>
          {/* ── Mobile cards ── */}
          <div className="sm:hidden space-y-3">
            {sessions.map((s) => {
              const variance = s.variance !== null ? Number(s.variance) : null
              return (
                <div
                  key={s.id}
                  onClick={() => viewZReport(s)}
                  className="bg-slate-800 rounded-2xl p-4 cursor-pointer active:bg-slate-700"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-white text-sm font-semibold">{fmtTime(s.openTime)}</p>
                    <span className={clsx(
                      'px-2 py-0.5 rounded-lg text-xs font-semibold capitalize shrink-0',
                      STATUS_COLORS[s.status] ?? 'bg-slate-700 text-slate-300'
                    )}>{s.status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-slate-400 text-xs">Float: {fmt(Number(s.openingAmount))}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-slate-500 text-xs">{fmtTime(s.closeTime)}</p>
                    {variance !== null && (
                      <p className={clsx('text-xs font-bold tabular-nums',
                        Math.abs(variance) < 0.01 ? 'text-green-400' : variance > 0 ? 'text-blue-300' : 'text-red-400'
                      )}>{variance >= 0 ? '+' : ''}{fmt(variance)}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden sm:block rounded-2xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Opened</th>
                  <th className="text-left px-4 py-3 font-semibold">Closed</th>
                  <th className="text-right px-4 py-3 font-semibold">Float</th>
                  <th className="text-right px-4 py-3 font-semibold">Expected</th>
                  <th className="text-right px-4 py-3 font-semibold">Actual</th>
                  <th className="text-right px-4 py-3 font-semibold">Variance</th>
                  <th className="text-center px-4 py-3 font-semibold">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {sessions.map((s) => {
                  const variance = s.variance !== null ? Number(s.variance) : null
                  return (
                    <tr key={s.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'px-2 py-1 rounded-lg text-xs font-semibold capitalize',
                          STATUS_COLORS[s.status] ?? 'bg-slate-700 text-slate-300'
                        )}>
                          {s.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{fmtTime(s.openTime)}</td>
                      <td className="px-4 py-3 text-slate-300">{fmtTime(s.closeTime)}</td>
                      <td className="px-4 py-3 text-right text-white font-mono">{fmt(Number(s.openingAmount))}</td>
                      <td className="px-4 py-3 text-right text-white font-mono">{fmt(s.expectedAmount ? Number(s.expectedAmount) : null)}</td>
                      <td className="px-4 py-3 text-right text-white font-mono">{fmt(s.actualAmount ? Number(s.actualAmount) : null)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        {variance !== null ? (
                          <span className={clsx(
                            Math.abs(variance) < 0.01 ? 'text-green-400' : variance > 0 ? 'text-blue-300' : 'text-red-400'
                          )}>
                            {variance >= 0 ? '+' : ''}{fmt(variance)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => viewZReport(s)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium"
                        >
                          {s.status === 'open' ? 'X-Report' : 'Z-Report'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Z-Report / X-Report viewer modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-white text-lg">
                {selected.status === 'open' ? 'X-Report' : 'Z-Report'}
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300"
              >✕</button>
            </div>
            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-slate-800 rounded-xl p-4 max-h-96 overflow-auto">
              {JSON.stringify(selected.zReportData ?? selected._xReport ?? selected, null, 2)}
            </pre>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm"
              >
                🖨️ Print
              </button>
              <button
                onClick={() => setSelected(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  )
}
