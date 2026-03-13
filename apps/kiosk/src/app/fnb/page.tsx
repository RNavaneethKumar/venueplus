'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
  headers: { 'x-venue-id': process.env.NEXT_PUBLIC_VENUE_ID ?? '' },
})

interface FnbItem {
  id: string
  name?: string
  preparationTimeMinutes: number
  isOutOfStock: boolean
  product?: { id: string; name: string; basePrice?: string }
}

interface Category {
  id: string
  name: string
  items: FnbItem[]
}

interface CartLine {
  item: FnbItem
  qty: number
}

export default function FnbPage() {
  const router = useRouter()
  const [menu, setMenu] = useState<Category[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    api.get('/fnb/menu')
      .then((r) => {
        setMenu(r.data.data)
        if (r.data.data.length > 0) setActiveCategory(r.data.data[0].id)
      })
      .catch(() => toast.error('Could not load menu'))
  }, [])

  const addItem = (item: FnbItem) => {
    if (item.isOutOfStock) { toast.error('Out of stock'); return }
    setCart((prev) => {
      const ex = prev.find((c) => c.item.id === item.id)
      if (ex) return prev.map((c) => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { item, qty: 1 }]
    })
  }

  const removeItem = (id: string) => setCart((prev) => prev.filter((c) => c.item.id !== id))

  const getPrice = (item: FnbItem) => Number(item.product?.basePrice ?? 0)
  const subtotal = cart.reduce((s, c) => s + getPrice(c.item) * c.qty, 0)
  const total = subtotal * 1.05  // 5% GST on F&B

  const handleOrder = async () => {
    if (cart.length === 0) return
    setProcessing(true)
    try {
      const res = await api.post('/orders', {
        channel: 'kiosk',
        items: cart.map((c) => ({
          productId: c.item.product?.id ?? c.item.id,
          quantity: c.qty,
          unitPrice: getPrice(c.item),
          discountAmount: 0,
        })),
        payments: [{ method: 'upi', amount: total }],
      })
      router.push(`/confirmation?orderId=${res.data.data.id}&orderNumber=${res.data.data.orderNumber}`)
    } catch {
      toast.error('Order failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const activeItems = menu.find((c) => c.id === activeCategory)?.items ?? []

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center gap-4 p-5 border-b border-white/10">
        <button onClick={() => router.push('/')} className="text-white/60 hover:text-white text-2xl">←</button>
        <h1 className="text-2xl font-bold">Order Food & Drinks</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Category sidebar */}
        <aside className="w-36 bg-black/20 border-r border-white/10 overflow-y-auto">
          {menu.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`w-full py-4 px-3 text-sm font-medium text-center transition-colors ${
                activeCategory === cat.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </aside>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-4">
            {activeItems.map((item) => (
              <button
                key={item.id}
                onClick={() => addItem(item)}
                disabled={item.isOutOfStock}
                className={`kiosk-card text-left transition-all active:scale-95 ${
                  item.isOutOfStock
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:border-indigo-400 hover:bg-white/15'
                }`}
              >
                <p className="text-3xl mb-2">🍽️</p>
                <p className="font-bold leading-tight">{item.product?.name ?? 'Item'}</p>
                <p className="text-indigo-300 font-bold text-xl mt-2">
                  ₹{getPrice(item).toLocaleString('en-IN')}
                </p>
                <p className="text-white/40 text-xs mt-1">~{item.preparationTimeMinutes} min</p>
                {item.isOutOfStock && (
                  <span className="text-red-400 text-xs font-medium">Out of stock</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="w-64 border-l border-white/10 flex flex-col p-4 bg-black/20">
          <h2 className="font-bold mb-3">Your Order</h2>
          <div className="flex-1 overflow-y-auto space-y-2">
            {cart.length === 0 ? (
              <p className="text-white/40 text-sm">No items yet</p>
            ) : (
              cart.map((c) => (
                <div key={c.item.id} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium">{c.item.product?.name ?? 'Item'}</p>
                    <p className="text-white/50">× {c.qty}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-indigo-300 font-bold text-xs">
                      ₹{(getPrice(c.item) * c.qty).toLocaleString('en-IN')}
                    </span>
                    <button onClick={() => removeItem(c.item.id)} className="text-white/30 hover:text-red-400 ml-1">✕</button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-white/10 pt-3 mt-3 space-y-1 text-sm">
            <div className="flex justify-between text-white/60"><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
            <div className="flex justify-between text-white/60"><span>GST (5%)</span><span>₹{(subtotal * 0.05).toFixed(0)}</span></div>
            <div className="flex justify-between font-bold text-lg mt-1"><span>Total</span><span>₹{total.toFixed(0)}</span></div>
          </div>
          <button
            onClick={handleOrder}
            disabled={cart.length === 0 || processing}
            className="kiosk-btn-primary w-full mt-4 py-3"
          >
            {processing ? 'Placing Order…' : 'Order Now'}
          </button>
        </div>
      </div>
    </div>
  )
}
