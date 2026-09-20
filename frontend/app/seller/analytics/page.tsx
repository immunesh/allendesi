'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type DashboardStats = {
  totalSales: number;
  totalOrders: number;
  deliveredOrders: number;
  categorySales: {
    category: string;
    amount: number;
    percent: number;
  }[];
  recentTransactions: {
    id: string;
    amount: number;
    status: string;
    customer: string;
  }[];
};

export default function SellerAnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch (error) {
        console.error('Failed to load analytics', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl border border-red-950/40 bg-[#0c0c0c] p-6 text-white">
        Loading analytics...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-3xl border border-red-950/40 bg-[#0c0c0c] p-6 text-red-400">
        Failed to load analytics data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-red-950/40 bg-[#0c0c0c] p-5">
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="mt-1 text-sm text-gray-400">
          Monitor category sales, trends, and customer engagement.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-red-950/40 bg-[#0b0b0b] p-5">
          <p className="text-sm text-gray-400">Total Sales</p>
          <p className="mt-2 text-3xl font-bold text-white">
           ₹{(stats.totalSales ?? 0).toLocaleString()}
          </p>
        </div>

        <div className="rounded-3xl border border-red-950/40 bg-[#0b0b0b] p-5">
          <p className="text-sm text-gray-400">Total Orders</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {stats.totalOrders}
          </p>
        </div>

        <div className="rounded-3xl border border-red-950/40 bg-[#0b0b0b] p-5">
          <p className="text-sm text-gray-400">Delivered Orders</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {stats.deliveredOrders}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Category Sales */}
        <div className="rounded-3xl border border-red-950/40 bg-[#0b0b0b] p-5">
          <h2 className="text-lg font-semibold text-white">
            Category Wise Sales
          </h2>

          <div className="mt-6 space-y-5">
          {(stats.categorySales ?? []).map((item) => (
              <div key={item.category}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-gray-300">{item.category}</span>
                  <span className="font-medium text-white">
                    ₹{item.amount.toLocaleString()}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-red-500"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-3xl border border-red-950/40 bg-[#0b0b0b] p-5">
          <h2 className="text-lg font-semibold text-white">
            Recent Transactions
          </h2>

          <div className="mt-4 space-y-3">
          {(stats.recentTransactions ?? []).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{item.id}</p>
                  <p className="text-xs text-gray-400">{item.customer}</p>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-white">₹{item.amount}</p>
                  <span className="text-xs text-gray-400">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}