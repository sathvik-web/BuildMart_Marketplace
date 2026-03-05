"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { rfqApi, orderApi, type Rfq, type Order } from "@/lib/api";
import { formatINR, formatDate, statusColor } from "@/lib/utils";

export default function BuyerDashboard() {
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      rfqApi.list({ limit: 5 }).catch(() => ({ items: [] as Rfq[], total: 0, page: 1, limit: 5, totalPages: 0 })),
      orderApi.list().catch(() => [] as Order[]),
    ]).then(([r, o]) => {
      setRfqs(r.items);
      setOrders(o.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: "Active RFQs", value: rfqs.filter(r => r.status === "OPEN" || r.status === "QUOTED").length, color: "text-blue-600" },
    { label: "Pending Orders", value: orders.filter(o => o.status === "PENDING" || o.status === "PAID").length, color: "text-yellow-600" },
    { label: "Completed Orders", value: orders.filter(o => o.status === "COMPLETED").length, color: "text-green-600" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buyer Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your material procurement</p>
        </div>
        <Link href="/buyer/rfq/new"
          className="px-5 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors">
          + New RFQ
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-6">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent RFQs</h2>
          </div>
          {loading ? (
            <div className="p-6 text-gray-400 text-sm">Loading...</div>
          ) : (
            <div className="divide-y">
              {rfqs.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-400 text-sm mb-3">No RFQs yet</p>
                  <Link href="/buyer/rfq/new" className="text-sm text-orange-600 hover:underline">
                    Create your first RFQ
                  </Link>
                </div>
              ) : rfqs.map(rfq => (
                <div key={rfq.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{rfq.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {rfq.referenceNumber} · {formatDate(rfq.createdAt)}
                      </p>
                      {rfq._count && rfq._count.quotes > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          {rfq._count.quotes} quote{rfq._count.quotes > 1 ? "s" : ""} received
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(rfq.status)}`}>
                      {rfq.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <Link href="/buyer/orders" className="text-sm text-orange-600 hover:underline">View all</Link>
          </div>
          {loading ? (
            <div className="p-6 text-gray-400 text-sm">Loading...</div>
          ) : (
            <div className="divide-y">
              {orders.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">No orders yet</div>
              ) : orders.map(order => (
                <div key={order.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{order.orderNumber}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatINR(order.totalAmount)} · {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
