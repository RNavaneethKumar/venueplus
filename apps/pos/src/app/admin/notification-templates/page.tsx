'use client'

import { useEffect, useState } from 'react';
import { posApi } from '@/lib/api';
import AdminPageShell from '@/components/admin/AdminPageShell';
import clsx from 'clsx';

interface Template {
  id: string;
  venueId: string;
  channel: string;
  templateKey: string;
  subject: string;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const fmtTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const channelColors: Record<string, string> = {
  email: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
  sms: 'bg-green-900/50 text-green-300 border-green-700/50',
  push: 'bg-amber-900/50 text-amber-300 border-amber-700/50',
  whatsapp: 'bg-teal-900/50 text-teal-300 border-teal-700/50',
};

export default function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    channel: 'email',
    templateKey: '',
    subject: '',
    body: '',
  });
  const [editFormData, setEditFormData] = useState({
    subject: '',
    body: '',
    isActive: false,
  });

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await posApi.admin.listNotificationTemplates();
      setTemplates(response.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async () => {
    try {
      if (!createFormData.templateKey || !createFormData.body) {
        setError('Template key and body are required');
        return;
      }
      if (createFormData.channel === 'email' && !createFormData.subject) {
        setError('Subject is required for email templates');
        return;
      }
      await posApi.admin.createNotificationTemplate(createFormData);
      setCreateFormData({ channel: 'email', templateKey: '', subject: '', body: '' });
      setShowCreateModal(false);
      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setEditFormData({
      subject: template.subject,
      body: template.body,
      isActive: template.isActive,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      if (!editingTemplate) return;
      await posApi.admin.updateNotificationTemplate(editingTemplate.id, editFormData);
      setShowEditModal(false);
      setEditingTemplate(null);
      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template');
    }
  };

  return (
    <AdminPageShell
      title="Notification Templates"
      description="Email, SMS, push, and WhatsApp message templates"
      icon="📧"
      actions={
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
        >
          New Template
        </button>
      }
    >
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-red-300 text-sm mb-6">
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
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleEdit(template)}
                className="bg-slate-800 rounded-2xl p-4 cursor-pointer active:bg-slate-700"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-white text-sm font-semibold font-mono">{template.templateKey}</p>
                  <span className={clsx(
                    'px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0',
                    channelColors[template.channel] || 'bg-slate-700 text-slate-400 border-slate-600'
                  )}>{template.channel}</span>
                </div>
                <p className="text-slate-400 text-xs">{template.subject || '—'}</p>
                <p className="text-slate-500 text-xs mt-0.5">{fmtTime(template.updatedAt)}</p>
              </div>
            ))}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden sm:block rounded-2xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-semibold">Channel</th>
                  <th className="text-left px-4 py-3 font-semibold">Template Key</th>
                  <th className="text-left px-4 py-3 font-semibold">Subject</th>
                  <th className="text-left px-4 py-3 font-semibold">Active</th>
                  <th className="text-left px-4 py-3 font-semibold">Updated</th>
                  <th className="text-left px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-slate-300">
                      <span
                        className={clsx(
                          'px-2 py-1 rounded-full text-xs font-semibold border',
                          channelColors[template.channel] ||
                            'bg-slate-700 text-slate-400 border-slate-600'
                        )}
                      >
                        {template.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs font-mono">
                      {template.templateKey}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">
                      {template.subject || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <span
                        className={clsx(
                          'px-2 py-1 rounded-full text-xs font-semibold border',
                          template.isActive
                            ? 'bg-green-900/50 text-green-300 border-green-700/50'
                            : 'bg-slate-700 text-slate-400 border-slate-600'
                        )}
                      >
                        {template.isActive ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">
                      {fmtTime(template.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <button
                        onClick={() => handleEdit(template)}
                        className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold"
                      >
                        Edit
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6">
            <h2 className="text-white font-bold text-lg mb-4">New Notification Template</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Channel *
                </label>
                <select
                  value={createFormData.channel}
                  onChange={(e) => setCreateFormData({ ...createFormData, channel: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="push">Push</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Template Key *
                </label>
                <input
                  type="text"
                  placeholder="e.g. booking.confirmed"
                  value={createFormData.templateKey}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, templateKey: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {createFormData.channel === 'email' && (
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={createFormData.subject}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, subject: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Body *
                </label>
                <textarea
                  value={createFormData.body}
                  onChange={(e) => setCreateFormData({ ...createFormData, body: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6">
            <h2 className="text-white font-bold text-lg mb-4">Edit Template</h2>

            <div className="space-y-4">
              {editingTemplate.channel === 'email' && (
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={editFormData.subject}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, subject: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Body
                </label>
                <textarea
                  value={editFormData.body}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, body: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={editFormData.isActive}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, isActive: e.target.checked })
                    }
                    className="w-4 h-4 rounded bg-slate-800 border border-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-slate-400 text-sm">Active</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
