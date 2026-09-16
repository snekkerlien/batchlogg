import { supabaseServer } from "../../lib/supabase/supabaseServerFinal";

export default async function AdminPage() {
  const { supabase } = supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== "mads@snekkerlien.no") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-red-400 text-xl font-bold">
          Access denied.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-10">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

      <div className="space-y-4">
        <a
          href="/dashboard"
          className="block text-blue-400 underline text-lg"
        >
          Dashboard
        </a>

        <a
          href="/admin/users"
          className="block text-blue-400 underline text-lg"
        >
          Manage Users
        </a>
      </div>
    </main>
  );
}
