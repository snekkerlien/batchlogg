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

Push a version tag such as `desktop-v0.2.0` to start the GitHub Actions workflow.
It builds Windows MSI/EXE installers and a universal macOS DMG, then attaches
them to a GitHub release. The website's `/download-app` page links to the latest
release.

The Tauri package, Cargo crate, and Tauri config versions should be updated
together before creating a tag. The release workflow is not triggered until the
tag is pushed and the build completes successfully. Unsigned installers can
show operating-system security warnings.
