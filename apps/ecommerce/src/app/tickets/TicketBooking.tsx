'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
  headers: { 'x-venue-id': process.env.NEXT_PUBLIC_VENUE_ID ?? '' },
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisitorType {
  id: string
  name: string
  code: string
  isMinor: boolean
}

interface PriceRow {
  id: string
  visitorTypeId: string | null
  visitorType: VisitorType | null
  basePrice: string
  currencyCode: string
}

interface Product {
  id: string
  name: string
  description?: string
  productType: string
  basePrice: string | null
  prices: PriceRow[]
}

// One cart line = one product × one visitor type
interface CartLine {
  productId: string
  productName: string
  visitorTypeId: string | null
  visitorTypeName: string
  unitPrice: number
  qty: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const cartKey = (productId: string, visitorTypeId: string | null) =>
  `${productId}::${visitorTypeId ?? 'default'}`

// ─── Component ────────────────────────────────────────────────────────────────

export default function TicketBooking() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<Map<string, CartLine>>(new Map())
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    api
      .get('/products?channel=online')
      .then((r) => {
        setProducts(r.data.data.filter((p: Product) => p.productType === 'ticket'))
      })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false))
  }, [])

  const getQty = (productId: string, visitorTypeId: string | null) =>
    cart.get(cartKey(productId, visitorTypeId))?.qty ?? 0

  const updateQty = (
    product: Product,
    price: PriceRow,
    delta: number
  ) => {
    const key = cartKey(product.id, price.visitorTypeId)
    setCart((prev) => {
      const next = new Map(prev)
      const existing = next.get(key)
      const newQty = (existing?.qty ?? 0) + delta
      if (newQty <= 0) {
        next.delete(key)
      } else {
        next.set(key, {
          productId: product.id,
          productName: product.name,
          visitorTypeId: price.visitorTypeId,
          visitorTypeName: price.visitorType?.name ?? 'Standard',
          unitPrice: Number(price.basePrice),
          qty: newQty,
        })
      }
      return next
    })
  }

  const cartLines = Array.from(cart.values())
  const subtotal = cartLines.reduce((s, c) => s + c.unitPrice * c.qty, 0)
  const tax = subtotal * 0.18
  const total = subtotal + tax

  const handleCheckout = async () => {
    if (cartLines.length === 0) {
      toast.error('Please add tickets to your cart')
      return
    }
    setProcessing(true)
    try {
      const res = await api.post('/orders', {
        channel: 'online',
        visitDate: date,
        items: cartLines.map((c) => ({
          productId: c.productId,
          visitorTypeId: c.visitorTypeId ?? undefined,
          quantity: c.qty,
          unitPrice: c.unitPrice,
          discountAmount: 0,
        })),
        payments: [{ method: 'upi', amount: total }],
      })
      router.push(`/booking/confirmation?order=${res.data.data.orderNumber}`)
    } catch {
      toast.error('Booking failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Products */}
      <div className="lg:col-span-2 space-y-4">
        {/* Date picker */}
        <div className="border border-gray-200 rounded-xl p-4 flex items-center gap-4">
          <span className="text-2xl">📅</span>
          <div>
            <p className="font-semibold">Select Visit Date</p>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        {/* Ticket products */}
        {products.map((product) => {
          // Fallback: if no prices returned, show a placeholder row
          const priceRows: PriceRow[] =
            product.prices.length > 0
              ? product.prices
              : product.basePrice
              ? [{ id: 'default', visitorTypeId: null, visitorType: null, basePrice: product.basePrice, currencyCode: 'INR' }]
              : []

          return (
            <div key={product.id} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Product header */}
              <div className="flex items-center gap-4 p-5 bg-gray-50">
                <div className="text-3xl">🎟️</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold">{product.name}</p>
                  {product.description && (
                    <p className="text-gray-500 text-sm truncate">{product.description}</p>
                  )}
                </div>
                {product.basePrice && (
                  <p className="text-sm text-gray-400 shrink-0">
                    from ₹{Number(product.basePrice).toLocaleString('en-IN')}
                  </p>
                )}
              </div>

              {/* Per-visitor-type price rows */}
              <div className="divide-y divide-gray-100">
                {priceRows.map((price) => {
                  const qty = getQty(product.id, price.visitorTypeId)
                  const label = price.visitorType?.name ?? 'Standard'
                  const isMinor = price.visitorType?.isMinor ?? false

                  return (
                    <div
                      key={price.id}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                        {isMinor && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                            Child
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-indigo-600 w-20 text-right">
                          ₹{Number(price.basePrice).toLocaleString('en-IN')}
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateQty(product, price, -1)}
                            disabled={qty === 0}
                            className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center font-bold hover:border-indigo-500 hover:text-indigo-500 disabled:opacity-30 transition-colors"
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-bold tabular-nums">{qty}</span>
                          <button
                            onClick={() => updateQty(product, price, 1)}
                            className="w-8 h-8 rounded-full border-2 border-indigo-500 bg-indigo-500 text-white flex items-center justify-center font-bold hover:bg-indigo-600 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Order summary */}
      <div className="lg:col-span-1">
        <div className="border border-gray-200 rounded-xl p-5 sticky top-24">
          <h3 className="font-bold text-lg mb-4">Order Summary</h3>

          {cartLines.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">No tickets selected</p>
          ) : (
            <div className="space-y-2 mb-4">
              {cartLines.map((c) => (
                <div key={cartKey(c.productId, c.visitorTypeId)} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {c.productName}
                    {c.visitorTypeId && (
                      <span className="text-gray-400"> · {c.visitorTypeName}</span>
                    )}
                    {' '}× {c.qty}
                  </span>
                  <span className="font-medium">
                    ₹{(c.unitPrice * c.qty).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST (18%)</span>
              <span>₹{tax.toFixed(0)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-1 border-t">
              <span>Total</span>
              <span className="text-indigo-600">₹{total.toFixed(0)}</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cartLines.length === 0 || processing}
            className="btn-primary w-full mt-4 rounded-xl py-3"
          >
            {processing ? 'Processing…' : 'Proceed to Pay'}
          </button>

          <p className="text-xs text-gray-400 text-center mt-3">
            Secure payment · Instant confirmation
          </p>
        </div>
      </div>
    </div>
  )
}
