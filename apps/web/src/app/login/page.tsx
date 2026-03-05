"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

type Step = "phone" | "otp" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"BUYER" | "VENDOR">("BUYER");
  const [businessName, setBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [shopLic, setShopLic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try { await authApi.sendOtp(phone); setStep("otp"); }
    catch (err: any) { setError(err.message ?? "Failed to send OTP"); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const { user, isNewUser } = await authApi.verifyOtp(phone, otp);
      if (isNewUser || !user.name) { setStep("register"); return; }
      router.push(user.role === "VENDOR" ? "/vendor/dashboard" : user.role === "ADMIN" ? "/admin/dashboard" : "/buyer/dashboard");
    } catch (err: any) { setError(err.message ?? "Invalid OTP"); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const { user } = await authApi.register({
        name, role,
        ...(role === "VENDOR" ? { businessName, gstinNumber: gstin, businessPan: pan, shopLicenseNumber: shopLic } : {}),
      });
      router.push(role === "VENDOR" ? "/vendor/dashboard" : "/buyer/dashboard");
    } catch (err: any) { setError(err.message ?? "Registration failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">B</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">BuildMart</h1>
          <p className="text-gray-500 mt-1">Construction Procurement, Hyderabad</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-8">
          {step === "phone" && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">Enter your phone</h2>
                <p className="text-sm text-gray-500">We will send a one-time password</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 text-sm">+91</span>
                  <input type="tel" maxLength={10} required value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="98765 43210"
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">I am a</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["BUYER", "VENDOR"] as const).map(r => (
                    <button key={r} type="button" onClick={() => setRole(r)}
                      className={`py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${role === r ? "border-orange-600 bg-orange-50 text-orange-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                      {r === "BUYER" ? "Buyer" : "Vendor"}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button type="submit" disabled={loading || phone.length < 10}
                className="w-full py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors">
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          )}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">Verify OTP</h2>
                <p className="text-sm text-gray-500">Sent to +91 {phone}</p>
              </div>
              <input type="text" maxLength={6} required value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 6-digit OTP"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500" />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button type="submit" disabled={loading || otp.length < 6}
                className="w-full py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50">
                {loading ? "Verifying..." : "Verify and Continue"}
              </button>
              <button type="button" onClick={() => setStep("phone")} className="w-full text-sm text-gray-500 hover:text-gray-700">
                Change number
              </button>
            </form>
          )}
          {step === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Complete profile</h2>
                <p className="text-sm text-gray-500">One-time setup</p>
              </div>
              <input required value={name} onChange={e => setName(e.target.value)}
                placeholder="Full name"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              {role === "VENDOR" && (
                <>
                  <input required value={businessName} onChange={e => setBusinessName(e.target.value)}
                    placeholder="Business name"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  <input required value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} maxLength={15}
                    placeholder="GSTIN (15 characters)"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  <input required value={pan} onChange={e => setPan(e.target.value.toUpperCase())} maxLength={10}
                    placeholder="PAN (10 characters)"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  <input required value={shopLic} onChange={e => setShopLic(e.target.value)}
                    placeholder="Shop License Number"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg">
                    KYC documents will be reviewed by admin before you can submit quotes.
                  </p>
                </>
              )}
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50">
                {loading ? "Saving..." : "Create Account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
