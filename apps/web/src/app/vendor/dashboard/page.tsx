"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { rfqApi, quoteApi, kycApi, type Rfq, type Quote } from "@/lib/api";
import { formatINR, formatDate, statusColor } from "@/lib/utils";

export default function VendorDashboard() {
  const [availableRfqs, setAvailableRfqs] = useState<Rfq[]>([]);
  const [myQuotes, setMyQuotes] = useState<Quote[]>([]);
  const [kycStatus, setKycStatus] = useState<string>("PENDING");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      rfqApi.listAvailable().catch(() => ({ items: [] as Rfq[] })),
      quoteApi.mine().catch(() => [] as Quote[]),
      kycApi.status().catch(() => ({ kycStatus: "PENDING" })),
    ]).then(([rfqs, quotes, kyc]) => {
      setAvailableRfqs(rfqs.items.slice(0, 5));
      setMyQuotes(quotes.slice(0, 5));
      setKycStatus(kyc.kycStatus);
    }).finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: "Available RFQs", value: availableRfqs.length, color: "text-blue-600" },
    { label: "Active Quotes", value: myQuotes.filter(q => q.status === "PENDING").length, color: "text-yellow-600" },
    { label: "Accepted Quotes", value: myQuotes.filter(q => q.status === "ACCEPTED").length, color: "text-green-600" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your bids and deliveries</p>
        </div>
        <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${statusColor(kycStatus)}`}>
          KYC: {kycStatus}
        </span>
      </div>

      {kycStatus !== "APPROVED" && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <div>
            <p className="font-medium text-amber-800">KYC Pending Approval</p>
            <p className="text-sm text-amber-600 mt-0.5">
              You cannot submit quotes until your KYC is approved by admin.
            </p>
          </div>
          <Link href="/vendor/kyc"
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors">
            Upload Documents
          </Link>
        </div>
      )}

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
            <h2 className="font-semibold text-gray-900">Available RFQs Near You</h2>
            <Link href="/vendor/rfqs" className="text-sm text-orange-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y">
            {loading ? (
              <div className="p-6 text-gray-400 text-sm">Loading...</div>
            ) : availableRfqs.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">No open RFQs in your area</div>
            ) : availableRfqs.map(rfq => (
              <div key={rfq.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{rfq.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{rfq.referenceNumber} · {rfq.deliveryCity}</p>
                    {rfq.distanceKm && (
                      <p className="text-xs text-blue-600 mt-0.5">{rfq.distanceKm} km away</p>
                    )}
                  </div>
                  <Link href={`/vendor/rfqs/submit?id=${rfq.id}`}
                    className="ml-4 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700 whitespace-nowrap">
                    Quote
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">My Quotes</h2>
            <Link href="/vendor/quotes" className="text-sm text-orange-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y">
            {loading ? (
              <div className="p-6 text-gray-400 text-sm">Loading...</div>
            ) : myQuotes.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">No quotes submitted yet</div>
            ) : myQuotes.map(quote => (
              <div key={quote.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{quote.referenceNumber}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatINR(quote.totalAmount)} · {formatDate(quote.createdAt)}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(quote.status)}`}>
                    {quote.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
