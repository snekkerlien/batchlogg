export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        action="/auth/loginAction"
        method="post"
        className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-sm border border-white/10 space-y-4"
      >
        <h2 className="text-2xl font-bold text-center">Logg inn</h2>

        <input
          type="text"
          name="username"
          placeholder="Brukernavn"
          required
          className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/20"
        />

        <input
          type="password"
          name="password"
          placeholder="Passord"
          required
          className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/20"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-lg font-semibold"
        >
          Logg inn
        </button>

        <a
          href="/auth/signup"
          className="block text-center text-sm text-blue-300 hover:text-blue-200 mt-2"
        >
          Registrer ny konto
        </a>
      </form>
    </main>
  );
}
