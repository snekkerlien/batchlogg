export default function Home() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Batchlogg</h1>
      <p className="mb-4">Velg et kar for å opprette en batch.</p>

      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map((id) => (
          <a
            key={id}
            href={`/kar/${id}`}
            className="block bg-blue-600 text-white px-4 py-2 rounded"
          >
            Kar {id}
          </a>
        ))}
      </div>
    </div>
  );
}
