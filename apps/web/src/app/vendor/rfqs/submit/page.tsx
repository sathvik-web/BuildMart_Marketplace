"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { rfqApi, quoteApi, type Rfq } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function SubmitQuotePage() {
  const router = useRouter();
  const params = useSearchParams();
  const rfqId = params.get("id") ?? "";

  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [gstPercent, setGstPercent] = useState("18");
  const [deliveryCharges, setDeliveryCharges] = useState("0");
  const [validUntil, setValidUntil] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("7");
  const [notes, setNotes] = useState("");
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!rfqId) return;
    rfqApi.get(rfqId).then(r => {
      setRfq(r);
      const prices: Record<string, string> = {};
      r.items.forEach(i => { prices[i.id] = ""; });
      setItemPrices(prices);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [rfqId]);

  const subtotal = rfq ? rfq.items.reduce(
    (sum, item) => sum + (Number(itemPrices[item.id] || 0) * Number(item.quantity)), 0
  ) : 0;
  const gst = subtotal * Number(gstPercent) / 100;
  const total = subtotal + gst + Number(deliveryCharges);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await quoteApi.create({
        rfqId,
        gstPercent: Number(gstPercent),
        deliveryCharges: Number(deliveryCharges),
        validUntil,
        deliveryDays: Number(deliveryDays),
        notes,
        items: rfq!.items.map(item => ({
          materialId: item.materialId,
          quantity: Number(item.quantity),
          unitOfMeasure: item.unitOfMeasure,
          unitPrice: Number(itemPrices[item.id] || 0),
        })),
      });
      router.push("/vendor/quotes");
    } catch (err: any) {
      setError(err.message ?? "Failed to submit quote");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="max-w-3xl mx-auto px-6 py-8 text-gray-400">Loading RFQ...</div>;
  if (!rfq) return <div className="max-w-3xl mx-auto px-6 py-8 text-red-500">RFQ not found</div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Submit Quote</h1>
      <p className="text-gray-500 mb-8">For: {rfq.title} ({rfq.referenceNumber})</p>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <h3 className="font-medium text-blue-900 mb-2">Materials Required</h3>
        <div className="space-y-1">
          {rfq.items.map(item => (
            <p key={item.id} className="text-sm text-blue-800">
              {item.material?.name} x {item.quantity} {item.unitOfMeasure}
              {item.specifications ? ` (${item.specifications})` : ""}
            </p>
          ))}
        </div>
        <p className="text-xs text-blue-600 mt-2">
          Delivery: {rfq.deliveryAddress}
          {rfq.expectedDeliveryDate ? ` · Needed by ${formatDate(rfq.expectedDeliveryDate)}` : ""}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Your Prices (per unit, in INR)</h2>
          {rfq.items.map(item => (
            <div key={item.id} className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.material?.name}</p>
                <p className="text-xs text-gray-500">{item.quantity} {item.unitOfMeasure} required</p>
              </div>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden w-44">
                <span className="px-3 py-2.5 bg-gray-50 text-gray-500 text-sm border-r">Rs.</span>
                <input type="number" min="0" step="0.01" required
                  value={itemPrices[item.id] || ""}
                  onChange={e => setItemPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                  placeholder="0.00"
                  className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
              </div>
              <p className="text-sm font-medium text-gray-700 w-28 text-right">
                = Rs. {(Number(itemPrices[item.id] || 0) * Number(item.quantity)).toLocaleString("en-IN")}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Quote Terms</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Rate</label>
              <select value={gstPercent} onChange={e => setGstPercent(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                {["5", "12", "18", "28"].map(v => (
                  <option key={v} value={v}>{v}%</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Charges (Rs.)</label>
              <input type="number" min="0" value={deliveryCharges} onChange={e => setDeliveryCharges(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quote Valid Until *</label>
              <input type="date" required value={validUntil} onChange={e => setValidUntil(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Days *</label>
              <input type="number" min="1" max="90" required value={deliveryDays}
                onChange={e => setDeliveryDays(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Terms</label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Brand details, warranty, payment terms, site access requirements..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 text-white">
          <h2 className="font-semibold mb-4">Quote Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Subtotal</span>
              <span>Rs. {subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">GST ({gstPercent}%)</span>
              <span>Rs. {gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Delivery</span>
              <span>Rs. {Number(deliveryCharges).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between border-t border-gray-700 pt-2 text-base font-bold">
              <span>Total Amount</span>
              <span className="text-orange-400">Rs. {total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

        <button type="submit" disabled={submitting || !validUntil}
          className="w-full py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors">
          {submitting ? "Submitting..." : "Submit Quote"}
        </button>
      </form>
    </div>
  );
}
