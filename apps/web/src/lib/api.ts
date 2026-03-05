import axios, { AxiosError, AxiosRequestConfig } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/* ── Types ───────────────────────────────────────────── */

export type VendorProfile = {
  id: string;
  businessName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  city?: string;
  createdAt?: string;
};

export type Analytics = {
  totalUsers: number;
  totalVendors: number;
  totalBuyers: number;
  totalOrders: number;
  totalRevenue: number;
};

/* ── Axios interceptor (auto refresh token) ─────────── */

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError & { config: AxiosRequestConfig & { _retry?: boolean } }) => {

    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;

      try {
        await axios.post(
          `${API_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        );

        return api(error.config);
      } catch {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

/* ── Auth ───────────────────────────────────────────── */

/* ── Auth ───────────────────────────────────────────── */

export const authApi = {
  async sendOtp(phone: string) {
    const res = await api.post("/auth/otp/send", { phone });
    return res.data;
  },

  async verifyOtp(phone: string, otpToken: string) {
    const res = await api.post("/auth/otp/verify", { phone, otpToken });
    return res.data;
  },

  async register(data: any) {
    const res = await api.post("/auth/register", data);
    return res.data;
  },

  async me() {
    const res = await api.get("/auth/me");
    return res.data;
  },

  async logout() {
    const res = await api.post("/auth/logout");
    return res.data;
  },
};

/* ── RFQs ───────────────────────────────────────────── */

export const rfqApi = {
  list: (params?: any) => api.get("/rfqs", { params }),

  available: (params?: any) => api.get("/rfqs/available", { params }),

  get: (id: string) => api.get(`/rfqs/${id}`),

  create: (data: any) => api.post("/rfqs", data),

  update: (id: string, data: any) => api.patch(`/rfqs/${id}`, data),

  publish: (id: string) => api.post(`/rfqs/${id}/publish`),

  cancel: (id: string) => api.post(`/rfqs/${id}/cancel`),

  getQuotes: (id: string) => api.get(`/rfqs/${id}/quotes`),
};

/* ── Quotes ─────────────────────────────────────────── */

export const quoteApi = {
  mine: () => api.get("/quotes/mine"),

  get: (id: string) => api.get(`/quotes/${id}`),

  create: (data: any) => api.post("/quotes", data),

  update: (id: string, data: any) => api.patch(`/quotes/${id}`, data),

  accept: (id: string) => api.post(`/quotes/${id}/accept`),

  reject: (id: string) => api.post(`/quotes/${id}/reject`),

  withdraw: (id: string) => api.delete(`/quotes/${id}`),
};

/* ── Orders ─────────────────────────────────────────── */

export const orderApi = {
  list: (params?: any) => api.get("/orders", { params }),

  get: (id: string) => api.get(`/orders/${id}`),

  pay: (id: string) => api.post(`/orders/${id}/payment`),

  dispatch: (id: string, data: any) =>
    api.post(`/orders/${id}/dispatch`, data),

  submitPod: (id: string, data: any) =>
    api.post(`/orders/${id}/pod`, data),

  confirmDelivery: (id: string) =>
    api.post(`/orders/${id}/confirm-delivery`),
};

/* ── Payment ───────────────────────────────────────── */

export const paymentApi = {
  createOrder: (orderId: string) =>
    api.post(`/payments/create-order`, { orderId }),
};

/* ── Materials ─────────────────────────────────────── */

export const materialApi = {
  list: (params?: any) => api.get("/materials", { params }),
};

/* ── Admin ─────────────────────────────────────────── */

export const adminApi = {
  pendingKyc: () => api.get("/admin/kyc/pending"),

  // used by admin dashboard
  pendingVendors: () => api.get("/admin/kyc/pending"),

  approveKyc: (id: string) =>
    api.post(`/admin/kyc/${id}/approve`),

  rejectKyc: (id: string, reason: string) =>
    api.post(`/admin/kyc/${id}/reject`, { reason }),

  analytics: () => api.get("/admin/analytics"),

  orders: (params?: any) => api.get("/admin/orders", { params }),

  releaseEscrow: (id: string) =>
    api.post(`/admin/orders/${id}/release-escrow`),
};

/* ── KYC ───────────────────────────────────────────── */

export const kycApi = {
  status: () => api.get("/kyc/status"),

  uploadDoc: (data: any) =>
    api.post("/kyc/documents", data),

  setWarehouse: (data: any) =>
    api.post("/kyc/warehouse", data),

  setBank: (data: any) =>
    api.post("/kyc/bank", data),

  submit: () => api.post("/kyc/submit"),
};