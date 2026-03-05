"use client";

import { useEffect, useState } from "react";
import { materialApi } from "@/lib/api";

type Material = {
  id: string;
  name: string;
  category: string;
  unit: string;
};

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
        const res = await materialApi.list();

        console.log("API RESPONSE:", res);
        
        setMaterials(res.data.data || res.data);
    } catch (err) {
        console.error(err);
    }    
  };

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="max-w-7xl mx-auto">

        <h1 className="text-3xl font-bold mb-8">
          Materials Marketplace
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

          {Array.isArray(materials) && materials.map((material) => (
            <div
              key={material.id}
              className="bg-white border rounded-lg p-6 hover:shadow"
            >
              <h2 className="font-semibold text-lg mb-2">
                {material.name}
              </h2>

              <p className="text-sm text-gray-500 mb-2">
                Category: {material.category}
              </p>

              <p className="text-sm text-gray-500">
                Unit: {material.unit}
              </p>

              <button className="mt-4 w-full bg-orange-600 text-white py-2 rounded-lg">
                Request Quote
              </button>
            </div>
          ))}

        </div>

      </div>
    </main>
  );
}