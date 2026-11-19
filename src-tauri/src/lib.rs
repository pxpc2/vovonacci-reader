use std::sync::Mutex;
use tauri::{Emitter, Manager};

/// Holds the file path passed on the very first launch (e.g. double-clicking a PDF
/// in Explorer when Vovonacci Reader is the default handler). The frontend drains
/// this once on mount via `take_launch_file`.
struct LaunchFile(Mutex<Option<String>>);

/// Where the window-state plugin stores the last window geometry (inside the app
/// config dir). Its absence means this is a first launch.
const WINDOW_STATE_FILE: &str = ".window-state.json";

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
        // remembers the window's position / size / maximized state across launches.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_filename(WINDOW_STATE_FILE)
                .build(),
        )
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

            if let Some(win) = app.get_webview_window("main") {
                // The window-state plugin has already restored the last position /
                // size if it had one saved. Only on a first launch (no saved state)
                // fall back to the default: a tall, portrait-leaning window sized to
                // the actual monitor (accounting for DPI scaling) so the title bar
                // never lands off-screen. ~92% of the screen height, width kept at
                // the 1280 design width when it fits.
                let has_saved_state = app
                    .path()
                    .app_config_dir()
                    .map(|dir| dir.join(WINDOW_STATE_FILE).exists())
                    .unwrap_or(false);
                if !has_saved_state {
                    if let Ok(Some(monitor)) = win.current_monitor() {
                        let scale = monitor.scale_factor();
                        let phys = monitor.size();
                        let avail_w = phys.width as f64 / scale;
                        let avail_h = phys.height as f64 / scale;
                        let h = (avail_h * 0.92).clamp(600.0, 1300.0);
                        let w = 1280.0_f64.min(avail_w * 0.95);
                        let _ = win.set_size(tauri::LogicalSize::new(w, h));
                        let _ = win.center();
                    }
                }
                // The window starts hidden (tauri.conf.json) so it never flashes at
                // the default spot before being moved; show it now that it's placed.
                let _ = win.show();
                let _ = win.set_focus();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![read_pdf, take_launch_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
