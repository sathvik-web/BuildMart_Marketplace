import Link from "next/link";

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <Link href="/buyer/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-orange-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">B</span>
          </div>
          <span className="font-bold text-gray-900">BuildMart</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/buyer/dashboard" className="text-sm text-gray-600 hover:text-orange-600">Dashboard</Link>
          <Link href="/buyer/rfq/new" className="text-sm text-gray-600 hover:text-orange-600">New RFQ</Link>
          <Link href="/buyer/orders" className="text-sm text-gray-600 hover:text-orange-600">Orders</Link>
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">Buyer</span>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
