import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function KarPage({ params }: Props) {
  // Next.js 16: params er en Promise → må await'es
  const { id } = await params;

  const karId = Number(id);

  // Valider ID
  if (isNaN(karId) || karId < 1 || karId > 6) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Kar {karId}</h1>
        <p className="text-lg opacity-80">
          Dette er informasjonssiden for kar nummer {karId}.
        </p>
      </div>
    </main>
  );
}
