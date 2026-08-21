import KarPage from "../../kar/[id]/KarPage";

export default function Page({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen p-6 text-white">
      <KarPage />
    </div>
  );
}
