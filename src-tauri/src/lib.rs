#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .setup(|app| {
      let handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        if let Err(error) = check_for_updates(handle).await {
          eprintln!("Failed to check for or install a Batchlogg update: {error}");
        }
      });
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![save_download])
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}

#[tauri::command]
async fn save_download(
  app: tauri::AppHandle,
  file_name: String,
  contents: Vec<u8>,
) -> Result<bool, String> {
  use tauri_plugin_dialog::DialogExt;

  let safe_file_name = std::path::Path::new(&file_name)
    .file_name()
    .and_then(|name| name.to_str())
    .filter(|name| !name.is_empty())
    .ok_or_else(|| "Invalid download filename".to_string())?;
  let Some(file_path) = app
    .dialog()
    .file()
    .set_file_name(safe_file_name)
    .blocking_save_file()
  else {
    return Ok(false);
  };
  let path = file_path.into_path().map_err(|error| error.to_string())?;
  std::fs::write(path, contents).map_err(|error| error.to_string())?;
  Ok(true)
}

async fn check_for_updates(
  app: tauri::AppHandle,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
  use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
  use tauri_plugin_updater::UpdaterExt;

  let Some(update) = app.updater()?.check().await? else {
    return Ok(());
  };

  let prompt = format!(
    "Batchlogg version {} is available. Would you like to install it now?",
    update.version
  );
  let install = app
    .dialog()
    .message(prompt)
    .title("Batchlogg update available")
    .buttons(MessageDialogButtons::YesNo)
    .blocking_show();

  if install {
    update.download_and_install(|_, _| {}, || {}).await?;
    app.restart();
  }

  Ok(())
}
