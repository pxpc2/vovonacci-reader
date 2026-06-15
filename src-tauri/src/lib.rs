use std::sync::Mutex;
use tauri::{Emitter, Manager};

/// Holds the file path passed on the very first launch (e.g. double-clicking a PDF
/// in Explorer when Vovonacci Reader is the default handler). The frontend drains
/// this once on mount via `take_launch_file`.
struct LaunchFile(Mutex<Option<String>>);

/// Read a PDF (or any file) from an absolute path and return the raw bytes.
/// Returned as a binary `Response` so it arrives in the webview as an ArrayBuffer
/// instead of a giant JSON number array.
#[tauri::command]
fn read_pdf(path: String) -> Result<tauri::ipc::Response, String> {
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}

/// Drain the launch file path (returns it once, then clears it).
#[tauri::command]
fn take_launch_file(state: tauri::State<LaunchFile>) -> Option<String> {
    state.0.lock().unwrap().take()
}

/// Find the first command-line argument that looks like a PDF path.
fn first_pdf_arg(args: &[String]) -> Option<String> {
    args.iter()
        .skip(1)
        .find(|a| a.to_lowercase().ends_with(".pdf"))
        .cloned()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // single-instance MUST be registered first: a second launch (e.g. opening
        // another PDF) forwards its file arg to the already-running window.
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(path) = first_pdf_arg(&args) {
                let _ = app.emit("open-file", path);
            }
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_focus();
                let _ = w.unminimize();
            }
        }))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        // auto-updater + relaunch (the frontend checks on launch and, on accept,
        // downloads/installs then calls process.relaunch()).
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let args: Vec<String> = std::env::args().collect();
            app.manage(LaunchFile(Mutex::new(first_pdf_arg(&args))));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![read_pdf, take_launch_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
