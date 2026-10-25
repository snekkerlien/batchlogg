import Image from "next/image";
import DownloadAppTopBar from "./DownloadAppTopBar";

const latestReleaseApiUrl =
  "https://api.github.com/repos/snekkerlien/batchlogg/releases/latest";

export default async function DownloadAppPage() {
  const response = await fetch(latestReleaseApiUrl, {
    headers: { Accept: "application/vnd.github+json" },
    next: { revalidate: 3600 },
  });
  if (!response.ok) {
    throw new Error(`Could not load the latest desktop release (${response.status})`);
  }
  const releaseData: unknown = await response.json();
  if (
    typeof releaseData !== "object" ||
    releaseData === null ||
    !("tag_name" in releaseData) ||
    typeof releaseData.tag_name !== "string"
  ) {
    throw new Error("The latest desktop release did not include a valid release tag");
  }
  const latestReleaseTag = releaseData.tag_name;
  const displayedReleaseVersion = latestReleaseTag.replace(/^desktop-/i, "");
  const releaseDownloadUrl = `https://github.com/snekkerlien/batchlogg/releases/download/${encodeURIComponent(latestReleaseTag)}`;

  return (
    <main className="min-h-screen px-2 py-12 text-white sm:px-6">
      <div className="relative mx-auto mt-12 w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/85 p-3 pt-16 shadow-2xl backdrop-blur-md sm:p-8 sm:pt-16">
        <DownloadAppTopBar />

        <section
          aria-labelledby="download-app-heading"
          className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-zinc-950 to-black px-5 py-8 shadow-inner shadow-white/5 sm:px-10 sm:py-10"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background:
                "linear-gradient(115deg, rgb(255 255 255 / 10%) 0%, rgb(255 255 255 / 3%) 18%, transparent 38%, rgb(0 0 0 / 14%) 100%)",
            }}
          />
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 z-0 h-72 w-72 rounded-full bg-white/[0.03] blur-3xl" />
          <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
            <div aria-hidden="true" className="mb-4 grid h-20 w-20 place-items-center rounded-2xl border border-white/40 bg-zinc-100 p-1.5 shadow-xl shadow-black/30 sm:h-24 sm:w-24">
              <Image
                src="/batchlogg-logo.png"
                alt=""
                width={80}
                height={80}
                priority
                className="h-full w-full object-contain"
              />
            </div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white/70 shadow-[0_0_12px_rgba(255,255,255,0.35)]" />
              Batchlogg Desktop
            </p>
            <h1 id="download-app-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Your brewing workspace, on desktop
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
              Track batches, manage recipes and inventory, and stay connected
              with the brewing community in a dedicated app for Windows and
              macOS. The app checks for updates automatically at startup and
              prompts you to install a new version when one is available.
            </p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-4 py-1.5 text-sm text-white/75">
              Latest release
              <span className="font-semibold text-white">{displayedReleaseVersion}</span>
            </p>

            <aside
              aria-labelledby="unsigned-release-heading"
              className="download-release-notice mt-5 w-full max-w-2xl rounded-2xl border p-3 text-left shadow-lg shadow-black/20 sm:p-4"
            >
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="download-release-notice__icon mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-bold">
                  !
                </span>
                <div>
                  <h2 id="unsigned-release-heading" className="font-bold">
                    Important: releases are not signed yet
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-white/85">
                    Batchlogg desktop releases are currently unsigned. Windows
                    or macOS may display a security warning when you install or
                    open the app. This warning is expected for the official
                    release.
                  </p>
                </div>
              </div>
            </aside>

            <p className="mt-4 text-sm text-white/55">
              Choose your operating system below · Requires an internet connection
            </p>
          </div>
        </section>

        <section aria-labelledby="installer-heading" className="py-10 sm:py-12">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-200/70">
              Get set up
            </p>
            <h2 id="installer-heading" className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Choose the installer for your computer
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-white/60">
              Open the latest release and download the file that matches your
              operating system.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5 transition hover:border-green-300/25">
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-green-300/20 bg-green-300/10 text-sm font-bold text-green-200">
                01
              </span>
              <h3 className="text-lg font-semibold text-white">Windows</h3>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Download the installer for your Windows computer.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <a
                  href={`${releaseDownloadUrl}/Batchlogg-Windows-x64.exe`}
                  aria-label={`Download Batchlogg for Windows 64-bit, ${displayedReleaseVersion}`}
                  className="inline-flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-white/20 bg-white/[0.08] px-2 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-white/[0.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <span>Windows 64-bit</span>
                  <span className="text-xs font-medium text-white/65">{displayedReleaseVersion}</span>
                </a>
                <a
                  href={`${releaseDownloadUrl}/Batchlogg-Windows-32-bit.exe`}
                  aria-label={`Download Batchlogg for Windows 32-bit, ${displayedReleaseVersion}`}
                  className="inline-flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-white/20 bg-white/[0.08] px-2 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-white/[0.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <span>Windows 32-bit</span>
                  <span className="text-xs font-medium text-white/65">{displayedReleaseVersion}</span>
                </a>
              </div>
            </section>
            <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5 transition hover:border-green-300/25">
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-300/20 bg-blue-300/10 text-sm font-bold text-blue-200">
                02
              </span>
              <h3 className="text-lg font-semibold text-white">macOS</h3>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Get the universal installer for Apple silicon and Intel Macs.
              </p>
              <a
                href={`${releaseDownloadUrl}/Batchlogg-macOS-universal.dmg`}
                aria-label={`Download Batchlogg for macOS Universal, ${displayedReleaseVersion}`}
                className="mx-auto mt-5 flex min-h-11 w-fit flex-col items-center justify-center gap-0.5 rounded-xl border border-white/20 bg-white/[0.08] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span>Download for macOS (Universal)</span>
                <span className="text-xs font-medium text-white/65">{displayedReleaseVersion}</span>
              </a>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
