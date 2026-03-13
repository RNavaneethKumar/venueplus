'use client'

/**
 * AdminPageShell — Standard page wrapper for admin screens.
 * Provides consistent header, description, and content area.
 */

interface Props {
  title:       string
  description?: string
  icon:        string
  actions?:    React.ReactNode
  children:    React.ReactNode
}

export default function AdminPageShell({ title, description, icon, actions, children }: Props) {
  return (
    <div className="h-full flex flex-col bg-gray-950 text-white">
      {/* Page header */}
      <div className="flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg sm:text-xl shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-white text-lg sm:text-xl leading-tight truncate">{title}</h1>
            {description && (
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5 truncate">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 ml-3">{actions}</div>
        )}
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 pb-24">
        {children}
      </div>
    </div>
  )
}

/**
 * Placeholder card for screens that are in development.
 */
export function ComingSoonCard({ feature }: { feature: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 rounded-2xl border border-dashed border-slate-600 bg-slate-900/40 py-12 px-6 text-center">
      <div className="text-4xl mb-4">🚧</div>
      <h2 className="font-bold text-white text-lg mb-2">{feature}</h2>
      <p className="text-slate-400 text-sm max-w-sm">
        This screen is scaffolded and ready for implementation. The API endpoints and database
        schema are in place — add your UI here.
      </p>
    </div>
  )
}

/**
 * Stats card for dashboard / overview pages.
 */
export function StatCard({
  label,
  value,
  icon,
  trend,
  color = 'blue',
}: {
  label:   string
  value:   string | number
  icon:    string
  trend?:  string
  color?:  'blue' | 'green' | 'amber' | 'red'
}) {
  const colorMap = {
    blue:  'from-blue-900/40 to-blue-900/10 border-blue-700/30',
    green: 'from-green-900/40 to-green-900/10 border-green-700/30',
    amber: 'from-amber-900/40 to-amber-900/10 border-amber-700/30',
    red:   'from-red-900/40 to-red-900/10 border-red-700/30',
  }

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</p>
          <p className="text-white font-bold text-2xl mt-1 tabular-nums">{value}</p>
          {trend && <p className="text-slate-400 text-xs mt-1">{trend}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}
