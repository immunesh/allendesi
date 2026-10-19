import { api } from '@/lib/api';

export const festivalsApi = {
  publicList: () => api.get('/festivals'),
  publicBySlug: (slug: string) => api.get(`/festivals/${encodeURIComponent(slug)}`),
  preview: (slug: string) => api.get(`/festivals/admin/preview/${encodeURIComponent(slug)}`),
  adminList: (params?: Record<string, unknown>) => api.get('/festivals/admin', { params }),
  adminStats: () => api.get('/festivals/admin/stats'),
  create: (data: Record<string, unknown>) => api.post('/festivals/admin', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/festivals/admin/${id}`, data),
  remove: (id: string) => api.delete(`/festivals/admin/${id}`),
  review: (assignmentId: string, status: string) => api.patch(`/festivals/admin/products/${assignmentId}/status`, { status }),
  sellerAvailable: () => api.get('/festivals/seller/available'),
  sellerMine: () => api.get('/festivals/seller/mine'),
  sellerStats: () => api.get('/festivals/seller/stats'),
  addProduct: (festivalId: string, data: Record<string, unknown>) => api.post(`/festivals/seller/${festivalId}/products`, data),
  updateProduct: (assignmentId: string, data: Record<string, unknown>) => api.put(`/festivals/seller/products/${assignmentId}`, data),
  removeProduct: (assignmentId: string) => api.delete(`/festivals/seller/products/${assignmentId}`),
};

export async function uploadFestivalImage(file: File): Promise<string> {
  const body = new FormData();
  body.append('image', file);
  const response = await api.post('/upload/image', body, { headers: { 'Content-Type': 'multipart/form-data' } });
  return response.data.url;
}