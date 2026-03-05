export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-10">

      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8">

        <div>
          <h3 className="text-white font-bold mb-2">
            BuildMart
          </h3>
          <p>
            Construction procurement platform connecting builders with suppliers.
          </p>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-2">
            Company
          </h3>
          <p>About</p>
          <p>Careers</p>
          <p>Contact</p>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-2">
            Resources
          </h3>
          <p>Materials</p>
          <p>Vendors</p>
          <p>Estimate Calculator</p>
        </div>

      </div>

    </footer>
  );
}
