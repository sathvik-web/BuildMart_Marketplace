import Link from "next/link";

export default function CTAEstimate() {
  return (
    <section className="py-20 bg-orange-600 text-white text-center">

      <h2 className="text-3xl font-bold mb-4">
        Need a cost estimate for your project?
      </h2>

      <p className="mb-8">
        Get instant material estimates and supplier quotes.
      </p>

      <Link
        href="/buyer/rfq/new"
        className="bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold"
      >
        Request Quote
      </Link>

    </section>
  );
}