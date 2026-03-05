"use client";
import { useState, useEffect } from "react";
import { adminApi, type VendorProfile, type Analytics } from "@/lib/api";
import { formatINR } from "@/lib/utils";

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [pendingVendors, setPendingVendors] = useState<VendorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      adminApi.analytics().catch(() => null),
      adminApi.pendingVendors().catch(() => [] as VendorProfile[]),
    ]).then(([a, v]) => {
      setAnalytics(a);
      setPendingVendors(v);
    }).finally(() => setLoading(false));
  }, []);

  const handleApprove = async (vendorId: string) => {
    setActionId(vendorId);
    try {
      await adminApi.approveVendor(vendorId);
      setPendingVendors(prev => prev.filter(v => v.id !== vendorId));
    } catch (err: any) {
      alert(err.message ?? "Failed to approve");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (vendorId: string) => {
    const reason = window.prompt("Enter rejection reason:");
    if (!reason) return;
    setActionId(vendorId);
    try {
      await adminApi.rejectVendor(vendorId, reason);
      setPendingVendors(prev => prev.filter(v => v.id !== vendorId));
    } catch (err: any) {
      alert(err.message ?? "Failed to reject");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      {analytics && (
        <div className="grid grid-cols-4 gap-6 mb-8">
          {[
            { label: "Total Orders", value: String(analytics.totalOrders) },
            { label: "Total Revenue", value: formatINR(analytics.totalRevenue) },
            { label: "Active Vendors", value: String(analytics.activeVendors) },
            { label: "Open RFQs", value: String(analytics.openRfqs) },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border p-6">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Pending KYC Approvals</h2>
          <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-medium">
            {pendingVendors.length} pending
          </span>
        </div>

        {loading ? (
          <div className="p-6 text-gray-400">Loading...</div>
        ) : pendingVendors.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            No pending KYC approvals. All vendors are verified.
          </div>
        ) : (
          <div className="divide-y">
            {pendingVendors.map(vendor => (
              <div key={vendor.id} className="px-6 py-5 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{vendor.businessName}</p>
                  <p className="text-sm text-gray-500 mt-0.5">GSTIN: {vendor.gstinNumber}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleReject(vendor.id)} disabled={actionId === vendor.id}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors">
                    Reject
                  </button>
                  <button onClick={() => handleApprove(vendor.id)} disabled={actionId === vendor.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                    {actionId === vendor.id ? "Processing..." : "Approve KYC"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
