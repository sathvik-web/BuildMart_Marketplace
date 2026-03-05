import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="bg-orange-50 py-20">
      <div className="max-w-7xl mx-auto px-6 text-center">

        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Construction Materials Procurement Made Simple
        </h1>

        <p className="text-gray-600 mb-8">
          Compare prices, request quotes and connect with verified vendors.
        </p>

        <div className="flex justify-center gap-4">

          <Link
            href="/buyer/rfq/new"
            className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Request Quote
          </Link>

          <Link
            href="/materials"
            className="border px-6 py-3 rounded-lg"
          >
            Browse Materials
          </Link>

        </div>

      </div>
    </section>
  );
}