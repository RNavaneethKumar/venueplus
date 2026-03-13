'use client'

import AdminPageShell from '@/components/admin/AdminPageShell';

export default function ApiKeysPage() {
  return (
    <AdminPageShell
      title="API Keys"
      description="Manage developer API access tokens"
      icon="🔑"
    >
      <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/40 p-8 text-center">
        <div className="text-5xl mb-4">🔑</div>
        <h2 className="font-bold text-white text-xl mb-2">API Key Management</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
          Generate and manage API keys for third-party integrations. Keys are scoped to a venue and can be granted specific permissions.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-900/40 border border-amber-700/40 text-amber-300 text-sm">
          <span>🚧</span>
          <span>Coming soon — database schema is ready, UI in progress</span>
        </div>
      </div>
    </AdminPageShell>
  );
}
