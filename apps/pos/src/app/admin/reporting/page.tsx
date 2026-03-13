'use client'

import { useState, useEffect } from 'react'
import { posApi } from '@/lib/api'
import AdminPageShell, { StatCard } from '@/components/admin/AdminPageShell'
import clsx from 'clsx'

interface ReportData {
  dateRange: { from: string; to: string }
  revenue: {
    order_count: number
    total_revenue: number
    pos_revenue: number
    online_revenue: number
    kiosk_revenue: number
  }
  paymentMethods: Array<{ payment_method: string; total: number }>
}

export default function ReportingPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const handleLoadReport = async () => {
    setLoading(true)
    setError(false)
    try {
      const response = await posApi.admin.getReportSummary(fromDate, toDate)
      setData(response.data.data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (n: number) => {
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  }

  const actions = (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="date"
        value={toDate}
        onChange={(e) => setToDate(e.target.value)}
        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={handleLoadReport}
        disabled={loading}
        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:bg-blue-600/50 transition-colors"
      >
        Load
      </button>
    </div>
  )

  return (
    <AdminPageShell
      title="Reporting"
      description="Revenue and sales analytics"
      icon="📊"
      actions={actions}
    >
      {error && <p className="text-red-400">Failed to load data.</p>}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {data && !loading && (
        <div className="space-y-8">
          {/* Stat Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <StatCard
              label="Total Revenue"
              value={formatCurrency(data.revenue.total_revenue)}
              icon="💰"
              color="green"
            />
            <StatCard
              label="Order Count"
              value={data.revenue.order_count}
              icon="📦"
              color="blue"
            />
            <StatCard
              label="POS Revenue"
              value={formatCurrency(data.revenue.pos_revenue)}
              icon="🖥️"
              color="blue"
            />
            <StatCard
              label="Online Revenue"
              value={formatCurrency(data.revenue.online_revenue)}
              icon="🌐"
              color="amber"
            />
            <StatCard
              label="Kiosk Revenue"
              value={formatCurrency(data.revenue.kiosk_revenue)}
              icon="🎫"
              color="amber"
            />
          </div>

          {/* Payment Breakdown Table */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Payment Breakdown</h2>
            <div className="rounded-2xl border border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="text-left px-4 py-3 font-semibold">Method</th>
                      <th className="text-left px-4 py-3 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {data.paymentMethods.map((method) => (
                      <tr key={method.payment_method} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 text-slate-300">
                          {method.payment_method
                            .split('_')
                            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                            .join(' ')}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{formatCurrency(method.total)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-800/50 hover:bg-slate-800/50 transition-colors font-semibold">
                      <td className="px-4 py-3 text-white">Total</td>
                      <td className="px-4 py-3 text-white">
                        {formatCurrency(
                          data.paymentMethods.reduce((sum, m) => sum + m.total, 0)
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  )
}
