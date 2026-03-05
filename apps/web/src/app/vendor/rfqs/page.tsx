"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { rfqApi, type Rfq } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function VendorRfqsPage() {
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rfqApi.listAvailable().then(r => setRfqs(r.items)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-8 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Available RFQs</h1>
      <p className="text-gray-500 mb-8">Open RFQs within your service area, sorted by distance</p>

      {rfqs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No open RFQs in your service area right now. Check back soon.
        </div>
      ) : (
        <div className="space-y-4">
          {rfqs.map(rfq => (
            <div key={rfq.id} className="bg-white rounded-xl border p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{rfq.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{rfq.referenceNumber} · {rfq.deliveryAddress}</p>
                </div>
                {rfq.distanceKm && (
                  <span className="text-sm text-blue-600 font-medium ml-4 whitespace-nowrap">
                    {rfq.distanceKm} km away
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {rfq.items?.slice(0, 4).map(item => (
                  <span key={item.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                    {item.material?.name} x {item.quantity} {item.unitOfMeasure}
                  </span>
                ))}
                {rfq.items?.length > 4 && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                    +{rfq.items.length - 4} more
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {rfq.expectedDeliveryDate ? `Needed by ${formatDate(rfq.expectedDeliveryDate)} · ` : ""}
                  Expires {rfq.expiresAt ? formatDate(rfq.expiresAt) : "N/A"}
                  {rfq.quotesReceived > 0 ? ` · ${rfq.quotesReceived} quote(s) received` : ""}
                </p>
                <Link href={`/vendor/rfqs/submit?id=${rfq.id}`}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors">
                  Submit Quote
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
