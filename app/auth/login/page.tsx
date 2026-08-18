export default function LoginPage() {
  return (
    <main className="flex items-center justify-center h-screen bg-zinc-900 text-white">
      <form
        action="https://batchlogg.vercel.app/auth/login"
        method="post"
        className="bg-zinc-800 p-6 rounded-xl w-80 space-y-4"
      >
        <h2 className="text-xl font-semibold text-center">Logg inn</h2>

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
          className="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded font-semibold"
        >
          Logg inn
        </button>

        <a
          href="/auth/signup"
          className="block text-center text-sm text-blue-400 hover:text-blue-300 mt-4"
        >
          Registrer ny kontooooooooooooooooooooo
        </a>
      </form>
    </main>
  );
}
