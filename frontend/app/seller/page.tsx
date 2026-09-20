'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Package,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  Truck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useUIStore } from '@/lib/store';
import ShipmentModal from '@/components/admin/ShipmentModal';

type DashboardData = {
  totalProducts?: number;
  totalOrders?: number;
  deliveredOrders?: number;
  totalSales?: number;
  recentTransactions?: {
    id: string;
    orderNumber?: string;
    amount: number;
    status: string;
    customer: string;
  }[];
};

export default function SellerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<{
    orderId: string;
    mode: 'create' | 'edit';
  } | null>(null);

  const { showToast } = useUIStore();

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Dashboard fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDashboard();
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
          : 'Order rejected successfully';
      showToast(message);
      await fetchDashboard();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Unable to update order';
      showToast(message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-red-950/40 bg-[#0b0b0b] p-8 text-gray-400">
        Loading dashboard...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-3xl border border-red-950/40 bg-[#0b0b0b] p-8 text-red-400">
        Failed to load dashboard data.
      </div>
    );
  }

  const safeStats = {
    totalProducts: Number(stats.totalProducts ?? 0),
    totalOrders: Number(stats.totalOrders ?? 0),
    deliveredOrders: Number(stats.deliveredOrders ?? 0),
    totalSales: Number(stats.totalSales ?? 0),
    recentTransactions: Array.isArray(stats.recentTransactions) ? stats.recentTransactions : [],
  };

  const statCards = [
    {
      title: 'Total Products',
      value: safeStats.totalProducts.toString(),
      icon: Package,
      accent: 'from-red-600 to-red-800',
    },
    {
      title: 'Total Orders',
      value: safeStats.totalOrders.toString(),
      icon: ShoppingCart,
      accent: 'from-gray-700 to-gray-900',
    },
    {
      title: 'Delivered Orders',
      value: safeStats.deliveredOrders.toString(),
      icon: BadgeCheck,
      accent: 'from-red-600 to-orange-600',
    },
    {
      title: 'Revenue',
      value: `₹${safeStats.totalSales.toLocaleString()}`,
      icon: DollarSign,
      accent: 'from-amber-500 to-orange-600',
    },
    {
      title: 'Pending Orders',
      value: (
        safeStats.totalOrders - safeStats.deliveredOrders
      ).toString(),
      icon: AlertCircle,
      accent: 'from-yellow-600 to-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-red-950/40 bg-gradient-to-br from-[#101010] via-[#0d0d0d] to-[#1a0d0d] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-red-400">
              Seller Overview
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              Welcome back, grow your store
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-400">
              Manage orders, inventory, and sales from one polished workspace
              designed for multi-vendor operations.
            </p>
          </div>

          <Link
            href="/seller/products/add"
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Add New Product <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {statCards.map(({ title, value, icon: Icon, accent }) => (
          <div
            key={title}
            className="rounded-2xl border border-red-950/40 bg-[#0c0c0c] p-5 transition hover:-translate-y-1 hover:border-red-800/70"
          >
            <div
              className={`inline-flex rounded-xl bg-gradient-to-br ${accent} p-3 text-white`}
            >
              <Icon className="h-5 w-5" />
            </div>

            <p className="mt-4 text-sm text-gray-400">{title}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="rounded-3xl border border-red-950/40 bg-[#0b0b0b] p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Recent Orders
            </h2>
            <p className="text-sm text-gray-400">
              Latest customer activity across your products.
            </p>
          </div>

          <Link
            href="/seller/orders"
            className="text-sm text-red-400 hover:text-red-300"
          >
            View all
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-gray-400">
              <tr>
                <th className="px-3 py-3">Order ID</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {safeStats.recentTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-gray-500"
                  >
                    No orders found
                  </td>
                </tr>
              ) : (
                safeStats.recentTransactions.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-white/10 text-gray-200"
                  >
                    <td className="px-3 py-3 font-medium text-white">
                      {order.orderNumber || order.id}
                    </td>

                    <td className="px-3 py-3">{order.customer}</td>

                    <td className="px-3 py-3">
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
                    </td>

                    <td className="px-3 py-3 font-semibold text-white">
                      ₹{order.amount.toLocaleString()}
                    </td>

                    <td className="px-3 py-3">
                      {order.status === 'PENDING' ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleDecision(order.id, 'CONFIRMED')}
                            disabled={actionLoadingId === order.id}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:opacity-60"
                          >
                            {actionLoadingId === order.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            Accept
                          </button>
                          <button
                            onClick={() => handleDecision(order.id, 'CANCELLED')}
                            disabled={actionLoadingId === order.id}
                            className="inline-flex items-center gap-1 rounded-full bg-rose-600/90 px-3 py-1 text-xs font-medium text-white transition hover:bg-rose-600 disabled:opacity-60"
                          >
                            {actionLoadingId === order.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            Reject
                          </button>
                        </div>
                      ) : ['CONFIRMED', 'PROCESSING'].includes(order.status) ? (
                        <button
                          onClick={() => setSelectedShipment({ orderId: order.id, mode: 'create' })}
                          disabled={actionLoadingId === order.id}
                          className="inline-flex items-center gap-1 rounded-full bg-cyan-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-cyan-500 disabled:opacity-60"
                        >
                          <Truck className="h-3 w-3" />
                          Ready to Ship
                        </button>
                      ) : ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(order.status) ? (
                        <button
                          onClick={() => handleDecision(order.id, 'DELIVERED')}
                          disabled={actionLoadingId === order.id}
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:opacity-60"
                        >
                          {actionLoadingId === order.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          Deliver
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">Completed</span>
                      )}
                    </td>
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
          onClose={() => setSelectedShipment(null)}
          onSuccess={() => {
            setSelectedShipment(null);
            void fetchDashboard();
          }}
        />
      )}
    </div>
  );
}