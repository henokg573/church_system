const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const obs = require('./obs_connect.js');
obs(app);

const lastData = new Map();
const lastConfig = new Map();
const lastCommands = new Map();
let lastTimerData = null;
let lastWallpaper = null;
let lastConfiguration = null;
const wallpaperDataDir = path.join(__dirname, "public/plugin/wallpaper/data");
const wallpaperStatePath = path.join(wallpaperDataDir, "current-wallpaper.json");

fs.mkdirSync(wallpaperDataDir, { recursive: true });
try {
  if (fs.existsSync(wallpaperStatePath)) {
    lastWallpaper = JSON.parse(fs.readFileSync(wallpaperStatePath, "utf8"));
  }
} catch (error) {
  console.error("Failed to load saved wallpaper:", error.message);
}

const wallpaperUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, wallpaperDataDir),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const baseName = path.basename(file.originalname, extension)
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 60) || "wallpaper";
      callback(null, `${Date.now()}-${baseName}${extension}`);
    }
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowed = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov"]);
    callback(allowed.has(extension) ? null : new Error("Upload an image or video (JPG, PNG, WebP, GIF, MP4, WebM, or MOV)."), allowed.has(extension));
  }
});

function normalizeWallpaper(data) {
  if (!data || typeof data !== "object") throw new Error("Wallpaper data is required.");
  if (data.type === "image" || data.type === "video") {
    if (typeof data.url !== "string" || !/^\/plugin\/wallpaper\/data\/[a-zA-Z0-9_.-]+$/.test(data.url)) {
      throw new Error("Select an uploaded image or video.");
    }
    return { type: data.type, url: data.url };
  }
  if (data.type === "text") {
    const text = String(data.text || "").trim();
    if (!text || text.length > 500) throw new Error("Text design must contain 1 to 500 characters.");
    const subtitle = String(data.subtitle || "").trim().slice(0, 200);
    const colorPattern = /^#[\da-f]{6}$/i;
    const background = data.background && typeof data.background === "object"
      ? data.background
      : { type: "gradient", color1: data.backgroundColor, color2: "#071521" };
    let normalizedBackground;
    if (background.type === "gradient") {
      normalizedBackground = {
        type: "gradient",
        color1: colorPattern.test(background.color1) ? background.color1 : "#102a43",
        color2: colorPattern.test(background.color2) ? background.color2 : "#071521"
      };
    } else if (background.type === "image" || background.type === "video") {
      if (typeof background.url !== "string" || !/^\/plugin\/wallpaper\/data\/[a-zA-Z0-9_.-]+$/.test(background.url)) {
        throw new Error(`Choose an uploaded ${background.type} for the text background.`);
      }
      normalizedBackground = { type: background.type, url: background.url };
    } else {
      throw new Error("Choose a gradient, image, or video text background.");
    }
    const fontFamilies = new Set(["Georgia", "Arial", "Verdana", "Trebuchet MS", "Times New Roman", "Segoe UI", "serif", "sans-serif"]);
    const positions = new Set(["center", "top-left", "top-center", "top-right", "center-left", "center-right", "bottom-left", "bottom-center", "bottom-right"]);
    const requestedFontSize = Number(data.fontSize);
    const textColor = colorPattern.test(data.textColor) ? data.textColor : "#ffffff";
    return {
      type: "text",
      text,
      subtitle,
      background: normalizedBackground,
      textColor,
      fontFamily: fontFamilies.has(data.fontFamily) ? data.fontFamily : "Georgia",
      fontSize: Number.isFinite(requestedFontSize) ? Math.min(240, Math.max(16, Math.round(requestedFontSize))) : 72,
      position: positions.has(data.position) ? data.position : "center"
    };
  }
  throw new Error("Choose an image, video, or text wallpaper.");
}

function getRememberedCommandKey(command) {
  const commandKeys = {
    name_plate_in: "name_plate_visibility",
    name_plate_out: "name_plate_visibility",
    name_plate_text: "name_plate_text",
    bible_verse_in: "bible_verse_visibility",
    bible_verse_out: "bible_verse_visibility",
    bible_verse_mini_in: "bible_verse_mini_visibility",
    bible_verse_mini_out: "bible_verse_mini_visibility",
    lyric_mini_in: "lyric_mini_visibility",
    lyric_mini_out: "lyric_mini_visibility",
    lyric_mini_prev: "lyric_mini_page",
    lyric_mini_next: "lyric_mini_page",
    transition_text: "transition_text",
    now_next_text: "now_next_text",
    caption_sequence: "caption_sequence",
    caption_in: "caption_visibility",
    caption_out: "caption_visibility",
    live_sign_in: "live_sign_visibility",
    live_sign_out: "live_sign_visibility",
    song_lyric_tv: "song_lyric",
    advert_image_in: "advert_image"
  };
  return Object.hasOwn(commandKeys, command?.cmd) ? commandKeys[command.cmd] : null;
}

function rememberLatest(map, key, value) {
  map.delete(key);
  map.set(key, value);
}

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/wallpapers", (_req, res) => {
  try {
    const files = fs.readdirSync(wallpaperDataDir, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name !== path.basename(wallpaperStatePath))
      .map(entry => entry.name)
      .sort((a, b) => a.localeCompare(b));
    res.json(files);
  } catch (error) {
    console.error("Failed to list wallpapers:", error.message);
    res.status(500).json({ error: "Could not load wallpaper files." });
  }
});

app.post(["/api/wallpapers/upload", "/api/upload_wallpaper"], (req, res) => {
  wallpaperUpload.single("wallpaper")(req, res, error => {
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Choose an image or video to upload." });
    }
    res.status(201).json({ filename: req.file.filename });
  });
});

// Presenter (preacher) presentation system
const presenterDir = path.join(__dirname, "public/plugin/presenter/data");
fs.mkdirSync(presenterDir, { recursive: true });
const presenterUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, presenterDir),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const baseName = path.basename(file.originalname, extension)
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 60) || "presentation";
      callback(null, `${Date.now()}-${baseName}${extension}`);
    }
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowed = new Set([".ppt", ".pptx", ".pdf"]);
    callback(allowed.has(extension) ? null : new Error("Upload a PowerPoint (.ppt, .pptx) or PDF file."), allowed.has(extension));
  }
});

app.post("/api/presenter/upload", (req, res) => {
  presenterUpload.single("presentation")(req, res, error => {
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Choose a PowerPoint or PDF file to upload." });
    }
    const uploadedPath = req.file.path;
    const extension = path.extname(req.file.filename).toLowerCase();
    if (extension !== ".ppt" && extension !== ".pptx") {
      return res.status(201).json({
        id: req.file.filename,
        name: req.file.originalname,
        url: `/plugin/presenter/data/${req.file.filename}`,
        kind: "pdf",
        size: req.file.size
      });
    }
    // Convert PowerPoint to PDF using installed Microsoft PowerPoint
    const pdfName = req.file.filename.replace(/\.pptx?$/i, ".pdf");
    const pdfPath = path.join(presenterDir, pdfName);
    const scriptPath = path.join(__dirname, "convert_ppt.ps1");
    const { execFile } = require("child_process");
    execFile("powershell.exe", [
      "-NoProfile", "-ExecutionPolicy", "Bypass",
      "-File", scriptPath, uploadedPath, pdfPath
    ], { timeout: 120000 }, (convertError) => {
      if (convertError || !fs.existsSync(pdfPath)) {
        console.error("PPT conversion failed:", convertError?.message || "no output");
        // keep the original file; report it as needing a PDF export
        return res.status(201).json({
          id: req.file.filename,
          name: req.file.originalname,
          url: `/plugin/presenter/data/${req.file.filename}`,
          kind: "ppt",
          converted: false,
          size: req.file.size
        });
      }
      fs.unlink(uploadedPath, () => {});
      res.status(201).json({
        id: pdfName,
        name: req.file.originalname.replace(/\.pptx?$/i, ".pdf"),
        url: `/plugin/presenter/data/${pdfName}`,
        kind: "pdf",
        converted: true,
        size: fs.statSync(pdfPath).size
      });
    });
  });
});

app.get("/api/presenter/files", (_req, res) => {
  try {
    const files = fs.readdirSync(presenterDir, { withFileTypes: true })
      .filter(entry => entry.isFile())
      .filter(entry => !/^~\$|^.*\.tmp$|^mso\d+\./i.test(entry.name))
      .map(entry => {
        const extension = path.extname(entry.name).toLowerCase();
        return {
          id: entry.name,
          name: entry.name.replace(/^\d+-/, ""),
          url: `/plugin/presenter/data/${entry.name}`,
          kind: extension === ".pdf" ? "pdf" : "ppt",
          size: fs.statSync(path.join(presenterDir, entry.name)).size
        };
      })
      .sort((a, b) => b.id.localeCompare(a.id));
    res.json(files);
  } catch (error) {
    console.error("Failed to list presenter files:", error.message);
    res.status(500).json({ error: "Could not load presenter files." });
  }
});

app.get("/api/presenter/files/:id/pages", (req, res) => {
  const fileId = path.basename(req.params.id);
  if (!/^[a-zA-Z0-9_.-]+$/.test(fileId)) return res.status(400).json({ error: "Invalid file id." });
  const filePath = path.join(presenterDir, fileId);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found." });
  try {
    const buffer = fs.readFileSync(filePath);
    const text = buffer.toString("latin1");
    const matches = text.match(/\/Type\s*\/Page[^s]/g);
    let pages = matches ? matches.length : 0;
    const countMatch = text.match(/\/Count\s+(\d+)/g);
    if (countMatch) {
      const maxCount = Math.max(...countMatch.map(m => parseInt(m, 10)));
      if (maxCount > pages) pages = maxCount;
    }
    res.json({ pages: pages || 1 });
  } catch (error) {
    console.error("Page count failed:", error.message);
    res.json({ pages: 1 });
  }
});

app.delete("/api/presenter/files/:id", (req, res) => {
  const fileId = path.basename(req.params.id);
  if (!/^[a-zA-Z0-9_.-]+$/.test(fileId)) return res.status(400).json({ error: "Invalid file id." });
  const filePath = path.join(presenterDir, fileId);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found." });
  try {
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Could not delete file." });
  }
});

let presenterState = {
  active: null,          // { id, name, url, kind, totalPages, currentPage }
  isLive: false,
  notes: "",
  showNotes: true,
  showClock: true,
  message: "",
  operator: null
};

// initialize db

const db_operation = require('./db/db_operation.js');
const presentationStore = db_operation(app);
for (const config of presentationStore.getPresentationProperties()) {
  lastConfig.set(config.type, config);
}


// io connect
io.on("connection", (socket) => {
  console.log("User connected");

  for (const data of lastData.values()) socket.emit("receiveData", data);
  for (const config of lastConfig.values()) socket.emit("receiveConfig", config);
  for (const command of lastCommands.values()) socket.emit("receive_command", command);
  if (lastTimerData) socket.emit("receive_timer_data", lastTimerData);
  if (lastWallpaper) socket.emit("receiveWallpaper", lastWallpaper);
  if (lastConfiguration) socket.emit("receiveConfiguration", lastConfiguration);

  socket.on("sendData", (data) => {
    const key = data?.type === "lyrics" || data?.type === "bible" || data?.type === "song_lyric"
      ? data.type
      : data?.config === "bible_data" || data?.config === "media_player"
        ? data.config
        : null;
    if (key) rememberLatest(lastData, key, data);
    io.emit("receiveData", data);
  });

  socket.on("sendConfig", (data) => {
    if (data?.type === "bible_properties" || data?.type === "lyrics_properties") {
      try {
        presentationStore.savePresentationProperties(data.type, data.properties);
        rememberLatest(lastConfig, data.type, data);
      } catch (error) {
        console.error(`Failed to store ${data.type}:`, error.message);
      }
    } else if (data?.type) {
      rememberLatest(lastConfig, data.type, data);
    }
    io.emit("receiveConfig", data);
  });

  socket.on("sendWallpaper", (data) => {
    try {
      const wallpaper = normalizeWallpaper(data);
      fs.writeFileSync(wallpaperStatePath, JSON.stringify(wallpaper, null, 2));
      lastWallpaper = wallpaper;
      io.emit("receiveWallpaper", lastWallpaper);
    } catch (error) {
      console.error("Failed to set wallpaper:", error.message);
      socket.emit("wallpaper_error", { message: error.message });
    }
  });

  socket.on("sendConfiguration", (data) => {
    lastConfiguration = data;
    io.emit("receiveConfiguration", data);
  });

  socket.on("messageSend", (data) => {
    io.emit("messageReceive", data);
  });

  socket.on("sendTitleAndPreacher", (data) => {
    io.emit("receiveTitleAndPreacher", data);
  });

  socket.on("button_click", (data) => {
    io.emit("button_click", data);
  });

  socket.on("command", (data) => {
    if (!data || typeof data !== "object") return;
    const key = getRememberedCommandKey(data);
    if (key) rememberLatest(lastCommands, key, data);
    io.emit("receive_command", data);
  });

  socket.on("receive_command", (request, acknowledge) => {
    if (request?.cmd !== "caption_sequence" || typeof acknowledge !== "function") return;
    acknowledge(lastCommands.get("caption_sequence") || null);
  });

  socket.on("remote_command", (data) => {
    io.emit("receive_remote_command", data);
  });

  socket.on("timer_data", (data) => {
    if (!data || typeof data !== "object" || typeof data.isShowing !== "boolean") return;
    lastTimerData = data;
    io.emit("receive_timer_data", data);
  });

  // Presenter system sync
  socket.emit("presenter_state", presenterState);

  socket.on("presenter_update", (data) => {
    if (!data || typeof data !== "object") return;
    presenterState = { ...presenterState, ...data };
    if (presenterState.active && !Number.isInteger(presenterState.active.currentPage)) {
      presenterState.active.currentPage = 1;
    }
    io.emit("presenter_state", presenterState);
  });

  socket.on("presenter_note", (data) => {
    if (typeof data !== "string") return;
    presenterState.notes = data.slice(0, 5000);
    socket.broadcast.emit("presenter_note", presenterState.notes);
  });

  socket.on("presenter_chat", (data) => {
    if (!data || typeof data !== "object") return;
    io.emit("presenter_chat", {
      from: String(data.from || "unknown").slice(0, 30),
      text: String(data.text || "").slice(0, 1000),
      at: Date.now()
    });
  });

  socket.on("presenter_go_live", (data) => {
    if (!data || typeof data !== "object") return;
    if (data.live) {
      presenterState.isLive = true;
      presenterState.active = data.active && typeof data.active === "object" ? data.active : presenterState.active;
      if (presenterState.active && !Number.isInteger(presenterState.active.currentPage)) {
        presenterState.active.currentPage = 1;
      }
    } else {
      presenterState.isLive = false;
    }
    io.emit("presenter_state", presenterState);
  });

  socket.on("presenter_next", () => {
    const active = presenterState.active;
    if (!active || !Number.isInteger(active.totalPages) || !Number.isInteger(active.currentPage)) return;
    active.currentPage = Math.min(active.totalPages, active.currentPage + 1);
    io.emit("presenter_state", presenterState);
  });

  socket.on("presenter_prev", () => {
    const active = presenterState.active;
    if (!active || !Number.isInteger(active.currentPage)) return;
    active.currentPage = Math.max(1, active.currentPage - 1);
    io.emit("presenter_state", presenterState);
  });

  socket.on("presenter_goto", (page) => {
    const active = presenterState.active;
    if (!active || !Number.isInteger(active.totalPages)) return;
    const page_number = Number(page);
    if (!Number.isInteger(page_number)) return;
    active.currentPage = Math.min(active.totalPages, Math.max(1, page_number));
    io.emit("presenter_state", presenterState);
  });

  socket.on("presenter_end", () => {
    presenterState.isLive = false;
    io.emit("presenter_state", presenterState);
  });

  socket.on("presenter_operator", (name) => {
    presenterState.operator = String(name || "").slice(0, 40) || null;
    io.emit("presenter_state", presenterState);
  });

  socket.on("presenter_control", (data) => {
    if (!data || typeof data !== "object") return;
    io.emit("presenter_control", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const requestedPort = Number(process.env.PORT || 8000);

function startServer(port) {
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.warn(`Port ${port} is already in use. Retrying on ${nextPort}.`);
      startServer(nextPort);
      return;
    }
    throw err;
  });
}

startServer(requestedPort);