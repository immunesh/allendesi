'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type SalesData = {
  totalSales: number;
  totalOrders: number;
  deliveredOrders: number;
  totalProducts: number;
  recentTransactions: {
    id: string;
    amount: number;
    status: string;
    customer: string;
  }[];
  categorySales?: {
    category: string;
    amount: number;
    percent: number;
  }[];
};

export default function SellerSalesPage() {
  const [stats, setStats] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch (error) {
        console.error('Failed to load sales', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl border border-red-950/40 bg-[#0c0c0c] p-6 text-white">
        Loading sales analytics...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-3xl border border-red-950/40 bg-[#0c0c0c] p-6 text-red-400">
        Failed to load sales data.
      </div>
    );
  }

  const todayRevenue = (stats.recentTransactions ?? [])
    .filter((item) => item.status !== 'CANCELLED')
    .reduce((sum, item) => sum + item.amount, 0);

  const cards = [
    {
      title: 'Total Revenue',
      value: `₹${(stats.totalSales ?? 0).toLocaleString()}`,
    },
    {
      title: "Today's Revenue",
      value: `₹${todayRevenue.toLocaleString()}`,
    },
    {
      title: 'Monthly Revenue',
      value: `₹${(stats.totalSales ?? 0).toLocaleString()}`,
    },
    {
      title: 'Products',
      value: String(stats.totalProducts ?? 0),
    },
    {
      title: 'Orders',
      value: String(stats.totalOrders ?? 0),
    },
    {
      title: 'Delivered',
      value: String(stats.deliveredOrders ?? 0),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-red-950/40 bg-[#0c0c0c] p-5">
        <h1 className="text-2xl font-semibold text-white">
          Sales Analytics
        </h1>

        <p className="mt-1 text-sm text-gray-400">
          Track revenue, monthly performance, and bestselling categories.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-red-950/40 bg-[#0b0b0b] p-5"
          >
            <p className="text-sm text-gray-400">{card.title}</p>

            <p className="mt-2 text-2xl font-semibold text-white">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Revenue Overview */}
        <div className="rounded-3xl border border-red-950/40 bg-[#0b0b0b] p-5">
          <h2 className="text-lg font-semibold text-white">
            Revenue Overview
          </h2>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-4">
              <span className="text-gray-300">Total Revenue</span>

              <span className="font-semibold text-white">
                ₹{(stats.totalSales ?? 0).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-4">
              <span className="text-gray-300">Total Orders</span>

              <span className="font-semibold text-white">
                {stats.totalOrders ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-4">
              <span className="text-gray-300">Delivered Orders</span>

              <span className="font-semibold text-white">
                {stats.deliveredOrders ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Top Selling Categories */}
        <div className="rounded-3xl border border-red-950/40 bg-[#0b0b0b] p-5">
          <h2 className="text-lg font-semibold text-white">
            Top Selling Categories
          </h2>

          <div className="mt-4 space-y-3 text-sm text-gray-300">
            {(stats.categorySales ?? []).length === 0 ? (
              <div className="rounded-xl bg-white/5 px-4 py-4 text-center text-gray-500">
                No sales data available yet.
              </div>
            ) : (
              (stats.categorySales ?? []).map((item) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3"
                >
                  <span>{item.category}</span>

                  <span className="font-medium text-red-300">
                    ₹{item.amount.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-3xl border border-red-950/40 bg-[#0b0b0b] p-5">
        <h2 className="text-lg font-semibold text-white">
          Recent Transactions
        </h2>

        <div className="mt-4 space-y-3">
          {(stats.recentTransactions ?? []).length === 0 ? (
            <div className="rounded-xl bg-white/5 px-4 py-4 text-center text-gray-500">
              No transactions available.
            </div>
          ) : (
            (stats.recentTransactions ?? []).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-white">{item.id}</p>

                  <p className="text-xs text-gray-400">
                    {item.customer}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-white">
                    ₹{item.amount.toLocaleString()}
                  </p>

                  <span className="text-xs text-gray-400">
                    {item.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}