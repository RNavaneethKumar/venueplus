'use client'

import { useEffect } from 'react'
import { usePosStore } from '@/store/posStore'
import clsx from 'clsx'

const ALL_TABS = [
  { key: 'tickets',    label: '🎟️ Tickets',  flagKey: 'tickets'     as const },
  { key: 'fnb',        label: '🍔 F&B',       flagKey: 'fnb'         as const },
  { key: 'retail',     label: '🛍️ Retail',    flagKey: 'retail'      as const },
  { key: 'wallet',     label: '💳 Wallet',    flagKey: 'wallet'      as const },
  { key: 'membership', label: '⭐ Members',   flagKey: 'memberships' as const },
]

export default function Tabs() {
  const { activeTab, setActiveTab, venueConfig } = usePosStore()

  const enabledTabs = ALL_TABS.filter((t) => venueConfig.tabs[t.flagKey] !== false)

  // If the current activeTab is disabled, auto-switch to the first enabled tab
  useEffect(() => {
    const isCurrentEnabled = enabledTabs.some((t) => t.key === activeTab)
    if (!isCurrentEnabled && enabledTabs.length > 0) {
      setActiveTab(enabledTabs[0]!.key as any)
    }
  }, [venueConfig.tabs])

  if (enabledTabs.length === 0) return null

  return (
    <div className="flex border-b border-slate-700 bg-slate-900 shrink-0">
      {enabledTabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key as any)}
          className={clsx(
            'flex-1 py-3 text-sm font-medium transition-colors',
            activeTab === tab.key
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
