import Image from "next/image";
import DownloadAppTopBar from "./DownloadAppTopBar";

const latestReleaseUrl =
  "https://github.com/snekkerlien/batchlogg/releases/latest";

export default function DownloadAppPage() {
  return (
    <main className="min-h-screen px-5 py-12 text-white">
      <div className="relative mx-auto flex min-h-[75vh] w-full max-w-4xl flex-col items-center justify-center gap-8 rounded-2xl border border-white/10 bg-black/60 p-6 pt-20 text-center backdrop-blur-md sm:p-10 sm:pt-20">
        <DownloadAppTopBar />

        <Image
          src="/batchlogg-logo.png"
          alt=""
          width={160}
          height={160}
          priority
          className="h-32 w-32 object-contain sm:h-40 sm:w-40"
        />

        <header className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-300">
            Batchlogg Desktop
          </p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
            Your brewing workspace, on desktop
          </h1>
          <p className="mt-5 text-lg leading-8 text-white/70">
            Track batches, manage recipes and inventory, and stay connected with
            the brewing community in a dedicated desktop app for Windows and
            macOS.
          </p>
        </header>

        <a
          href={latestReleaseUrl}
          className="inline-flex min-h-12 items-center justify-center rounded-lg bg-green-600 px-7 py-3 font-semibold text-white transition hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-300"
        >
          Download for Windows or macOS
        </a>

        <div className="max-w-xl space-y-3 text-sm leading-6 text-white/55">
          <p>
            Choose the installer for your computer from the latest release.
            Windows installers are labeled <span className="text-white/75">.msi</span> or{" "}
            <span className="text-white/75">.exe</span>; the macOS installer is{" "}
            <span className="text-white/75">.dmg</span>.
          </p>
          <p>
            The desktop app connects to Batchlogg online, so an internet
            connection is required. Releases are currently unsigned; your
            operating system may show a security warning during installation.
          </p>
        </div>

      </div>
    </main>
  );
}
