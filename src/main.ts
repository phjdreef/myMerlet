import { app, BrowserWindow, nativeImage } from "electron";
import type { NativeImage } from "electron";
import registerListeners from "./helpers/ipc/listeners-register";
import { mainStudentDB } from "./services/main-student-database";
import { curriculumDB } from "./services/curriculum-database";
import { runMigrations } from "./services/migrations";
// "electron-squirrel-startup" seems broken when packaging with vite
//import started from "electron-squirrel-startup";
import path from "path";
import { existsSync } from "node:fs";
import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";

const inDevelopment = process.env.NODE_ENV === "development";
let browserWindowIcon: string | NativeImage | undefined;
let dockIcon: NativeImage | undefined;

function resolveIconsRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "icons")
    : path.join(process.cwd(), "resources/icons");
}

function ensureIconPath(base: string, filename: string) {
  const candidate = path.join(base, filename);
  return existsSync(candidate) ? candidate : undefined;
}

function createWindow() {
  const preload = path.join(__dirname, "preload.js");
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      devTools: inDevelopment,
      contextIsolation: true,
      nodeIntegration: true,
      nodeIntegrationInSubFrames: false,

      preload: preload,
    },
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    trafficLightPosition:
      process.platform === "darwin" ? { x: 5, y: 5 } : undefined,
    icon: browserWindowIcon,
  });
  registerListeners(mainWindow);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
}

async function installExtensions() {
  try {
    const result = await installExtension(REACT_DEVELOPER_TOOLS);
    console.log(`Extensions installed successfully: ${result.name}`);
  } catch {
    console.error("Failed to install extensions");
  }
}

app.whenReady().then(async () => {
  const iconsRoot = resolveIconsRoot();
  const icnsPath = ensureIconPath(iconsRoot, "merlet.icns");
  const icoPath = ensureIconPath(iconsRoot, "merlet.ico");
  const pngPath = ensureIconPath(iconsRoot, "merlet.png");

  console.log("Resolved icon paths", { iconsRoot, icnsPath, icoPath, pngPath });

  if (process.platform === "darwin") {
    if (icnsPath) {
      const icnsImage = nativeImage.createFromPath(icnsPath);
      if (!icnsImage.isEmpty()) {
        browserWindowIcon = icnsImage;
        dockIcon = icnsImage;
      }
    }

    if (!browserWindowIcon && pngPath) {
      const pngImage = nativeImage.createFromPath(pngPath);
      if (!pngImage.isEmpty()) {
        browserWindowIcon = pngImage;
        dockIcon = pngImage;
      }
    }
  } else if (process.platform === "win32") {
    browserWindowIcon = icoPath ?? pngPath;
  } else {
    browserWindowIcon = pngPath ?? icoPath;
  }

  if (!browserWindowIcon) {
    console.warn(
      "Merlet icon assets not found; default Electron icon will be used.",
    );
  }

  try {
    await mainStudentDB.init();
    await curriculumDB.init();
    console.log("Databases initialized successfully");

    // Run migrations
    await runMigrations();
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
  if (process.platform === "darwin" && app.dock && dockIcon) {
    app.dock.setIcon(dockIcon);
  }
  createWindow();
  installExtensions();
});

//osX only
app.on("window-all-closed", () => {
  // Clean up database connections
  try {
    mainStudentDB.close();
  } catch {
    console.log("Database cleanup completed");
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("before-quit", () => {
  // Clean up database connections before quitting
  try {
    mainStudentDB.close();
  } catch {
    console.log("Database cleanup on quit completed");
  }
});
//osX only ends
