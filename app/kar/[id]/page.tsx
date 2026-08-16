type Props = {
  params: {
    id: string;
  };
};

export default function KarPage({ params }: Props) {
  const karId = Number(params.id);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <h1 className="text-3xl">
        Dette er kar {karId}
      </h1>
    </main>
  );
}
