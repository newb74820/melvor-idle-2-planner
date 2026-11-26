mod save_decoder;

#[tauri::command]
fn decode_save(payload: String) -> Result<save_decoder::DecodedSave, String> {
  save_decoder::decode_save_base64(&payload)
}

#[tauri::command]
fn list_save_files(directory: String) -> Result<Vec<save_decoder::SaveFileEntry>, String> {
  save_decoder::list_save_files(&directory)
}

#[tauri::command]
fn load_save_from_directory(
  directory: String,
  file_name: String,
) -> Result<save_decoder::LoadedSave, String> {
  save_decoder::load_save_from_directory(&directory, &file_name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      decode_save,
      list_save_files,
      load_save_from_directory
    ])
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
