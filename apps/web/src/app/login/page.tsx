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

  /* SEND OTP */

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await authApi.sendOtp(phone);
      setStep("otp");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  /* VERIFY OTP */

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await authApi.verifyOtp(phone, otp);
      const { user, isNewUser } = res.data;

      if (isNewUser || !user?.name) {
        setStep("register");
        return;
      }

      router.push(
        user.role === "VENDOR"
          ? "/vendor/dashboard"
          : user.role === "ADMIN"
          ? "/admin/dashboard"
          : "/buyer/dashboard"
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  /* REGISTER USER */

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await authApi.register({
        name,
        phone, // ✅ IMPORTANT FIX
        role,
        ...(role === "VENDOR"
          ? {
              businessName,
              gstinNumber: gstin,
              businessPan: pan,
              shopLicenseNumber: shopLic,
            }
          : {}),
      });

      const { user } = res.data;

      router.push(
        user.role === "VENDOR"
          ? "/vendor/dashboard"
          : "/buyer/dashboard"
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* HEADER */}

        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">B</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">BuildMart</h1>
          <p className="text-gray-500 mt-1">
            Construction Procurement, Hyderabad
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-8">

          {/* PHONE STEP */}

          {step === "phone" && (
            <form onSubmit={handleSendOtp} className="space-y-5">

              <div>
                <h2 className="text-lg font-semibold">Enter your phone</h2>
                <p className="text-sm text-gray-500">
                  We will send a one-time password
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number
                </label>

                <div className="flex">
                  <span className="px-3 py-2.5 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 text-sm">
                    +91
                  </span>

                  <input
                    type="tel"
                    maxLength={10}
                    required
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, ""))
                    }
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-r-lg text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  I am a
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {(["BUYER", "VENDOR"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-2.5 rounded-lg border-2 text-sm font-medium ${
                        role === r
                          ? "border-orange-600 bg-orange-50 text-orange-700"
                          : "border-gray-200 text-gray-600"
                      }`}
                    >
                      {r === "BUYER" ? "Buyer" : "Vendor"}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || phone.length < 10}
                className="w-full py-3 bg-orange-600 text-white rounded-lg font-semibold"
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>

            </form>
          )}

          {/* OTP STEP */}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">

              <div>
                <h2 className="text-lg font-semibold">Verify OTP</h2>
                <p className="text-sm text-gray-500">
                  Sent to +91 {phone}
                </p>
              </div>

              <input
                type="text"
                maxLength={6}
                required
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, ""))
                }
                className="w-full px-4 py-3 border rounded-lg text-center text-2xl tracking-widest"
              />

              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full py-3 bg-orange-600 text-white rounded-lg"
              >
                {loading ? "Verifying..." : "Verify and Continue"}
              </button>

              <button
                type="button"
                onClick={() => setStep("phone")}
                className="w-full text-sm text-gray-500"
              >
                Change number
              </button>

            </form>
          )}

          {/* REGISTER STEP */}

          {step === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">

              <div>
                <h2 className="text-lg font-semibold">Complete profile</h2>
                <p className="text-sm text-gray-500">
                  One-time setup
                </p>
              </div>

              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full px-3 py-2.5 border rounded-lg text-sm"
              />

              {role === "VENDOR" && (
                <>
                  <input
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Business name"
                    className="w-full px-3 py-2.5 border rounded-lg text-sm"
                  />

                  <input
                    required
                    value={gstin}
                    onChange={(e) =>
                      setGstin(e.target.value.toUpperCase())
                    }
                    placeholder="GSTIN"
                    className="w-full px-3 py-2.5 border rounded-lg text-sm"
                  />

                  <input
                    required
                    value={pan}
                    onChange={(e) =>
                      setPan(e.target.value.toUpperCase())
                    }
                    placeholder="PAN"
                    className="w-full px-3 py-2.5 border rounded-lg text-sm"
                  />

                  <input
                    required
                    value={shopLic}
                    onChange={(e) => setShopLic(e.target.value)}
                    placeholder="Shop License Number"
                    className="w-full px-3 py-2.5 border rounded-lg text-sm"
                  />
                </>
              )}

              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-orange-600 text-white rounded-lg font-semibold"
              >
                {loading ? "Saving..." : "Create Account"}
              </button>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}