'use client'

import { useEffect, useState } from 'react'
import { posApi } from '@/lib/api'
import AdminPageShell, { StatCard } from '@/components/admin/AdminPageShell'

export default function DashboardPage() {
  const [revenue, setRevenue] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    posApi.reports.liveRevenue()
      .then((res) => setRevenue(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fmt = (n: number) =>
    `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <AdminPageShell title="Dashboard" description="Live venue overview" icon="🏠">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Today's Revenue"  value={fmt(revenue?.totalRevenue ?? 0)}   icon="💰" color="green" trend="All channels" />
            <StatCard label="Orders Today"     value={revenue?.orderCount ?? 0}           icon="📋" color="blue"  trend="All statuses" />
            <StatCard label="POS Revenue"      value={fmt(revenue?.posRevenue ?? 0)}      icon="🖥️" color="blue"  trend="Point of sale" />
            <StatCard label="Online Revenue"   value={fmt(revenue?.onlineRevenue ?? 0)}   icon="🌐" color="amber" trend="Ecommerce" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Recent orders placeholder */}
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
              <h2 className="font-bold text-white mb-4">Recent Orders</h2>
              <p className="text-slate-400 text-sm">Navigate to Orders for the full order list.</p>
            </div>

            {/* Till status placeholder */}
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
              <h2 className="font-bold text-white mb-4">Till Status</h2>
              <p className="text-slate-400 text-sm">Navigate to Till Sessions for open session details.</p>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  )
}
