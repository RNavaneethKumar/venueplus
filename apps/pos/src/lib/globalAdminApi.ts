// ============================================================================
// Global Admin API Client
//
// Separate Axios instance from the regular posApi client:
//   - Uses the same base API URL but targets /api/v1/global-admin/ routes
//   - Attaches ga_token (not pos_token) for authorization
//   - Never sends x-tenant-slug (global admin is tenant-independent)
//   - Redirects to /global-admin/login on 401
// ============================================================================

import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'
const GA_BASE  = API_BASE.replace(/\/api\/v1\/?$/, '') + '/api/v1/global-admin'

export const gaClient = axios.create({
  baseURL: GA_BASE,
  headers: { 'Content-Type': 'application/json' },
})

gaClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('ga_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

gaClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      window.localStorage.removeItem('ga_token')
      window.location.href = '/global-admin/login'
    }
    return Promise.reject(err)
  }
)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GATenant {
  id:             string
  slug:           string
  name:           string
  dbUrl:          string   // masked in list view, full in detail view
  defaultVenueId: string
  plan:           'basic' | 'professional' | 'enterprise'
  isActive:       boolean
  createdAt:      string
  updatedAt:      string
}

export interface GAAdmin {
  id:    string
  email: string
  name:  string
}

// ─── API methods ──────────────────────────────────────────────────────────────

export const gaApi = {
  auth: {
    login: (email: string, password: string) =>
      gaClient.post<{ success: boolean; data: { token: string; admin: GAAdmin } }>(
        '/auth/login',
        { email, password }
      ),
    seed: (email: string, name: string, password: string, seedSecret: string) =>
      gaClient.post('/auth/seed', { email, name, password, seedSecret }),
  },

  tenants: {
    list: () =>
      gaClient.get<{ success: boolean; data: GATenant[] }>('/tenants'),

    get: (id: string) =>
      gaClient.get<{ success: boolean; data: GATenant }>(`/tenants/${id}`),

    create: (data: {
      slug:           string
      name:           string
      dbUrl:          string
      defaultVenueId: string
      plan:           'basic' | 'professional' | 'enterprise'
    }) => gaClient.post<{ success: boolean; data: GATenant }>('/tenants', data),

    update: (id: string, data: Partial<{
      name:           string
      dbUrl:          string
      defaultVenueId: string
      plan:           'basic' | 'professional' | 'enterprise'
      isActive:       boolean
    }>) => gaClient.patch<{ success: boolean; data: GATenant }>(`/tenants/${id}`, data),

    deactivate: (id: string) =>
      gaClient.delete(`/tenants/${id}`),

    /**
     * Provision a brand-new tenant database end-to-end:
     *   CREATE DATABASE → run DDL migrations → create venue → register in registry
     *
     * Returns the same tenant shape as `create`.
     * Requires POSTGRES_ADMIN_URL to be set on the API server.
     */
    provision: (data: {
      slug:      string
      name:      string
      venueName: string
      plan:      'basic' | 'professional' | 'enterprise'
      timezone:  string
      currency:  string
      country:   string
    }) => gaClient.post<{ success: boolean; data: GATenant }>('/tenants/provision', data),
  },
}
