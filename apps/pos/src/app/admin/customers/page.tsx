'use client'

import { useEffect, useState, useCallback } from 'react'
import { posApi } from '@/lib/api'
import AdminPageShell from '@/components/admin/AdminPageShell'
import clsx from 'clsx'

interface Customer {
  id: string
  displayName: string
  email: string
  mobileNumber: string
  isActive: boolean
  createdAt: string
}

interface CustomerDetail extends Customer {
  persons: Array<{
    id: string
    first_name: string
    last_name: string
    gender: string
    date_of_birth: string
    relationship: string
  }>
  recentOrders: Array<{
    id: string
    order_number: string
    status: string
    source_channel: string
    total_amount: number
    created_at: string
  }>
}

function fmtTime(iso: string | null | undefined) {
  return iso
    ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—'
}

function fmtCurrency(n: number | string) {
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

function getStatusBadgeColor(status: string) {
  const normalized = status?.toLowerCase() || ''
  if (normalized === 'paid') return 'bg-green-900/50 text-green-300 border border-green-700/50'
  if (normalized === 'pending') return 'bg-amber-900/50 text-amber-300 border border-amber-700/50'
  if (normalized === 'refunded' || normalized === 'cancelled')
    return 'bg-red-900/50 text-red-300 border border-red-700/50'
  return 'bg-slate-700 text-slate-400 border border-slate-600'
}

function getChannelIcon(channel: string) {
  const normalized = channel?.toLowerCase() || ''
  if (normalized === 'pos') return '🖥️'
  if (normalized === 'online') return '🌐'
  if (normalized === 'kiosk') return '📟'
  return '📋'
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await posApi.admin.listCustomers({
        search: debouncedSearch || undefined,
        limit: '50',
      })
      setCustomers(response.data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const handleViewCustomer = async (customerId: string) => {
    try {
      setDetailLoading(true)
      const response = await posApi.admin.getCustomer(customerId)
      setSelectedCustomer(response.data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer details')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeSlideOver = () => {
    setSelectedCustomer(null)
  }

  return (
    <AdminPageShell
      title="Customers"
      description="Registered guest accounts"
      icon="👥"
      actions={
        <input
          type="text"
          placeholder="Search by name, email, phone..."
          className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      }
    >
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-red-300 text-sm mb-4">
          {error}
        </div>
      )}

      <p className="text-slate-400 text-sm mb-4">{customers.length} customers</p>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/30 p-8 text-center">
          <p className="text-slate-400 text-sm">No customers found</p>
        </div>
      ) : (
        <>
          {/* ── Mobile cards ── */}
          <div className="sm:hidden space-y-3">
            {customers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => handleViewCustomer(customer.id)}
                className="bg-slate-800 rounded-2xl p-4 cursor-pointer active:bg-slate-700"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-white text-sm font-semibold">{customer.displayName}</p>
                  <span className={clsx(
                    'px-2 py-0.5 rounded-full text-xs font-semibold shrink-0',
                    customer.isActive
                      ? 'bg-green-900/50 text-green-300 border border-green-700/50'
                      : 'bg-slate-700 text-slate-400 border border-slate-600'
                  )}>{customer.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <p className="text-slate-400 text-xs">{customer.mobileNumber || customer.email || '—'}</p>
                <p className="text-slate-500 text-xs mt-0.5">{fmtTime(customer.createdAt)}</p>
              </div>
            ))}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden sm:block rounded-2xl border border-slate-700 bg-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                    <th className="text-left px-4 py-3 font-semibold">Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Email</th>
                  <th className="text-left px-4 py-3 font-semibold">Mobile</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Joined</th>
                  <th className="text-center px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-slate-700/30 transition-colors cursor-pointer"
                    onClick={() => handleViewCustomer(customer.id)}
                  >
                    <td className="px-4 py-3 text-white font-medium">{customer.displayName}</td>
                    <td className="px-4 py-3 text-slate-300">{customer.email}</td>
                    <td className="px-4 py-3 text-slate-300">{customer.mobileNumber}</td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'px-2 py-1 rounded-full text-xs font-semibold',
                          customer.isActive
                            ? 'bg-green-900/50 text-green-300 border border-green-700/50'
                            : 'bg-slate-700 text-slate-400 border border-slate-600'
                        )}
                      >
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-sm">
                      {fmtTime(customer.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewCustomer(customer.id)
                        }}
                        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Slide-over */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
          <div className="w-full max-w-xl bg-slate-900 border-l border-slate-700 h-full overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">{selectedCustomer.displayName}</h2>
                  <span
                    className={clsx(
                      'inline-block px-2 py-1 rounded-full text-xs font-semibold mt-1',
                      selectedCustomer.isActive
                        ? 'bg-green-900/50 text-green-300 border border-green-700/50'
                        : 'bg-slate-700 text-slate-400 border border-slate-600'
                    )}
                  >
                    {selectedCustomer.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <button
                onClick={closeSlideOver}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700 text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Contact Info Section */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                      Contact Info
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between py-2 border-b border-slate-800">
                        <span className="text-slate-400 text-sm">Email</span>
                        <span className="text-white text-sm font-medium">{selectedCustomer.email || '—'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-800">
                        <span className="text-slate-400 text-sm">Mobile</span>
                        <span className="text-white text-sm font-medium">
                          {selectedCustomer.mobileNumber || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-800">
                        <span className="text-slate-400 text-sm">Status</span>
                        <span className="text-white text-sm font-medium">
                          {selectedCustomer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-slate-400 text-sm">Member Since</span>
                        <span className="text-white text-sm font-medium">
                          {fmtTime(selectedCustomer.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Linked Members Section */}
                  {selectedCustomer.persons && selectedCustomer.persons.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                        Linked Members
                      </h3>
                      <div className="space-y-2">
                        {selectedCustomer.persons.map((person) => (
                          <div key={person.id} className="bg-slate-800 rounded-xl p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold text-white">
                                  {person.first_name} {person.last_name}
                                </p>
                                <p className="text-slate-400 text-xs mt-1">{person.gender}</p>
                              </div>
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300 border border-slate-600">
                                {person.relationship}
                              </span>
                            </div>
                            <p className="text-slate-400 text-xs">DOB: {person.date_of_birth || '—'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCustomer.persons && selectedCustomer.persons.length === 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                        Linked Members
                      </h3>
                      <p className="text-slate-500 text-sm">No linked members.</p>
                    </div>
                  )}

                  {/* Recent Orders Section */}
                  {selectedCustomer.recentOrders && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                        Recent Orders
                      </h3>
                      {selectedCustomer.recentOrders.length > 0 ? (
                        <div className="rounded-lg border border-slate-700 overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                                  <th className="text-left px-3 py-2 font-semibold">Order#</th>
                                  <th className="text-left px-3 py-2 font-semibold">Status</th>
                                  <th className="text-left px-3 py-2 font-semibold">Channel</th>
                                  <th className="text-right px-3 py-2 font-semibold">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-700/50">
                                {selectedCustomer.recentOrders.map((order) => (
                                  <tr key={order.id} className="hover:bg-slate-700/30">
                                    <td className="px-3 py-2 text-slate-300 font-mono">
                                      {order.order_number}
                                    </td>
                                    <td className="px-3 py-2">
                                      <span
                                        className={clsx(
                                          'px-1.5 py-0.5 rounded text-xs font-semibold inline-block',
                                          getStatusBadgeColor(order.status)
                                        )}
                                      >
                                        {order.status}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-slate-300">
                                      {getChannelIcon(order.source_channel)}
                                    </td>
                                    <td className="px-3 py-2 text-slate-300 text-right font-medium">
                                      {fmtCurrency(order.total_amount)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm py-2">No orders found.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-6 py-4 border-t border-slate-700 bg-slate-900">
              <button
                onClick={closeSlideOver}
                className="w-full px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold"
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
