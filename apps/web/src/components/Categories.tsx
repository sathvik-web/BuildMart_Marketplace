const categories = [
  "Cement",
  "Steel",
  "Bricks",
  "Sand",
  "Tiles",
  "Electrical",
  "Plumbing",
  "Paint"
];

export default function Categories() {
  return (
    <section className="py-16">

      <div className="max-w-7xl mx-auto px-6">

        <h2 className="text-2xl font-bold mb-8">
          Popular Materials
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

          {categories.map((cat) => (
            <div
              key={cat}
              className="border rounded-lg p-6 text-center hover:shadow"
            >
              {cat}
            </div>
          ))}

        </div>

      </div>

    </section>
  );
}