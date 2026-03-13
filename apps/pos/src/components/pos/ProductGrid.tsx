'use client'

import { useState } from 'react'
import { usePosStore } from '@/store/posStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisitorType { id: string; name: string; code: string; isMinor: boolean }
interface PriceRow {
  id: string; visitorTypeId: string | null; visitorType: VisitorType | null
  basePrice: string; currencyCode: string
}
interface Product {
  id: string; name: string; productType: string
  basePrice: string | null; description?: string; prices: PriceRow[]
}
interface Props { products: Product[]; onProductAdded?: () => void }

// ─── Component ────────────────────────────────────────────────────────────────

const TICKET_TYPES = ['ticket', 'add_on']

const todayIso = () => new Date().toISOString().slice(0, 10)
const fmtDate  = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  })

export default function ProductGrid({ products, onProductAdded }: Props) {
  const { addToCart, visitDate } = usePosStore()
  const isTicket = (type: string) => TICKET_TYPES.includes(type)
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null)
  const [pickerQtys, setPickerQtys]       = useState<Record<string, number>>({})

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
        <span className="text-4xl">📦</span>
        <p className="text-sm">No products available</p>
      </div>
    )
  }

  const normalisePrices = (p: Product): PriceRow[] =>
    p.prices.length > 0 ? p.prices
    : p.basePrice
    ? [{ id: 'default', visitorTypeId: null, visitorType: null, basePrice: p.basePrice, currencyCode: 'INR' }]
    : []

  const openPicker = (product: Product) => {
    const rows = normalisePrices(product)
    if (rows.length === 0) { toast.error('No price configured'); return }
    if (rows.length === 1) { doAddSingle(product, rows[0]!); return }
    const initial: Record<string, number> = {}
    rows.forEach((r) => { initial[r.id] = 0 })
    setPickerQtys(initial)
    setPickerProduct(product)
  }

  const doAddSingle = (product: Product, price: PriceRow) => {
    addToCart({
      productId: product.id, productName: product.name, productType: product.productType,
      quantity: 1, unitPrice: Number(price.basePrice), discountAmount: 0,
      lineTotal: Number(price.basePrice),
      ...(price.visitorTypeId != null && { visitorTypeId: price.visitorTypeId }),
      ...(price.visitorType   != null && { visitorTypeName: price.visitorType.name }),
    })
    const dateLabel = isTicket(product.productType)
      ? ` · ${visitDate === todayIso() ? 'Today' : fmtDate(visitDate)}`
      : ''
    toast.success(`Added: ${product.name}${dateLabel}`, { duration: 1200, position: 'bottom-center' })
    onProductAdded?.()
  }

  const adjustQty = (priceId: string, delta: number) =>
    setPickerQtys((prev) => ({ ...prev, [priceId]: Math.max(0, (prev[priceId] ?? 0) + delta) }))

  const totalSelected = Object.values(pickerQtys).reduce((s, n) => s + n, 0)

  const commitPicker = () => {
    if (!pickerProduct || totalSelected === 0) return
    normalisePrices(pickerProduct).forEach((price) => {
      const qty = pickerQtys[price.id] ?? 0
      if (qty === 0) return
      addToCart({
        productId: pickerProduct.id, productName: pickerProduct.name,
        productType: pickerProduct.productType,
        quantity: qty, unitPrice: Number(price.basePrice), discountAmount: 0,
        lineTotal: qty * Number(price.basePrice),
        ...(price.visitorTypeId != null && { visitorTypeId: price.visitorTypeId }),
        ...(price.visitorType   != null && { visitorTypeName: price.visitorType.name }),
      })
    })
    toast.success(
      `Added ${totalSelected} ticket${totalSelected !== 1 ? 's' : ''} — ${pickerProduct.name}`,
      { duration: 1200, position: 'bottom-center' }
    )
    setPickerProduct(null)
    onProductAdded?.()
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
        {products.map((product) => {
          const rows    = normalisePrices(product)
          const isMulti = rows.length > 1
          const fromPrice = product.basePrice
            ? `${isMulti ? 'from ' : ''}₹${Number(product.basePrice).toLocaleString('en-IN')}`
            : 'Configurable'
          return (
            <button
              key={product.id}
              onClick={() => openPicker(product)}
              className={clsx(
                'group relative flex flex-col text-left rounded-2xl border border-slate-700',
                'bg-slate-800 hover:border-blue-500 p-3 sm:p-4',
                'transition-all duration-150 active:scale-[0.97] active:bg-slate-700',
                'min-h-[100px] sm:min-h-[110px] select-none'
              )}
            >
              <span className="text-2xl sm:text-3xl mb-2 leading-none">{productEmoji(product.productType)}</span>
              <p className="text-sm sm:text-base font-semibold text-white leading-snug line-clamp-2 flex-1">{product.name}</p>
              <div className="mt-2 flex items-end justify-between">
                <p className="text-sm font-bold text-blue-400">{fromPrice}</p>
                {isMulti && <span className="text-xs text-slate-500">{rows.length} types ›</span>}
              </div>
              <span className="absolute inset-0 rounded-2xl ring-2 ring-blue-500 opacity-0 group-active:opacity-100 transition-opacity duration-100 pointer-events-none" />
            </button>
          )
        })}
      </div>

      {pickerProduct && (() => {
        const rows = normalisePrices(pickerProduct)
        return (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
            onClick={() => setPickerProduct(null)}
          >
            <div
              className="bg-slate-800 border border-slate-700 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-slate-600" />
              </div>
              <div className="flex items-start justify-between px-5 pt-3 pb-3 shrink-0 border-b border-slate-700">
                <div>
                  <h3 className="font-bold text-white text-lg">{pickerProduct.name}</h3>
                  {isTicket(pickerProduct.productType) ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs">📅</span>
                      <span className="text-xs font-semibold text-blue-400">
                        {visitDate === todayIso() ? 'Today' : fmtDate(visitDate)}
                      </span>
                      <span className="text-xs text-slate-500">· Tap + to select quantities</span>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm mt-0.5">Tap + to select quantities</p>
                  )}
                </div>
                <button
                  onClick={() => setPickerProduct(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300"
                >✕</button>
              </div>

              <div className="overflow-y-auto px-4 py-3 space-y-2 flex-1">
                {rows.map((price) => {
                  const qty = pickerQtys[price.id] ?? 0
                  return (
                    <div
                      key={price.id}
                      className={clsx(
                        'flex items-center justify-between rounded-2xl px-4 py-3 transition-colors',
                        qty > 0 ? 'bg-blue-900/40 border border-blue-600/50' : 'bg-slate-700'
                      )}
                    >
                      <div>
                        <p className="font-semibold text-white">{price.visitorType?.name ?? 'Standard'}</p>
                        <p className="text-sm text-blue-400 font-bold tabular-nums">
                          ₹{Number(price.basePrice).toLocaleString('en-IN')}
                        </p>
                        {price.visitorType?.isMinor && (
                          <p className="text-xs text-blue-400 mt-0.5">Under 18</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => adjustQty(price.id, -1)}
                          disabled={qty === 0}
                          className="w-10 h-10 rounded-full bg-slate-600 hover:bg-slate-500 disabled:opacity-30 text-white text-xl font-bold flex items-center justify-center"
                        >−</button>
                        <span className="w-6 text-center font-bold text-white text-lg tabular-nums">{qty}</span>
                        <button
                          onClick={() => adjustQty(price.id, 1)}
                          className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold flex items-center justify-center"
                        >+</button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="px-4 py-4 border-t border-slate-700 shrink-0">
                <button
                  onClick={commitPicker}
                  disabled={totalSelected === 0}
                  className={clsx(
                    'w-full py-4 rounded-2xl font-bold text-lg transition-all',
                    totalSelected > 0
                      ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  )}
                >
                  {totalSelected === 0
                    ? 'Select at least one'
                    : isTicket(pickerProduct.productType)
                      ? `Add ${totalSelected} ticket${totalSelected !== 1 ? 's' : ''} · ${visitDate === todayIso() ? 'Today' : fmtDate(visitDate)}`
                      : `Add ${totalSelected} item${totalSelected !== 1 ? 's' : ''} to cart`
                  }
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}

function productEmoji(type: string): string {
  const map: Record<string, string> = {
    ticket:'🎟️', add_on:'➕', food_beverage:'🍔', retail:'🛍️',
    wallet_load:'💰', gift_card:'🎁', membership:'⭐', donation:'❤️', adoption:'🐾',
  }
  return map[type] ?? '📦'
}
