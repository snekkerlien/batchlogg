export default function EnvTest() {
  return (
    <pre className="text-white p-6">
      {JSON.stringify(
        {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20) + "...",
        },
        null,
        2
      )}
    </pre>
  );
}
