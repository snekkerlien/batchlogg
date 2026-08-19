export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <main className="flex items-center justify-center h-screen bg-zinc-900 text-white">
      <form
        action="/auth/signupAction"
        method="post"
        className="bg-zinc-800 p-6 rounded-xl w-80 space-y-4"
      >
        <h2 className="text-xl font-semibold text-center">Registrer ny konto</h2>

        <input
          type="text"
          name="username"
          placeholder="Brukernavn"
          required
          className="w-full p-2 rounded bg-zinc-700"
        />

        <input
          type="password"
          name="password"
          placeholder="Passord"
          required
          className="w-full p-2 rounded bg-zinc-700"
        />

        <button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 p-2 rounded font-semibold"
        >
          Registrer
        </button>

        <a
          href="/auth/login"
          className="block text-center text-sm text-blue-400 hover:text-blue-300 mt-4"
        >
          Allerede bruker? Logg inn
        </a>
      </form>
    </main>
  );
}
