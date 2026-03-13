'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import clsx from 'clsx'

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

const cartKey = (productId: string, visitorTypeId: string | null) =>
  `${productId}::${visitorTypeId ?? 'default'}`

// ─── Component ────────────────────────────────────────────────────────────────

export default function BuyPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<Map<string, CartLine>>(new Map())
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [processing, setProcessing] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    api
      .get('/products?channel=kiosk')
      .then((r) => {
        const tickets = r.data.data.filter((p: Product) =>
          ['ticket', 'add_on'].includes(p.productType)
        )
        setProducts(tickets)
      })
      .catch(() => toast.error('Could not load products'))
  }, [])

  const getQty = (productId: string, visitorTypeId: string | null) =>
    cart.get(cartKey(productId, visitorTypeId))?.qty ?? 0

  const updateQty = (product: Product, price: PriceRow, delta: number) => {
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
  const totalWithTax = subtotal * 1.18

  const handleCheckout = async () => {
    if (cartLines.length === 0) return
    setProcessing(true)
    try {
      const res = await api.post('/orders', {
        channel: 'kiosk',
        items: cartLines.map((c) => ({
          productId: c.productId,
          visitorTypeId: c.visitorTypeId ?? undefined,
          quantity: c.qty,
          unitPrice: c.unitPrice,
          discountAmount: 0,
        })),
        payments: [{ method: 'upi', amount: totalWithTax }],
      })
      router.push(
        `/confirmation?orderId=${res.data.data.id}&orderNumber=${res.data.data.orderNumber}`
      )
    } catch {
      toast.error('Checkout failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  // Get price rows for the selected product (with fallback for no-visitor-type products)
  const selectedPriceRows: PriceRow[] = selectedProduct
    ? selectedProduct.prices.length > 0
      ? selectedProduct.prices
      : selectedProduct.basePrice
      ? [{ id: 'default', visitorTypeId: null, visitorType: null, basePrice: selectedProduct.basePrice, currencyCode: 'INR' }]
      : []
    : []

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 p-5 border-b border-white/10">
        <button
          onClick={() => router.push('/')}
          className="text-white/60 hover:text-white text-2xl"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold">Select Tickets</h1>
        <div className="ml-auto">
          <label className="text-sm text-white/60 mr-2">Visit Date</label>
          <input
            type="date"
            value={date}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm"
          />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Product tiles */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => {
              const totalQty = cartLines
                .filter((c) => c.productId === p.id)
                .reduce((s, c) => s + c.qty, 0)
              const isSelected = selectedProduct?.id === p.id

              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(isSelected ? null : p)}
                  className={clsx(
                    'kiosk-card text-left transition-all active:scale-95',
                    isSelected
                      ? 'border-indigo-400 bg-indigo-500/20'
                      : 'hover:border-indigo-400 hover:bg-white/15'
                  )}
                >
                  <p className="text-3xl mb-2">🎟️</p>
                  <p className="font-bold text-lg leading-tight">{p.name}</p>
                  {p.description && (
                    <p className="text-white/60 text-sm mt-1 line-clamp-2">{p.description}</p>
                  )}
                  {p.basePrice ? (
                    <p className="text-indigo-300 font-bold text-xl mt-3">
                      from ₹{Number(p.basePrice).toLocaleString('en-IN')}
                    </p>
                  ) : (
                    <p className="text-white/40 text-sm mt-3">No price configured</p>
                  )}
                  {totalQty > 0 && (
                    <span className="mt-2 inline-block bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {totalQty} in cart
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Visitor type selector — shown below tiles when a product is selected */}
          {selectedProduct && (
            <div className="mt-5 bg-white/10 border border-white/20 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-lg">{selectedProduct.name}</h2>
                  <p className="text-white/60 text-sm">Select quantities by ticket type</p>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-white/40 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                {selectedPriceRows.map((price) => {
                  const qty = getQty(selectedProduct.id, price.visitorTypeId)
                  const label = price.visitorType?.name ?? 'Standard'
                  return (
                    <div
                      key={price.id}
                      className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3"
                    >
                      <div>
                        <p className="font-semibold">{label}</p>
                        {price.visitorType?.isMinor && (
                          <p className="text-xs text-blue-300">Under 12</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-indigo-300 font-bold text-lg">
                          ₹{Number(price.basePrice).toLocaleString('en-IN')}
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateQty(selectedProduct, price, -1)}
                            disabled={qty === 0}
                            className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center text-xl font-bold hover:border-indigo-400 hover:text-indigo-300 disabled:opacity-30 transition-colors"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-xl font-bold tabular-nums">
                            {qty}
                          </span>
                          <button
                            onClick={() => updateQty(selectedProduct, price, 1)}
                            className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-xl font-bold hover:bg-indigo-400 transition-colors"
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
          )}
        </div>

        {/* Right: Cart sidebar */}
        <div className="w-72 border-l border-white/10 flex flex-col p-4 bg-black/20">
          <h2 className="font-bold text-lg mb-3">Your Order</h2>
          <div className="flex-1 overflow-y-auto space-y-2">
            {cartLines.length === 0 ? (
              <p className="text-white/40 text-sm">No items yet</p>
            ) : (
              cartLines.map((c) => (
                <div
                  key={cartKey(c.productId, c.visitorTypeId)}
                  className="flex justify-between items-start text-sm"
                >
                  <div>
                    <p className="font-medium leading-tight">{c.productName}</p>
                    <p className="text-white/50 text-xs">
                      {c.visitorTypeName} × {c.qty}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-indigo-300 font-bold">
                      ₹{(c.unitPrice * c.qty).toLocaleString('en-IN')}
                    </span>
                    <button
                      onClick={() =>
                        setCart((prev) => {
                          const next = new Map(prev)
                          next.delete(cartKey(c.productId, c.visitorTypeId))
                          return next
                        })
                      }
                      className="text-white/30 hover:text-red-400 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-white/10 pt-3 mt-3 space-y-1 text-sm">
            <div className="flex justify-between text-white/60">
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>GST (18%)</span>
              <span>₹{(subtotal * 0.18).toFixed(0)}</span>
            </div>
            <div className="flex justify-between font-bold text-xl mt-1">
              <span>Total</span>
              <span>₹{totalWithTax.toFixed(0)}</span>
            </div>
          </div>
          <button
            onClick={handleCheckout}
            disabled={cartLines.length === 0 || processing}
            className="kiosk-btn-primary w-full mt-4"
          >
            {processing ? 'Processing…' : 'Pay Now'}
          </button>
        </div>
      </div>
    </div>
  )
}
