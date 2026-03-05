"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { rfqApi, materialApi, type Material } from "@/lib/api";

export default function NewRfqPage() {
  const router = useRouter();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [expectedDate, setExpectedDate] = useState("");

  const [items, setItems] = useState([
    {
      materialId: "",
      quantity: "",
      unitOfMeasure: "BAG",
      specifications: "",
    },
  ]);

  /* ───────────────────────────────────────────── */
  /* Load materials from API                       */
  /* ───────────────────────────────────────────── */

  useEffect(() => {
    async function loadMaterials() {
      try {
        const res = await materialApi.list();
        setMaterials(res.data.data || []);
      } catch (err) {
        console.error("Failed to load materials", err);
      } finally {
        setMaterialsLoading(false);
      }
    }

    loadMaterials();
  }, []);

  /* ───────────────────────────────────────────── */
  /* Item helpers                                  */
  /* ───────────────────────────────────────────── */

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { materialId: "", quantity: "", unitOfMeasure: "BAG", specifications: "" },
    ]);

  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));

  const updateItem = (i: number, field: string, value: string) =>
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === i ? { ...item, [field]: value } : item
      )
    );

  /* ───────────────────────────────────────────── */
  /* Submit RFQ                                    */
  /* ───────────────────────────────────────────── */

  const handleSubmit = async (
    e: React.FormEvent,
    publish = false
  ) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const validItems = items.filter(
        (i) => i.materialId && i.quantity
      );

      if (!validItems.length) {
        setError("Add at least one material item.");
        setLoading(false);
        return;
      }

      const res = await rfqApi.create({
        title,
        description,
        deliveryAddress: address,
        deliveryPincode: pincode,
        deliveryLat: 17.385,
        deliveryLng: 78.4867,
        expectedDeliveryDate: expectedDate || undefined,
        items: validItems.map((i) => ({
          materialId: i.materialId,
          quantity: Number(i.quantity),
          unitOfMeasure: i.unitOfMeasure,
          specifications: i.specifications || undefined,
        })),
      });

      const rfq = res.data?.data || res.data;

      if (publish) {
        await rfqApi.publish(rfq.id);
      }

      router.push("/buyer/dashboard");

    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to create RFQ");
    } finally {
      setLoading(false);
    }
  };

  const uomOptions = ["BAG", "MT", "CFT", "UNIT", "KG", "SQFT"];

  /* ───────────────────────────────────────────── */
  /* UI                                            */
  /* ───────────────────────────────────────────── */

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Create New RFQ
        </h1>

        <p className="text-gray-500 mt-1">
          Post a request to receive quotes from verified vendors within 50km
        </p>
      </div>

      <form
        onSubmit={(e) => handleSubmit(e, false)}
        className="space-y-6"
      >

        {/* Project Details */}

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">
            Project Details
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              RFQ Title *
            </label>

            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. OPC 53 Grade Cement for G+3 residential building"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>

            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Project scope, quality requirements, site access..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Delivery Details */}

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">
            Delivery Details
          </h2>

          <input
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Site address"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
          />

          <div className="grid grid-cols-2 gap-4">

            <input
              required
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="Pincode"
              maxLength={6}
              className="px-3 py-2.5 border border-gray-300 rounded-lg"
            />

            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="px-3 py-2.5 border border-gray-300 rounded-lg"
            />

          </div>
        </div>

        {/* Materials */}

        <div className="bg-white rounded-xl border p-6 space-y-4">

          <div className="flex justify-between">
            <h2 className="font-semibold text-gray-900">
              Materials Required
            </h2>

            <button
              type="button"
              onClick={addItem}
              className="text-orange-600 text-sm font-medium"
            >
              + Add Item
            </button>
          </div>

          {items.map((item, i) => (
            <div
              key={i}
              className="p-4 bg-gray-50 rounded-lg space-y-3"
            >

              <select
                value={item.materialId}
                onChange={(e) =>
                  updateItem(i, "materialId", e.target.value)
                }
                className="w-full px-2 py-2 border rounded-lg"
              >
                <option value="">
                  {materialsLoading
                    ? "Loading materials..."
                    : "Select material"}
                </option>

                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.grade ? `(${m.grade})` : ""}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">

                <input
                  type="number"
                  placeholder="Quantity"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(i, "quantity", e.target.value)
                  }
                  className="px-2 py-2 border rounded-lg"
                />

                <select
                  value={item.unitOfMeasure}
                  onChange={(e) =>
                    updateItem(i, "unitOfMeasure", e.target.value)
                  }
                  className="px-2 py-2 border rounded-lg"
                >
                  {uomOptions.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>

              </div>

              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="text-red-500 text-sm"
                >
                  Remove
                </button>
              )}

            </div>
          ))}

        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 p-3 rounded">
            {error}
          </p>
        )}

        {/* Buttons */}

        <div className="flex gap-3">

          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 border rounded-lg font-semibold"
          >
            {loading ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={loading}
            className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-semibold"
          >
            {loading ? "Publishing..." : "Publish RFQ"}
          </button>

        </div>

      </form>
    </div>
  );
}