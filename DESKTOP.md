# Batchlogg Desktop

Batchlogg Desktop is a Tauri shell for the hosted Batchlogg web app. The app's
Next.js server routes, Supabase authentication, and data remain on the hosted
service, so an internet connection is required.

## Development

Install the Tauri prerequisites for your operating system, then install the
project dependencies:

```sh
npm install
npm run tauri:dev
```

The shell checks that `https://batchlogg.vercel.app` is reachable, then opens
Batchlogg. If the site is unavailable, it shows a retry message.
External web links open in the system browser, and file downloads use a native
save dialog.

## Build installers

```sh
npm run tauri:build
```

Tauri writes build output under `src-tauri/target/release/bundle`. Build Windows
installers on Windows and macOS installers on macOS; each platform requires its
own native toolchain. Tauri's Windows prerequisites include Rust, Microsoft C++
Build Tools, and WebView2. macOS builds require Rust and Xcode Command Line Tools.

These unsigned builds are suitable for testing. Public distribution may require
code signing and notarization, especially on macOS.

## Publishing downloads

Push a version tag matching the app version, such as `desktop-v2.0.0`, to start
the GitHub Actions workflow. It builds signed Windows MSI/EXE installers and a
universal macOS DMG plus `.app.tar.gz` updater bundle, then attaches them and an
update manifest to a release in this repository. When the desktop app starts,
it checks for an update and asks before downloading and installing it. The website's
`/download-app` page links to this repository's latest release. The workflow
uses GitHub Actions' built-in token and needs no personal access token secret.

### Updater signing key

Updater packages must be signed. The matching public key is embedded in the
Tauri configuration; the private key must never be committed or shared. A
signing key has already been generated locally at
`~/.tauri/batchlogg.key` (on Windows, `%USERPROFILE%\.tauri\batchlogg.key`).
Back it up securely: losing it prevents future updates for existing installs.

Add its contents as the repository Actions secret `TAURI_SIGNING_PRIVATE_KEY`.
With the GitHub CLI installed and authenticated, run this in PowerShell:

```powershell
Get-Content -Raw "$HOME\.tauri\batchlogg.key" |
  gh secret set TAURI_SIGNING_PRIVATE_KEY --repo snekkerlien/batchlogg
```

Alternatively, add the file contents in the repository's **Settings → Secrets
and variables → Actions**. The key was generated without a password, so no
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secret is needed.

Because the downloads use this repository's public GitHub Releases, the
repository must remain public. GitHub also exposes source archives for public
repositories; use a separate public downloads repository if the application
source needs to be private.

The Tauri package, Cargo crate, and Tauri config versions should be updated
together before creating a tag. The workflow is not triggered until the tag is
pushed and the builds complete successfully. Unsigned installers can show
operating-system security warnings.
