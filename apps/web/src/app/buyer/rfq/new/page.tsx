"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { rfqApi, materialApi, type Material } from "@/lib/api";

export default function NewRfqPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [items, setItems] = useState([
    { materialId: "", quantity: "", unitOfMeasure: "BAG", specifications: "" },
  ]);

  useEffect(() => {
    materialApi.list().then(setMaterials).catch(() => {});
  }, []);

  const addItem = () =>
    setItems(prev => [...prev, { materialId: "", quantity: "", unitOfMeasure: "BAG", specifications: "" }]);

  const removeItem = (i: number) =>
    setItems(prev => prev.filter((_, idx) => idx !== i));

  const updateItem = (i: number, field: string, value: string) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const handleSubmit = async (e: React.FormEvent, publish = false) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const validItems = items.filter(i => i.materialId && i.quantity);
      if (!validItems.length) {
        setError("Add at least one material item.");
        setLoading(false);
        return;
      }
      const rfq = await rfqApi.create({
        title,
        description,
        deliveryAddress: address,
        deliveryPincode: pincode,
        deliveryLat: 17.385,
        deliveryLng: 78.4867,
        expectedDeliveryDate: expectedDate || undefined,
        items: validItems.map(i => ({
          materialId: i.materialId,
          quantity: Number(i.quantity),
          unitOfMeasure: i.unitOfMeasure,
          specifications: i.specifications || undefined,
        })),
      });
      if (publish) await rfqApi.publish(rfq.id);
      router.push("/buyer/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Failed to create RFQ");
    } finally {
      setLoading(false);
    }
  };

  const uomOptions = ["BAG", "MT", "CFT", "UNIT", "KG", "SQFT"];

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create New RFQ</h1>
        <p className="text-gray-500 mt-1">Post a request to receive quotes from verified vendors within 50km</p>
      </div>

      <form className="space-y-6">
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Project Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RFQ Title *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. OPC 53 Grade Cement for G+3 residential building, Banjara Hills"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Project scope, quality requirements, site access details..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Delivery Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site Address *</label>
            <input required value={address} onChange={e => setAddress(e.target.value)}
              placeholder="Plot 45, Road No 12, Banjara Hills, Hyderabad"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
              <input required value={pincode} onChange={e => setPincode(e.target.value)} maxLength={6}
                placeholder="500034"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
              <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Materials Required</h2>
            <button type="button" onClick={addItem}
              className="text-sm text-orange-600 hover:underline font-medium">
              + Add Item
            </button>
          </div>
          {items.map((item, i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Material *</label>
                  <select value={item.materialId} onChange={e => updateItem(i, "materialId", e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="">Select material...</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}{m.grade ? ` (${m.grade})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                    <input type="number" min="0.01" step="0.01" value={item.quantity}
                      onChange={e => updateItem(i, "quantity", e.target.value)}
                      placeholder="200"
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                    <select value={item.unitOfMeasure} onChange={e => updateItem(i, "unitOfMeasure", e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                      {uomOptions.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Specifications</label>
                  <input value={item.specifications} onChange={e => updateItem(i, "specifications", e.target.value)}
                    placeholder="ISI marked, Grade 53, specific brand..."
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)}
                    className="self-end px-3 py-2 text-red-500 hover:text-red-700 font-bold text-lg">
                    x
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={e => handleSubmit(e, false)} disabled={loading}
            className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 disabled:opacity-50 transition-colors">
            {loading ? "Saving..." : "Save as Draft"}
          </button>
          <button type="button" onClick={e => handleSubmit(e, true)} disabled={loading}
            className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors">
            {loading ? "Publishing..." : "Publish RFQ"}
          </button>
        </div>
      </form>
    </div>
  );
}
