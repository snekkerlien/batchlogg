fn main() {
    let attributes = tauri_build::Attributes::new()
        .app_manifest(
            tauri_build::AppManifest::new()
                .commands(&["save_download", "toggle_fullscreen"]),
        );
    tauri_build::try_build(attributes).expect("failed to run tauri-build");
}
