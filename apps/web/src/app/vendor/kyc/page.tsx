"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { kycApi } from "@/lib/api";

const DOC_TYPES = [
  { key: "GSTIN_CERT", label: "GSTIN Certificate", desc: "GST registration certificate issued by govt." },
  { key: "SHOP_LICENSE", label: "Shop & Establishment License", desc: "Local municipal license for your business." },
  { key: "PAN_CARD", label: "PAN Card", desc: "Business or personal PAN card." },
];

export default function KycPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const documents = DOC_TYPES
        .filter(d => urls[d.key])
        .map(d => ({
          documentType: d.key,
          fileUrl: urls[d.key],
          fileKey: urls[d.key],
          mimeType: "application/pdf",
          fileSizeBytes: 0,
        }));
      if (documents.length === 0) {
        setError("Please provide at least one document URL.");
        setLoading(false);
        return;
      }
      await kycApi.submit({ documents });
      setSuccess(true);
      setTimeout(() => router.push("/vendor/dashboard"), 2500);
    } catch (err: any) {
      setError(err.message ?? "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-green-600 text-2xl">OK</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Documents Submitted!</h2>
        <p className="text-gray-500">Our admin team will review within 24 hours. Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">KYC Verification</h1>
      <p className="text-gray-500 mb-8">
        Upload your business documents for verification. Admin reviews within 24 hours.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {DOC_TYPES.map(doc => (
          <div key={doc.key} className="bg-white rounded-xl border p-6">
            <h3 className="font-medium text-gray-900">{doc.label}</h3>
            <p className="text-xs text-gray-500 mb-3 mt-0.5">{doc.desc}</p>
            <input type="url" value={urls[doc.key] ?? ""}
              onChange={e => setUrls(prev => ({ ...prev, [doc.key]: e.target.value }))}
              placeholder="Paste the public URL of your uploaded document"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <p className="text-xs text-gray-400 mt-1">
              Upload your file to Google Drive, Dropbox, or any cloud storage and paste the shareable link here.
            </p>
          </div>
        ))}

        {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors">
          {loading ? "Submitting for review..." : "Submit Documents for Review"}
        </button>
      </form>
    </div>
  );
}
