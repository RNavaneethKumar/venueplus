import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

// ── Tenant slug resolution ────────────────────────────────────────────────────
// Multi-tenant: derived from the subdomain at runtime (e.g. greenpark.venueplus.io → "greenpark")
// Single-tenant / localhost dev: falls back to NEXT_PUBLIC_TENANT_SLUG env var
// Legacy single-tenant: NEXT_PUBLIC_VENUE_ID kept for backward compat on the
// x-venue-id header so existing routes that still use requireVenueHeader work.

export function getTenantSlug(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_TENANT_SLUG ?? ''
  }
  const hostname = window.location.hostname  // e.g. "greenpark.venueplus.io"
  const parts    = hostname.split('.')

  // Treat "localhost" and bare IPs as single-tenant dev — use env var fallback
  if (parts.length < 2 || hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return process.env.NEXT_PUBLIC_TENANT_SLUG ?? ''
  }

  // "greenpark.venueplus.io" → "greenpark"
  return parts[0] ?? ''
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT + tenant slug on every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('pos_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }

  // Multi-tenant header — API uses this to route to the right database
  const slug = getTenantSlug()
  if (slug) config.headers['x-tenant-slug'] = slug

  // Legacy header kept for backward compat with requireVenueHeader()
  const venueId = process.env.NEXT_PUBLIC_VENUE_ID
  if (venueId) config.headers['x-venue-id'] = venueId

  return config
})

// Auto-redirect to login on 401
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      window.localStorage.removeItem('pos_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ─── API helpers ──────────────────────────────────────────────────────────────

export const posApi = {
  auth: {
    /**
     * Staff login.
     * - Multi-tenant: venueId resolved server-side from x-tenant-slug header.
     * - Single-tenant dev: venueId sent explicitly (NEXT_PUBLIC_VENUE_ID fallback).
     */
    login: (identifier: string, pin: string, venueId?: string) =>
      apiClient.post('/auth/staff/login', { identifier, pin, ...(venueId ? { venueId } : {}) }),
  },
  products: {
    list: (channel = 'pos') => apiClient.get(`/products?channel=${channel}`),
    get: (id: string) => apiClient.get(`/products/${id}`),
  },
  availability: {
    slots: (date: string, resourceId?: string) =>
      apiClient.get(`/availability/slots?date=${date}${resourceId ? `&resourceId=${resourceId}` : ''}`),
    hold: (items: unknown[], channel = 'pos') =>
      apiClient.post('/availability/hold', { items, channel }),
    releaseHold: (holdId: string) => apiClient.delete(`/availability/hold/${holdId}`),
  },
  orders: {
    create: (data: unknown) => apiClient.post('/orders', data),
    get: (id: string) => apiClient.get(`/orders/${id}`),
    list: (params?: Record<string, string>) =>
      apiClient.get('/orders', { params }),
    refund: (id: string, data: unknown) => apiClient.post(`/orders/${id}/refund`, data),
    validatePromo: (code: string, subtotal: number) =>
      apiClient.get(`/orders/promo/${encodeURIComponent(code)}?subtotal=${subtotal}`),
  },
  venue: {
    getPosConfig: () => apiClient.get('/venue/pos-config'),
  },
  accounts: {
    get:    (id: string) => apiClient.get(`/accounts/${id}`),
    search: (q: string)  => apiClient.get(`/accounts/search?q=${encodeURIComponent(q)}`),
    create: (data: { displayName: string; mobileNumber?: string; email?: string }) =>
      apiClient.post('/accounts', data),
  },
  giftCards: {
    lookup: (code: string) => apiClient.get(`/gift-cards/${code}`),
  },
  retail: {
    items: () => apiClient.get('/retail/items'),
    byBarcode: (code: string) => apiClient.get(`/retail/items/barcode/${code}`),
  },
  fnb: {
    menu: () => apiClient.get('/fnb/menu'),
    kitchen: (status?: string) =>
      apiClient.get('/fnb/kitchen' + (status ? `?status=${status}` : '')),
    updateKitchenStatus: (id: string, status: string) =>
      apiClient.post(`/fnb/kitchen/${id}/status`, { status }),
  },
  reports: {
    liveRevenue: () => apiClient.get('/reports/revenue/live'),
    headcount: (resourceId: string) => apiClient.get(`/gate/headcount/${resourceId}`),
  },
  till: {
    openSession: (data: { drawerId?: string; openingAmount: number; openingDenominations?: Record<string, number> }) =>
      apiClient.post('/till/sessions', data),
    getActiveSession: (drawerId?: string) =>
      apiClient.get('/till/sessions/active' + (drawerId ? `?drawerId=${drawerId}` : '')),
    listSessions: (params?: Record<string, string>) =>
      apiClient.get('/till/sessions', { params }),
    getSession: (id: string) =>
      apiClient.get(`/till/sessions/${id}`),
    closeSession: (id: string, data: {
      closeType: 'normal' | 'blind'
      actualAmount?: number
      actualDenominations?: Record<string, number>
      varianceApprovedBy?: string
      varianceNote?: string
    }) => apiClient.post(`/till/sessions/${id}/close`, data),
    forceClose: (id: string) =>
      apiClient.post(`/till/sessions/${id}/force-close`, {}),
    xReport: (id: string) =>
      apiClient.get(`/till/sessions/${id}/x-report`),
    recordMovement: (data: { sessionId: string; movementType: 'drop' | 'paid_in' | 'paid_out'; amount: number; reason: string }) =>
      apiClient.post('/till/movements', data),
    listDrawers: () =>
      apiClient.get('/till/drawers'),
    createDrawer: (data: { name: string; description?: string }) =>
      apiClient.post('/till/drawers', data),
    updateDrawer: (id: string, data: { name?: string; description?: string; isActive?: boolean }) =>
      apiClient.patch(`/till/drawers/${id}`, data),
  },
  admin: {
    // Users
    listUsers: () => apiClient.get('/admin/users'),
    getUser: (id: string) => apiClient.get(`/admin/users/${id}`),
    createUser: (data: { username: string; displayName: string; pin: string; mobileNumber?: string; email?: string }) =>
      apiClient.post('/admin/users', data),
    updateUser: (id: string, data: Partial<{ displayName: string; mobileNumber: string; email: string; isActive: boolean; isLocked: boolean }>) =>
      apiClient.patch(`/admin/users/${id}`, data),
    resetPin: (id: string, pin: string) =>
      apiClient.patch(`/admin/users/${id}/reset-pin`, { pin }),
    getUserRoles: (id: string) => apiClient.get(`/admin/users/${id}/roles`),
    assignRole: (userId: string, data: { roleId: string; venueId?: string }) =>
      apiClient.post(`/admin/users/${userId}/roles`, data),
    removeRole: (userId: string, roleId: string) =>
      apiClient.delete(`/admin/users/${userId}/roles/${roleId}`),
    // Roles & Permissions
    listRoles: () => apiClient.get('/admin/roles'),
    createRole: (data: { name: string; description?: string; scopeType?: string }) =>
      apiClient.post('/admin/roles', data),
    updateRole: (id: string, data: Partial<{ name: string; description: string; isActive: boolean }>) =>
      apiClient.patch(`/admin/roles/${id}`, data),
    listPermissions: () => apiClient.get('/admin/permissions'),
    getRolePermissions: (roleId: string) => apiClient.get(`/admin/roles/${roleId}/permissions`),
    setRolePermissions: (roleId: string, permissionIds: string[]) =>
      apiClient.put(`/admin/roles/${roleId}/permissions`, { permissionIds }),
    // Visitor Types
    listVisitorTypes: () => apiClient.get('/admin/visitor-types'),
    createVisitorType: (data: { name: string; code: string; description?: string; isMinor?: boolean; requiresWaiver?: boolean }) =>
      apiClient.post('/admin/visitor-types', data),
    updateVisitorType: (id: string, data: Record<string, unknown>) =>
      apiClient.patch(`/admin/visitor-types/${id}`, data),
    // Devices
    listDevices: () => apiClient.get('/admin/devices'),
    createDevice: (data: { name: string; deviceType: string; identifier?: string }) =>
      apiClient.post('/admin/devices', data),
    updateDevice: (id: string, data: Record<string, unknown>) =>
      apiClient.patch(`/admin/devices/${id}`, data),
    // Audit Logs
    listAuditLogs: (params?: Record<string, string>) =>
      apiClient.get('/admin/audit-logs', { params }),
    // Notification Templates
    listNotificationTemplates: () => apiClient.get('/admin/notification-templates'),
    createNotificationTemplate: (data: { channel: string; templateKey: string; subject?: string; body: string }) =>
      apiClient.post('/admin/notification-templates', data),
    updateNotificationTemplate: (id: string, data: Record<string, unknown>) =>
      apiClient.patch(`/admin/notification-templates/${id}`, data),
    // Alert Rules
    listAlertRules: () => apiClient.get('/admin/alert-rules'),
    createAlertRule: (data: { alertType: string; severity?: string; thresholdValue?: string; comparisonOperator?: string; timeWindowMinutes?: string }) =>
      apiClient.post('/admin/alert-rules', data),
    updateAlertRule: (id: string, data: Record<string, unknown>) =>
      apiClient.patch(`/admin/alert-rules/${id}`, data),
    listAlertsLog: (params?: Record<string, string>) =>
      apiClient.get('/admin/alerts-log', { params }),
    // Venue
    getVenue: () => apiClient.get('/admin/venue'),
    updateVenue: (data: Record<string, unknown>) => apiClient.patch('/admin/venue', data),
    // Resources
    listResources: () => apiClient.get('/admin/resources'),
    createResource: (data: { name: string; admissionMode: string; capacity?: number; description?: string }) =>
      apiClient.post('/admin/resources', data),
    updateResource: (id: string, data: Record<string, unknown>) =>
      apiClient.patch(`/admin/resources/${id}`, data),
    // Tax
    listTax: () => apiClient.get('/admin/tax'),
    createTaxStructure: (data: { name: string; code?: string }) =>
      apiClient.post('/admin/tax', data),
    // Products
    listProducts: (params?: Record<string, string>) =>
      apiClient.get('/admin/products', { params }),
    getProduct: (id: string) => apiClient.get(`/admin/products/${id}`),
    updateProduct: (id: string, data: Record<string, unknown>) =>
      apiClient.patch(`/admin/products/${id}`, data),
    createProductPrice: (productId: string, data: {
      visitorTypeId?: string; basePrice: number; currencyCode: string;
      salesChannel?: string; effectiveFrom?: string; effectiveUntil?: string; isActive?: boolean
    }) => apiClient.post(`/admin/products/${productId}/prices`, data),
    updateProductPrice: (productId: string, priceId: string, data: Record<string, unknown>) =>
      apiClient.patch(`/admin/products/${productId}/prices/${priceId}`, data),
    deleteProductPrice: (productId: string, priceId: string) =>
      apiClient.delete(`/admin/products/${productId}/prices/${priceId}`),
    // Customers
    listCustomers: (params?: Record<string, string>) =>
      apiClient.get('/admin/customers', { params }),
    getCustomer: (id: string) => apiClient.get(`/admin/customers/${id}`),
    // Orders (admin detail)
    getOrder: (id: string) => apiClient.get(`/admin/orders/${id}`),
    // Venue settings & flags
    updateVenueSetting: (key: string, value: string) =>
      apiClient.put('/admin/venue/settings', { key, value }),
    updateVenueFlag: (key: string, enabled: boolean) =>
      apiClient.put(`/admin/venue/flags/${key}`, { enabled }),
    // Tax component management
    listTaxComponents: () => apiClient.get('/admin/tax/components'),
    createTaxComponent: (data: { code: string; name: string; isActive?: boolean }) =>
      apiClient.post('/admin/tax/components', data),
    updateTaxComponent: (id: string, data: Record<string, unknown>) =>
      apiClient.patch(`/admin/tax/components/${id}`, data),
    addTaxComponent: (structureId: string, data: { taxComponentId: string; taxRatePercent: string }) =>
      apiClient.post(`/admin/tax/${structureId}/components`, data),
    removeTaxComponent: (structureId: string, componentId: string) =>
      apiClient.delete(`/admin/tax/${structureId}/components/${componentId}`),
    updateTaxStructure: (id: string, data: { name?: string; code?: string; isActive?: boolean }) =>
      apiClient.patch(`/admin/tax/${id}`, data),
    // Reports
    getReportSummary: (from?: string, to?: string) =>
      apiClient.get('/admin/reports/summary', { params: { from, to } }),
  },
}
