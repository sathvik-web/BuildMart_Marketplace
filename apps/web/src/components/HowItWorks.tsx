export default function HowItWorks() {
  return (
    <section className="bg-gray-50 py-16">

      <div className="max-w-7xl mx-auto px-6 text-center">

        <h2 className="text-2xl font-bold mb-10">
          How BuildMart Works
        </h2>

        <div className="grid md:grid-cols-3 gap-8">

          <div>
            <h3 className="font-semibold mb-2">
              Request Quote
            </h3>
            <p className="text-gray-600">
              Tell us what materials you need.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">
              Vendors Respond
            </h3>
            <p className="text-gray-600">
              Verified suppliers send competitive quotes.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">
              Choose Best Offer
            </h3>
            <p className="text-gray-600">
              Compare prices and order easily.
            </p>
          </div>

        </div>

      </div>

    </section>
  );
}