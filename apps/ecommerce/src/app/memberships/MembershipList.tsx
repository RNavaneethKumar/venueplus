'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
  headers: { 'x-venue-id': process.env.NEXT_PUBLIC_VENUE_ID ?? '' },
})

interface Plan {
  id: string
  name: string
  billingCycle: string
  price: string
  maxMembers: number
  isFamilyPlan: boolean
}

const BILLING_LABEL: Record<string, string> = {
  monthly: '/month',
  quarterly: '/quarter',
  semi_annual: '/6 months',
  annual: '/year',
}

const PLAN_HIGHLIGHTS: Record<string, string[]> = {
  individual: ['Unlimited entry to all attractions', 'Up to 20% off tickets', '5 visits/month allowance', 'Skip-the-queue access'],
  family: ['Up to 4 family members', 'Unlimited attractions', 'Family F&B discounts', 'Priority booking', 'Monthly visit allowances'],
}

export default function MembershipList() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/memberships/plans')
      .then((r) => setPlans(r.data.data))
      .catch(() => toast.error('Failed to load plans'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="border border-gray-100 rounded-2xl p-8 animate-pulse">
            <div className="h-6 bg-gray-100 rounded w-1/2 mb-4" />
            <div className="h-12 bg-gray-100 rounded w-2/3 mb-6" />
            <div className="space-y-3">{[1,2,3,4].map((j) => <div key={j} className="h-4 bg-gray-100 rounded" />)}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {plans.map((plan, i) => {
          const isPopular = plan.isFamilyPlan || i === 1
          const highlights = (plan.isFamilyPlan ? PLAN_HIGHLIGHTS.family : PLAN_HIGHLIGHTS.individual) ?? []
          return (
            <div
              key={plan.id}
              className={`border-2 rounded-2xl p-8 relative ${
                isPopular ? 'border-indigo-500 shadow-xl shadow-indigo-100' : 'border-gray-200'
              }`}
            >
              {isPopular && (
                <span className="absolute -top-3 left-6 bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-black">{plan.name}</h3>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-4xl font-black text-indigo-600">
                  ₹{Number(plan.price).toLocaleString('en-IN')}
                </span>
                <span className="text-gray-500 text-lg mb-0.5">
                  {BILLING_LABEL[plan.billingCycle] ?? ''}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Up to {plan.maxMembers} member{plan.maxMembers > 1 ? 's' : ''}</p>

              <ul className="mt-6 space-y-3">
                {highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-indigo-500 mt-0.5">✓</span>
                    {h}
                  </li>
                ))}
              </ul>

              <Link
                href={`/tickets?planId=${plan.id}`}
                className={`mt-8 block text-center py-3 rounded-xl font-bold transition-colors ${
                  isPopular
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                Get Started
              </Link>
            </div>
          )
        })}
      </div>

      {/* FAQ section */}
      <div className="bg-gray-50 rounded-2xl p-8">
        <h2 className="text-xl font-black mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4 text-sm text-gray-700">
          {[
            ['Can I cancel anytime?', 'Yes, memberships can be cancelled or paused at any time. No long-term lock-in.'],
            ['When does billing start?', 'Billing starts from the date of purchase and auto-renews based on your plan cycle.'],
            ['Can I share my membership?', 'Individual plans are for one person. Family plans allow up to 4 named members.'],
            ['How do I use member benefits?', 'Show your QR code or log in at any checkout point to apply member discounts automatically.'],
          ].map(([q, a]) => (
            <details key={q} className="border border-gray-200 rounded-xl p-4 group">
              <summary className="font-semibold cursor-pointer list-none flex justify-between">
                {q}
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="mt-2 text-gray-500">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
