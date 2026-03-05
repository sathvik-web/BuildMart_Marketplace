"use client";
import { useState, useEffect } from "react";
import { quoteApi, type Quote } from "@/lib/api";
import { formatINR, formatDate, statusColor } from "@/lib/utils";

export default function VendorQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    quoteApi.mine().then(setQuotes).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-8 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My Quotes</h1>
      {quotes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No quotes submitted yet. Check the Available RFQs page to start bidding.
        </div>
      ) : (
        <div className="space-y-4">
          {quotes.map(q => (
            <div key={q.id} className="bg-white rounded-xl border p-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{q.referenceNumber}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {q.rfq?.title ?? "RFQ"} · Submitted {formatDate(q.createdAt)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Valid until {formatDate(q.validUntil)} · {q.deliveryDays} day delivery
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{formatINR(q.totalAmount)}</p>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(q.status)}`}>
                    {q.status}
                  </span>
                </div>
              </div>
              {q.status === "ACCEPTED" && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
                  Your quote was accepted. An order has been created — the buyer will make payment soon.
                </div>
              )}
              {q.status === "REJECTED" && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  This quote was not selected by the buyer.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
