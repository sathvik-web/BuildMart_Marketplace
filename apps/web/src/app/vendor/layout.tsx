import Link from "next/link";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <Link href="/vendor/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-orange-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">B</span>
          </div>
          <span className="font-bold text-gray-900">BuildMart</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/vendor/dashboard" className="text-sm text-gray-600 hover:text-orange-600">Dashboard</Link>
          <Link href="/vendor/rfqs" className="text-sm text-gray-600 hover:text-orange-600">Available RFQs</Link>
          <Link href="/vendor/quotes" className="text-sm text-gray-600 hover:text-orange-600">My Quotes</Link>
          <Link href="/vendor/kyc" className="text-sm text-gray-600 hover:text-orange-600">KYC</Link>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Vendor</span>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
