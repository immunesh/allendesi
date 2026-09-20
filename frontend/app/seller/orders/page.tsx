'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, CheckCircle2, XCircle, Truck, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import { useUIStore } from '@/lib/store';
import ShipmentModal from '@/components/admin/ShipmentModal';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  courier?: string | null;
  awbNumber?: string | null;
  trackingUrl?: string | null;
  estimatedDelivery?: string | null;
  shipmentNotes?: string | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<{
    orderId: string;
    mode: 'create' | 'edit';
    existing?: {
      courier?: string | null;
      awbNumber?: string | null;
      trackingUrl?: string | null;
      estimatedDelivery?: string | null;
      shipmentNotes?: string | null;
    };
  } | null>(null);

  const { showToast } = useUIStore();

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/seller');
      const payload = res.data?.data ?? res.data?.orders ?? [];
      setOrders(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error('Failed to load orders', error);
      setOrders([]);
      showToast('Unable to load seller orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
  }, []);

  const handleDecision = async (orderId: string, status: 'CONFIRMED' | 'CANCELLED' | 'DELIVERED') => {
    setActionLoadingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/seller/status`, { status });
      const message =
        status === 'CONFIRMED'
          ? 'Order accepted successfully'
          : status === 'DELIVERED'
          ? 'Order marked as delivered'
          : 'Order cancelled successfully';
      showToast(message);
      await fetchOrders();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Unable to update order';
      showToast(message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-red-950/40 bg-[#0c0c0c] p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Orders</h1>
          <p className="mt-1 text-sm text-gray-400">
            Review incoming orders, process shipments, and manage deliveries.
          </p>
        </div>

        <Link
          href="/seller"
          className="rounded-full border border-red-900/50 px-4 py-2 text-sm text-gray-300 transition hover:border-red-700 hover:text-white"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="overflow-hidden rounded-3xl border border-red-950/40 bg-[#0b0b0b]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-gray-400">
              <tr>
                <th className="px-4 py-4">Order</th>
                <th className="px-4 py-4">Customer</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Payment</th>
                <th className="px-4 py-4">Total</th>
                <th className="px-4 py-4">Decision / Shipping</th>
                <th className="px-4 py-4">Date</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading orders...
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-white/5 text-gray-200 transition hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-4 font-medium text-white">{order.orderNumber}</td>

                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-white">
                          {order.user?.firstName} {order.user?.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{order.user?.email}</p>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            order.status === 'DELIVERED'
                              ? 'bg-green-500/15 text-green-400'
                              : order.status === 'SHIPPED'
                              ? 'bg-blue-500/15 text-blue-400'
                              : order.status === 'PENDING'
                              ? 'bg-yellow-500/15 text-yellow-400'
                              : order.status === 'CONFIRMED'
                              ? 'bg-cyan-500/15 text-cyan-400'
                              : 'bg-red-500/15 text-red-400'
                          }`}
                        >
                          {order.status}
                        </span>
                        {order.estimatedDelivery && (
                          <div className="mt-1 text-[11px] text-cyan-400 font-medium">
                            Est: {new Date(order.estimatedDelivery).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          order.paymentStatus === 'PAID'
                            ? 'bg-green-500/15 text-green-400'
                            : 'bg-yellow-500/15 text-yellow-400'
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>

                    <td className="px-4 py-4 font-semibold text-white">₹{order.total.toLocaleString()}</td>

                    <td className="px-4 py-4">
                      {order.status === 'PENDING' ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleDecision(order.id, 'CONFIRMED')}
                            disabled={actionLoadingId === order.id}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:opacity-60"
                          >
                            {actionLoadingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            Accept
                          </button>
                          <button
                            onClick={() => handleDecision(order.id, 'CANCELLED')}
                            disabled={actionLoadingId === order.id}
                            className="inline-flex items-center gap-1 rounded-full bg-rose-600/90 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-600 disabled:opacity-60"
                          >
                            {actionLoadingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                            Reject
                          </button>
                        </div>
                      ) : ['CONFIRMED', 'PROCESSING'].includes(order.status) ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedShipment({ orderId: order.id, mode: 'create' })}
                            disabled={actionLoadingId === order.id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-500 disabled:opacity-60"
                          >
                            <Truck className="h-3.5 w-3.5" />
                            Ready to Ship
                          </button>
                          <button
                            onClick={() => handleDecision(order.id, 'CANCELLED')}
                            disabled={actionLoadingId === order.id}
                            className="inline-flex items-center gap-1 rounded-full bg-rose-600/90 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-600 disabled:opacity-60"
                          >
                            {actionLoadingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                            Cancel
                          </button>
                        </div>
                      ) : ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(order.status) ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleDecision(order.id, 'DELIVERED')}
                            disabled={actionLoadingId === order.id}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:opacity-60"
                          >
                            {actionLoadingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            Deliver
                          </button>
                          <button
                            onClick={() =>
                              setSelectedShipment({
                                orderId: order.id,
                                mode: 'edit',
                                existing: {
                                  courier: order.courier,
                                  awbNumber: order.awbNumber,
                                  trackingUrl: order.trackingUrl,
                                  estimatedDelivery: order.estimatedDelivery,
                                  shipmentNotes: order.shipmentNotes,
                                },
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
                          >
                            <Pencil className="h-3.5 w-3.5 text-cyan-400" />
                            Edit Shipping
                          </button>
                          <button
                            onClick={() => handleDecision(order.id, 'CANCELLED')}
                            disabled={actionLoadingId === order.id}
                            className="inline-flex items-center gap-1 rounded-full bg-rose-600/90 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-600 disabled:opacity-60"
                          >
                            {actionLoadingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Completed</span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedShipment && (
        <ShipmentModal
          orderId={selectedShipment.orderId}
          mode={selectedShipment.mode}
          existing={selectedShipment.existing}
          onClose={() => setSelectedShipment(null)}
          onSuccess={() => {
            setSelectedShipment(null);
            void fetchOrders();
          }}
        />
      )}
    </div>
  );
}