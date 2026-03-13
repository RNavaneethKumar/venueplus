'use client'

import { useEffect, useState, useCallback } from 'react'
import { posApi } from '@/lib/api'
import AdminPageShell from '@/components/admin/AdminPageShell'
import clsx from 'clsx'

interface Product {
  id: string
  name: string
  code: string | null
  productType: string
  isActive: boolean
  createdAt: string
}

interface ProductDetail extends Product {
  prices: Array<{
    id: string
    visitorTypeId: string
    basePrice: number
    currencyCode: string
    salesChannel: string
    effectiveFrom: string | null
    effectiveUntil: string | null
    isActive: boolean
  }>
}

const PRODUCT_TYPES = [
  'all',
  'ticket',
  'membership',
  'retail',
  'wallet_load',
  'gift_card',
  'event_package',
  'food_beverage',
  'donation',
  'adoption',
]

const typeBadge = (t: string) => {
  const map: Record<string, string> = {
    ticket: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
    membership: 'bg-purple-900/50 text-purple-300 border-purple-700/50',
    retail: 'bg-amber-900/50 text-amber-300 border-amber-700/50',
    food_beverage: 'bg-orange-900/50 text-orange-300 border-orange-700/50',
    gift_card: 'bg-pink-900/50 text-pink-300 border-pink-700/50',
    wallet_load: 'bg-teal-900/50 text-teal-300 border-teal-700/50',
    event_package: 'bg-indigo-900/50 text-indigo-300 border-indigo-700/50',
    donation: 'bg-rose-900/50 text-rose-300 border-rose-700/50',
    adoption: 'bg-lime-900/50 text-lime-300 border-lime-700/50',
  }
  return map[t] ?? 'bg-slate-700 text-slate-300 border-slate-600'
}

const fmtTime = (iso: string | null | undefined) => iso ? new Date(iso).toLocaleDateString('en-IN') : '—'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [activeFilter, setActiveFilter] = useState('all')

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await posApi.admin.listProducts()
      let rows: Product[] = res.data.data

      if (typeFilter !== 'all') rows = rows.filter((p) => p.productType === typeFilter)
      if (activeFilter === 'active') rows = rows.filter((p) => p.isActive)
      if (activeFilter === 'inactive') rows = rows.filter((p) => !p.isActive)

      setProducts(rows)
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? err.message ?? 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [typeFilter, activeFilter])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return (
    <AdminPageShell
      title="Products & Tickets"
      description="Product catalogue and activation control"
      icon="🎟️"
      actions={
        <div className="flex gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === 'all' ? 'All Types' : t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      }
    >
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-red-300 text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Mobile cards ── */}
          <div className="sm:hidden space-y-3">
            {products.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">No products found</p>
            ) : products.map((p) => (
              <div key={p.id} className="bg-slate-800 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-white text-sm font-semibold">{p.name}</p>
                  <span className={clsx(
                    'px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0',
                    p.isActive ? 'bg-green-900/50 text-green-300 border-green-700/50' : 'bg-slate-700 text-slate-400 border-slate-600'
                  )}>{p.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <p className="text-slate-400 text-xs">
                  <span className={clsx('inline-block px-1.5 py-0.5 rounded text-xs border mr-1', typeBadge(p.productType))}>
                    {p.productType.replace(/_/g, ' ')}
                  </span>
                  {p.code && <span className="text-slate-500 font-mono">{p.code}</span>}
                </p>
                <div className="mt-2">
                  <ViewEditProductButton id={p.id} />
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden sm:block rounded-2xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-semibold">Name</th>
                    <th className="text-left px-4 py-3 font-semibold">Code</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Created</th>
                  <th className="text-left px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-xs">{p.code ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={clsx('px-2 py-1 rounded-full text-xs font-semibold border', typeBadge(p.productType))}>
                          {p.productType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={clsx(
                            'px-2 py-1 rounded-full text-xs font-semibold border',
                            p.isActive ? 'bg-green-900/50 text-green-300 border-green-700/50' : 'bg-slate-700 text-slate-400 border-slate-600'
                          )}
                        >
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{fmtTime(p.createdAt)}</td>
                      <td className="px-4 py-3">
                        <ViewEditProductButton id={p.id} />
                      </td>
                    </tr>
                  ))
                )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AdminPageShell>
  )
}

const CHANNELS = ['pos', 'online', 'kiosk', 'all'] as const

interface VisitorType { id: string; name: string; code: string }

interface PriceRow {
  id: string
  visitorTypeId: string | null
  basePrice: number
  currencyCode: string
  salesChannel: string | null
  effectiveFrom: string | null
  effectiveUntil: string | null
  isActive: boolean
}

function ViewEditProductButton({ id }: { id: string }) {
  const [showSlideOver, setShowSlideOver]   = useState(false)
  const [product, setProduct]               = useState<ProductDetail | null>(null)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [nameForm, setNameForm]             = useState('')
  const [isActiveForm, setIsActiveForm]     = useState(false)
  const [savingDetails, setSavingDetails]   = useState(false)
  const [detailsSaved, setDetailsSaved]     = useState(false)
  const [visitorTypes, setVisitorTypes]     = useState<VisitorType[]>([])

  // Price editing
  const [editingPriceId, setEditingPriceId]   = useState<string | null>(null)
  const [editingPrice, setEditingPrice]       = useState<Partial<PriceRow>>({})
  const [savingPrice, setSavingPrice]         = useState(false)
  const [showAddPrice, setShowAddPrice]       = useState(false)
  const [newPrice, setNewPrice]               = useState<Partial<PriceRow>>({
    basePrice: 0, currencyCode: 'INR', isActive: true,
  })
  const [addingPrice, setAddingPrice]         = useState(false)
  const [priceError, setPriceError]           = useState<string | null>(null)

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await posApi.admin.getProduct(id)
      const productData = response.data.data
      setProduct(productData)
      setNameForm(productData.name)
      setIsActiveForm(productData.isActive)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (showSlideOver) {
      fetchProduct()
      posApi.admin.listVisitorTypes()
        .then((r) => setVisitorTypes(r.data.data || []))
        .catch(() => {})
    }
  }, [showSlideOver, fetchProduct])

  const vtName = (vtId: string | null) => {
    if (!vtId) return 'All'
    return visitorTypes.find((v) => v.id === vtId)?.name ?? vtId.slice(0, 8)
  }

  const handleSaveDetails = async () => {
    try {
      setSavingDetails(true)
      await posApi.admin.updateProduct(id, { name: nameForm, isActive: isActiveForm })
      setDetailsSaved(true)
      setTimeout(() => setDetailsSaved(false), 2000)
      await fetchProduct()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product')
    } finally {
      setSavingDetails(false)
    }
  }

  const startEditPrice = (price: PriceRow) => {
    setEditingPriceId(price.id)
    setEditingPrice({ ...price })
    setPriceError(null)
  }

  const handleSavePrice = async () => {
    if (!editingPriceId) return
    try {
      setSavingPrice(true)
      setPriceError(null)
      await posApi.admin.updateProductPrice(id, editingPriceId, {
        visitorTypeId:  editingPrice.visitorTypeId ?? null,
        basePrice:      Number(editingPrice.basePrice),
        currencyCode:   editingPrice.currencyCode ?? 'INR',
        salesChannel:   editingPrice.salesChannel ?? null,
        effectiveFrom:  editingPrice.effectiveFrom ?? null,
        effectiveUntil: editingPrice.effectiveUntil ?? null,
        isActive:       editingPrice.isActive ?? true,
      })
      setEditingPriceId(null)
      await fetchProduct()
    } catch (err: any) {
      setPriceError(err?.response?.data?.error?.message ?? 'Failed to save price')
    } finally {
      setSavingPrice(false)
    }
  }

  const handleDeletePrice = async (priceId: string) => {
    if (!confirm('Delete this price row?')) return
    try {
      await posApi.admin.deleteProductPrice(id, priceId)
      await fetchProduct()
    } catch (err: any) {
      setPriceError(err?.response?.data?.error?.message ?? 'Failed to delete price')
    }
  }

  const handleAddPrice = async () => {
    if (!newPrice.basePrice && newPrice.basePrice !== 0) return
    try {
      setAddingPrice(true)
      setPriceError(null)
      await posApi.admin.createProductPrice(id, {
        ...(newPrice.visitorTypeId ? { visitorTypeId: newPrice.visitorTypeId } : {}),
        basePrice:      Number(newPrice.basePrice),
        currencyCode:   newPrice.currencyCode ?? 'INR',
        ...(newPrice.salesChannel ? { salesChannel: newPrice.salesChannel } : {}),
        ...(newPrice.effectiveFrom ? { effectiveFrom: newPrice.effectiveFrom } : {}),
        ...(newPrice.effectiveUntil ? { effectiveUntil: newPrice.effectiveUntil } : {}),
        isActive:       newPrice.isActive ?? true,
      })
      setShowAddPrice(false)
      setNewPrice({ basePrice: 0, currencyCode: 'INR', isActive: true })
      await fetchProduct()
    } catch (err: any) {
      setPriceError(err?.response?.data?.error?.message ?? 'Failed to add price')
    } finally {
      setAddingPrice(false)
    }
  }

  const inputCls = 'bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <>
      <button
        onClick={() => setShowSlideOver(true)}
        className="px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-700/50 text-xs font-semibold"
      >
        View/Edit
      </button>

      {showSlideOver && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setShowSlideOver(false)}>
          <div
            className="w-full max-w-2xl bg-slate-900 border-l border-slate-700 h-full overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-semibold text-white">{loading ? 'Loading...' : product?.name}</h2>
                {product && (
                  <>
                    <span className={clsx('px-2 py-1 rounded-full text-xs font-semibold border', typeBadge(product.productType))}>
                      {product.productType.replace(/_/g, ' ')}
                    </span>
                    <span className={clsx('px-2 py-1 rounded-full text-xs font-semibold border', product.isActive ? 'bg-green-900/50 text-green-300 border-green-700/50' : 'bg-slate-700 text-slate-400 border-slate-600')}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </>
                )}
              </div>
              <button onClick={() => setShowSlideOver(false)} className="text-slate-400 hover:text-slate-300 text-2xl flex-shrink-0">×</button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {error && <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg text-red-300 text-sm mb-4">{error}</div>}

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : product ? (
                <>
                  {/* Details */}
                  <div className="mb-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Details</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Name</label>
                        <input type="text" className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" value={nameForm} onChange={(e) => setNameForm(e.target.value)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Code</p>
                          <span className="font-mono text-slate-300 text-sm">{product.code || '—'}</span>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Type</p>
                          <span className={clsx('px-2 py-1 rounded-full text-xs font-semibold border inline-block', typeBadge(product.productType))}>{product.productType.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div className="relative">
                          <input type="checkbox" className="sr-only" checked={isActiveForm} onChange={(e) => setIsActiveForm(e.target.checked)} />
                          <div className={clsx('w-10 h-6 rounded-full transition-colors', isActiveForm ? 'bg-blue-600' : 'bg-slate-600')} />
                          <div className={clsx('absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform', isActiveForm ? 'translate-x-4' : '')} />
                        </div>
                        <span className="text-slate-300 text-sm">Active</span>
                      </label>
                      <div className="flex items-center gap-2 pt-2">
                        <button onClick={handleSaveDetails} disabled={savingDetails} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50">
                          {savingDetails ? 'Saving...' : 'Save Details'}
                        </button>
                        {detailsSaved && <span className="text-green-300 text-sm">✓ Saved</span>}
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pricing ({product.prices?.length ?? 0})</h3>
                      <button
                        onClick={() => { setShowAddPrice(true); setPriceError(null) }}
                        className="px-3 py-1 rounded-lg bg-green-700 hover:bg-green-600 text-white text-xs font-semibold"
                      >
                        + Add Price
                      </button>
                    </div>

                    {priceError && <div className="p-2 bg-red-900/20 border border-red-700/50 rounded-lg text-red-300 text-xs mb-3">{priceError}</div>}

                    {/* Add price form */}
                    {showAddPrice && (
                      <div className="bg-slate-800 rounded-xl p-4 mb-4 space-y-3 border border-slate-600">
                        <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">New Price Row</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Visitor Type</label>
                            <select value={newPrice.visitorTypeId ?? ''} onChange={(e) => setNewPrice({ ...newPrice, ...(e.target.value ? { visitorTypeId: e.target.value } : { visitorTypeId: undefined as never }) })} className={inputCls + ' w-full'}>
                              <option value="">All visitors</option>
                              {visitorTypes.map((vt) => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Sales Channel</label>
                            <select value={newPrice.salesChannel ?? ''} onChange={(e) => setNewPrice({ ...newPrice, ...(e.target.value ? { salesChannel: e.target.value } : { salesChannel: undefined as never }) })} className={inputCls + ' w-full'}>
                              <option value="">All</option>
                              {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Base Price</label>
                            <input type="number" min="0" step="0.01" value={newPrice.basePrice ?? 0} onChange={(e) => setNewPrice({ ...newPrice, basePrice: parseFloat(e.target.value) || 0 })} className={inputCls + ' w-full'} />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Currency</label>
                            <input type="text" maxLength={3} value={newPrice.currencyCode ?? 'INR'} onChange={(e) => setNewPrice({ ...newPrice, currencyCode: e.target.value.toUpperCase() })} className={inputCls + ' w-full'} />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Effective From</label>
                            <input type="date" value={newPrice.effectiveFrom?.slice(0, 10) ?? ''} onChange={(e) => setNewPrice({ ...newPrice, ...(e.target.value ? { effectiveFrom: e.target.value } : { effectiveFrom: undefined as never }) })} className={inputCls + ' w-full'} />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Effective Until</label>
                            <input type="date" value={newPrice.effectiveUntil?.slice(0, 10) ?? ''} onChange={(e) => setNewPrice({ ...newPrice, ...(e.target.value ? { effectiveUntil: e.target.value } : { effectiveUntil: undefined as never }) })} className={inputCls + ' w-full'} />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <div className="relative">
                            <input type="checkbox" className="sr-only" checked={newPrice.isActive ?? true} onChange={(e) => setNewPrice({ ...newPrice, isActive: e.target.checked })} />
                            <div className={clsx('w-8 h-5 rounded-full transition-colors', (newPrice.isActive ?? true) ? 'bg-blue-600' : 'bg-slate-600')} />
                            <div className={clsx('absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform', (newPrice.isActive ?? true) ? 'translate-x-3' : '')} />
                          </div>
                          <span className="text-slate-300 text-xs">Active</span>
                        </label>
                        <div className="flex gap-2">
                          <button onClick={handleAddPrice} disabled={addingPrice} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50">
                            {addingPrice ? 'Adding...' : 'Add'}
                          </button>
                          <button onClick={() => setShowAddPrice(false)} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold">Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Price rows */}
                    {product.prices && product.prices.length > 0 ? (
                      <div className="space-y-2">
                        {product.prices.map((price) => (
                          editingPriceId === price.id ? (
                            /* Inline edit form */
                            <div key={price.id} className="bg-slate-800 rounded-xl p-4 space-y-3 border border-blue-700/50">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-slate-400 mb-1 block">Visitor Type</label>
                                  <select value={editingPrice.visitorTypeId ?? ''} onChange={(e) => setEditingPrice({ ...editingPrice, visitorTypeId: e.target.value || null })} className={inputCls + ' w-full'}>
                                    <option value="">All visitors</option>
                                    {visitorTypes.map((vt) => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-slate-400 mb-1 block">Channel</label>
                                  <select value={editingPrice.salesChannel ?? ''} onChange={(e) => setEditingPrice({ ...editingPrice, salesChannel: e.target.value || null })} className={inputCls + ' w-full'}>
                                    <option value="">All</option>
                                    {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-slate-400 mb-1 block">Base Price</label>
                                  <input type="number" min="0" step="0.01" value={editingPrice.basePrice ?? 0} onChange={(e) => setEditingPrice({ ...editingPrice, basePrice: parseFloat(e.target.value) || 0 })} className={inputCls + ' w-full'} />
                                </div>
                                <div>
                                  <label className="text-xs text-slate-400 mb-1 block">Currency</label>
                                  <input type="text" maxLength={3} value={editingPrice.currencyCode ?? 'INR'} onChange={(e) => setEditingPrice({ ...editingPrice, currencyCode: e.target.value.toUpperCase() })} className={inputCls + ' w-full'} />
                                </div>
                                <div>
                                  <label className="text-xs text-slate-400 mb-1 block">Effective From</label>
                                  <input type="date" value={(editingPrice.effectiveFrom ?? '').slice(0, 10)} onChange={(e) => setEditingPrice({ ...editingPrice, effectiveFrom: e.target.value || null })} className={inputCls + ' w-full'} />
                                </div>
                                <div>
                                  <label className="text-xs text-slate-400 mb-1 block">Effective Until</label>
                                  <input type="date" value={(editingPrice.effectiveUntil ?? '').slice(0, 10)} onChange={(e) => setEditingPrice({ ...editingPrice, effectiveUntil: e.target.value || null })} className={inputCls + ' w-full'} />
                                </div>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <div className="relative">
                                  <input type="checkbox" className="sr-only" checked={editingPrice.isActive ?? true} onChange={(e) => setEditingPrice({ ...editingPrice, isActive: e.target.checked })} />
                                  <div className={clsx('w-8 h-5 rounded-full transition-colors', (editingPrice.isActive ?? true) ? 'bg-blue-600' : 'bg-slate-600')} />
                                  <div className={clsx('absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform', (editingPrice.isActive ?? true) ? 'translate-x-3' : '')} />
                                </div>
                                <span className="text-slate-300 text-xs">Active</span>
                              </label>
                              <div className="flex gap-2">
                                <button onClick={handleSavePrice} disabled={savingPrice} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50">
                                  {savingPrice ? 'Saving...' : 'Save'}
                                </button>
                                <button onClick={() => setEditingPriceId(null)} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            /* Read row */
                            <div key={price.id} className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3 hover:bg-slate-800/80 transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-white text-sm font-semibold font-mono">
                                    ₹{Number(price.basePrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-slate-400 text-xs">{price.currencyCode}</span>
                                  {price.salesChannel && <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 text-xs">{price.salesChannel}</span>}
                                  <span className="text-blue-400 text-xs">{vtName(price.visitorTypeId)}</span>
                                  {!price.isActive && <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 text-xs">inactive</span>}
                                </div>
                                {(price.effectiveFrom || price.effectiveUntil) && (
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {price.effectiveFrom ? fmtTime(price.effectiveFrom) : '—'} → {price.effectiveUntil ? fmtTime(price.effectiveUntil) : '∞'}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-3">
                                <button onClick={() => startEditPrice(price as PriceRow)} className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-700/50 text-xs font-semibold">Edit</button>
                                <button onClick={() => handleDeletePrice(price.id)} className="px-2 py-1 rounded-lg bg-red-900/30 hover:bg-red-800/50 text-red-400 border border-red-700/50 text-xs font-semibold">×</button>
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm">No pricing defined. Click "Add Price" to create the first entry.</p>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-700">
              <button onClick={() => setShowSlideOver(false)} className="w-full px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
