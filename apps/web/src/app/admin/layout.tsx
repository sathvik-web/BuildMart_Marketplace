import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gray-900 px-6 py-3 flex items-center justify-between">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-orange-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">B</span>
          </div>
          <span className="font-bold text-white">BuildMart Admin</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/admin/dashboard" className="text-sm text-gray-300 hover:text-white">Dashboard</Link>
          <span className="text-xs bg-red-800 text-red-200 px-2 py-1 rounded-full font-medium">Admin</span>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
