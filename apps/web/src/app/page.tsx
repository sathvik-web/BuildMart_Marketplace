import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <nav className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <span className="font-bold text-xl text-gray-900">BuildMart</span>
        </div>
        <Link href="/login" className="px-5 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors">
          Get Started
        </Link>
      </nav>
      <div className="max-w-5xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">Construction Procurement<br />Made Simple</h1>
        <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto">
          Post RFQs, compare vendor quotes, and pay securely. Hyderabad's professional materials marketplace.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login" className="px-8 py-4 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors text-lg">
            Buy Materials
          </Link>
          <Link href="/login" className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-orange-400 hover:text-orange-600 transition-colors text-lg">
            Sell as Vendor
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-8 mt-24 text-left">
          {[
            { icon: "RFQ", title: "Post RFQ", desc: "Describe your material requirements. Takes 2 minutes." },
            { icon: "BID", title: "Get Quotes", desc: "Verified vendors within 50km are notified via WhatsApp." },
            { icon: "PAY", title: "Pay Safely", desc: "Razorpay escrow releases payment only after delivery." },
          ].map(f => (
            <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm border">
              <div className="w-10 h-10 bg-orange-100 text-orange-700 rounded-lg flex items-center justify-center text-xs font-bold mb-4">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
