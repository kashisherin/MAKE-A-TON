import apiClient from './client';

// ============ AUTH ============
export const authAPI = {
  login: (credentials) => apiClient.post('/auth/login/', credentials),
  register: (data) => apiClient.post('/auth/register/', data),
  logout: () => apiClient.post('/auth/logout/'),
  refreshToken: (refresh) => apiClient.post('/auth/token/refresh/', { refresh }),
  resetPassword: (email) => apiClient.post('/auth/password-reset/', { email }),
  confirmResetPassword: (data) => apiClient.post('/auth/password-reset/confirm/', data),
  getProfile: () => apiClient.get('/auth/profile/'),
  updateProfile: (data) => apiClient.put('/auth/profile/', data),
  changePassword: (data) => apiClient.post('/auth/change-password/', data),
};

// ============ USERS / STAFF ============
export const usersAPI = {
  list: (params) => apiClient.get('/users/', { params }),
  get: (id) => apiClient.get(`/users/${id}/`),
  create: (data) => apiClient.post('/users/', data),
  update: (id, data) => apiClient.put(`/users/${id}/`, data),
  deactivate: (id) => apiClient.post(`/users/${id}/deactivate/`),
  activate: (id) => apiClient.post(`/users/${id}/activate/`),
};

// ============ CUSTOMERS ============
export const customersAPI = {
  list: (params) => apiClient.get('/customers/', { params }),
  get: (id) => apiClient.get(`/customers/${id}/`),
  create: (data) => apiClient.post('/customers/', data),
  update: (id, data) => apiClient.put(`/customers/${id}/`, data),
  delete: (id) => apiClient.delete(`/customers/${id}/`),
  getSubscriptions: (id, params) => apiClient.get(`/customers/${id}/subscriptions/`, { params }),
  getInvoices: (id, params) => apiClient.get(`/customers/${id}/invoices/`, { params }),
  getPayments: (id, params) => apiClient.get(`/customers/${id}/payments/`, { params }),
  getHealthScore: (id) => apiClient.get(`/customers/${id}/health-score/`),
};

// ============ PRODUCTS ============
export const productsAPI = {
  list: (params) => apiClient.get('/products/', { params }),
  get: (id) => apiClient.get(`/products/${id}/`),
  create: (data) => apiClient.post('/products/', data),
  update: (id, data) => apiClient.put(`/products/${id}/`, data),
  deactivate: (id) => apiClient.post(`/products/${id}/deactivate/`),
  activate: (id) => apiClient.post(`/products/${id}/activate/`),
  getVariants: (id) => apiClient.get(`/products/${id}/variants/`),
  createVariant: (id, data) => apiClient.post(`/products/${id}/variants/`, data),
  updateVariant: (productId, variantId, data) => apiClient.put(`/products/${productId}/variants/${variantId}/`, data),
  deleteVariant: (productId, variantId) => apiClient.delete(`/products/${productId}/variants/${variantId}/`),
};

// ============ PLANS ============
export const plansAPI = {
  list: (params) => apiClient.get('/plans/', { params }),
  get: (id) => apiClient.get(`/plans/${id}/`),
  create: (data) => apiClient.post('/plans/', data),
  update: (id, data) => apiClient.put(`/plans/${id}/`, data),
  deactivate: (id) => apiClient.post(`/plans/${id}/deactivate/`),
  activate: (id) => apiClient.post(`/plans/${id}/activate/`),
  getAvailable: (params) => apiClient.get('/plans/available/', { params }),
};

// ============ QUOTATIONS ============
export const quotationsAPI = {
  list: (params) => apiClient.get('/quotations/', { params }),
  get: (id) => apiClient.get(`/quotations/${id}/`),
  create: (data) => apiClient.post('/quotations/', data),
  update: (id, data) => apiClient.put(`/quotations/${id}/`, data),
  delete: (id) => apiClient.delete(`/quotations/${id}/`),
  send: (id) => apiClient.post(`/quotations/${id}/send/`),
  accept: (id) => apiClient.post(`/quotations/${id}/accept/`),
  reject: (id) => apiClient.post(`/quotations/${id}/reject/`),
  convertToSubscription: (id) => apiClient.post(`/quotations/${id}/convert/`),
  listTemplates: (params) => apiClient.get('/quotation-templates/', { params }),
  getTemplate: (id) => apiClient.get(`/quotation-templates/${id}/`),
  createTemplate: (data) => apiClient.post('/quotation-templates/', data),
  updateTemplate: (id, data) => apiClient.put(`/quotation-templates/${id}/`, data),
  deleteTemplate: (id) => apiClient.delete(`/quotation-templates/${id}/`),
};

// ============ SUBSCRIPTIONS ============
export const subscriptionsAPI = {
  list: (params) => apiClient.get('/subscriptions/', { params }),
  get: (id) => apiClient.get(`/subscriptions/${id}/`),
  create: (data) => apiClient.post('/subscriptions/', data),
  update: (id, data) => apiClient.put(`/subscriptions/${id}/`, data),
  confirm: (id) => apiClient.post(`/subscriptions/${id}/confirm/`),
  activate: (id) => apiClient.post(`/subscriptions/${id}/activate/`),
  pause: (id) => apiClient.post(`/subscriptions/${id}/pause/`),
  resume: (id) => apiClient.post(`/subscriptions/${id}/resume/`),
  renew: (id, data) => apiClient.post(`/subscriptions/${id}/renew/`, data),
  close: (id, data) => apiClient.post(`/subscriptions/${id}/close/`, data),
  getHistory: (id) => apiClient.get(`/subscriptions/${id}/history/`),
  getLines: (id) => apiClient.get(`/subscriptions/${id}/lines/`),
  addLine: (id, data) => apiClient.post(`/subscriptions/${id}/lines/`, data),
  updateLine: (subId, lineId, data) => apiClient.put(`/subscriptions/${subId}/lines/${lineId}/`, data),
  deleteLine: (subId, lineId) => apiClient.delete(`/subscriptions/${subId}/lines/${lineId}/`),
  getMySubscriptions: (params) => apiClient.get('/subscriptions/mine/', { params }),
};

// ============ INVOICES ============
export const invoicesAPI = {
  list: (params) => apiClient.get('/invoices/', { params }),
  get: (id) => apiClient.get(`/invoices/${id}/`),
  create: (data) => apiClient.post('/invoices/', data),
  confirm: (id) => apiClient.post(`/invoices/${id}/confirm/`),
  cancel: (id) => apiClient.post(`/invoices/${id}/cancel/`),
  send: (id) => apiClient.post(`/invoices/${id}/send/`),
  downloadPDF: (id) => apiClient.get(`/invoices/${id}/pdf/`, { responseType: 'blob' }),
  generateFromSubscriptions: () => apiClient.post('/invoices/generate/'),
  getMyInvoices: (params) => apiClient.get('/invoices/mine/', { params }),
};

// ============ PAYMENTS ============
export const paymentsAPI = {
  list: (params) => apiClient.get('/payments/', { params }),
  get: (id) => apiClient.get(`/payments/${id}/`),
  create: (data) => apiClient.post('/payments/', data),
  getMyPayments: (params) => apiClient.get('/payments/mine/', { params }),
  getMethods: () => apiClient.get('/payments/methods/'),
};

// ============ TAXES ============
export const taxesAPI = {
  list: (params) => apiClient.get('/taxes/', { params }),
  get: (id) => apiClient.get(`/taxes/${id}/`),
  create: (data) => apiClient.post('/taxes/', data),
  update: (id, data) => apiClient.put(`/taxes/${id}/`, data),
  delete: (id) => apiClient.delete(`/taxes/${id}/`),
};

// ============ DISCOUNTS ============
export const discountsAPI = {
  list: (params) => apiClient.get('/discounts/', { params }),
  get: (id) => apiClient.get(`/discounts/${id}/`),
  create: (data) => apiClient.post('/discounts/', data),
  update: (id, data) => apiClient.put(`/discounts/${id}/`, data),
  delete: (id) => apiClient.delete(`/discounts/${id}/`),
  validate: (data) => apiClient.post('/discounts/validate/', data),
};

// ============ FLEXI-BILL ============
export const flexiBillAPI = {
  // Wallet
  getWallet: () => apiClient.get('/flexibill/wallet/'),
  addFunds: (data) => apiClient.post('/flexibill/wallet/add-funds/', data),
  getTransactions: (params) => apiClient.get('/flexibill/wallet/transactions/', { params }),
  // Entitlements
  listEntitlements: (params) => apiClient.get('/flexibill/entitlements/', { params }),
  getEntitlement: (id) => apiClient.get(`/flexibill/entitlements/${id}/`),
  purchaseAccess: (data) => apiClient.post('/flexibill/purchase/', data),
  useEntitlement: (id) => apiClient.post(`/flexibill/entitlements/${id}/use/`),
  // Access Products
  listAccessProducts: (params) => apiClient.get('/flexibill/access-products/', { params }),
  getAccessProduct: (id) => apiClient.get(`/flexibill/access-products/${id}/`),
  createAccessProduct: (data) => apiClient.post('/flexibill/access-products/', data),
  updateAccessProduct: (id, data) => apiClient.put(`/flexibill/access-products/${id}/`, data),
  // Smart Optimizer
  getOptimization: (params) => apiClient.get('/flexibill/optimize/', { params }),
};

// ============ PULSE ============
export const pulseAPI = {
  // Waste Detection (Customer)
  getWasteAnalysis: (params) => apiClient.get('/pulse/waste-analysis/', { params }),
  getRecommendations: (params) => apiClient.get('/pulse/recommendations/', { params }),
  applyRecommendation: (id) => apiClient.post(`/pulse/recommendations/${id}/apply/`),
  dismissRecommendation: (id) => apiClient.post(`/pulse/recommendations/${id}/dismiss/`),
  // Revenue Health (Admin)
  getHealthScores: (params) => apiClient.get('/pulse/health-scores/', { params }),
  getHealthScore: (id) => apiClient.get(`/pulse/health-scores/${id}/`),
  getAtRiskCustomers: (params) => apiClient.get('/pulse/at-risk/', { params }),
  recalculateScores: () => apiClient.post('/pulse/health-scores/recalculate/'),
  getUtilizationReport: (params) => apiClient.get('/pulse/utilization/', { params }),
};

// ============ DIGITAL TWIN ============
export const digitalTwinAPI = {
  createSnapshot: () => apiClient.post('/digital-twin/snapshots/'),
  listSnapshots: (params) => apiClient.get('/digital-twin/snapshots/', { params }),
  getSnapshot: (id) => apiClient.get(`/digital-twin/snapshots/${id}/`),
  runSimulation: (data) => apiClient.post('/digital-twin/simulate/', data),
  listScenarios: (params) => apiClient.get('/digital-twin/scenarios/', { params }),
  getScenario: (id) => apiClient.get(`/digital-twin/scenarios/${id}/`),
  getSimulationResult: (id) => apiClient.get(`/digital-twin/results/${id}/`),
  askQuestion: (data) => apiClient.post('/digital-twin/ask/', data),
  approveChange: (id) => apiClient.post(`/digital-twin/results/${id}/approve/`),
  rejectChange: (id) => apiClient.post(`/digital-twin/results/${id}/reject/`),
};

// ============ AUDIT ============
export const auditAPI = {
  list: (params) => apiClient.get('/audit/logs/', { params }),
  get: (id) => apiClient.get(`/audit/logs/${id}/`),
  getEntityHistory: (entityType, entityId) => apiClient.get(`/audit/logs/entity/${entityType}/${entityId}/`),
};

// ============ ANALYTICS ============
export const analyticsAPI = {
  getDashboard: (params) => apiClient.get('/analytics/dashboard/', { params }),
  getRevenueTrends: (params) => apiClient.get('/analytics/revenue-trends/', { params }),
  getSubscriptionGrowth: (params) => apiClient.get('/analytics/subscription-growth/', { params }),
  getPaymentStats: (params) => apiClient.get('/analytics/payment-stats/', { params }),
  getMRR: (params) => apiClient.get('/analytics/mrr/', { params }),
  getARR: (params) => apiClient.get('/analytics/arr/', { params }),
  getCustomerStats: (params) => apiClient.get('/analytics/customer-stats/', { params }),
  getUpcomingRenewals: (params) => apiClient.get('/analytics/upcoming-renewals/', { params }),
  getOverdueInvoices: (params) => apiClient.get('/analytics/overdue-invoices/', { params }),
  getRiskDistribution: (params) => apiClient.get('/analytics/risk-distribution/', { params }),
};
