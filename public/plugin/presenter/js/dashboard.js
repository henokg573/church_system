// Preacher dashboard logic
const ACCESS_CODE_KEY = "presenter_access_code";
const CORRECT_CODE = "ksdac";

const loginView = document.getElementById("login_view");
const dashboardView = document.getElementById("dashboard_view");
const loginCode = document.getElementById("login_code");
const loginError = document.getElementById("login_error");
const btnLogin = document.getElementById("btn_login");
const btnLogout = document.getElementById("btn_logout");
const connStatus = document.getElementById("conn_status");

const slideFrame = document.getElementById("slide_frame");
const activeName = document.getElementById("active_name");
const pageLabel = document.getElementById("page_label");
const liveBadge = document.getElementById("live_badge");
const btnGoLive = document.getElementById("btn_go_live");
const btnStopLive = document.getElementById("btn_stop_live");
const btnPrev = document.getElementById("btn_prev");
const btnNext = document.getElementById("btn_next");
const btnExpand = document.getElementById("btn_expand");
const fileList = document.getElementById("file_list");
const fileInput = document.getElementById("file_input");
const btnUpload = document.getElementById("btn_upload");
const uploadProgress = document.getElementById("upload_progress");
const uploadBar = document.getElementById("upload_bar");
const notesArea = document.getElementById("notes_area");
const toggleNotes = document.getElementById("toggle_notes");
const toggleClock = document.getElementById("toggle_clock");
const clockEl = document.getElementById("clock");
const chatBox = document.getElementById("chat_box");
const chatInput = document.getElementById("chat_input");
const btnChatSend = document.getElementById("btn_chat_send");

const socket = io();
let state = null;
let myName = "preacher";

function show(el, yes) { el.classList.toggle("hidden", !yes); }

// ---------- login ----------
const savedCode = sessionStorage.getItem(ACCESS_CODE_KEY);
if (savedCode === CORRECT_CODE) enterDashboard();

btnLogin.addEventListener("click", () => {
  if (loginCode.value.trim() === CORRECT_CODE) {
    sessionStorage.setItem(ACCESS_CODE_KEY, CORRECT_CODE);
    enterDashboard();
  } else {
    show(loginError, true);
    loginError.textContent = "Wrong access code.";
  }
});
loginCode.addEventListener("keydown", e => { if (e.key === "Enter") btnLogin.click(); });
btnLogout.addEventListener("click", () => {
  sessionStorage.removeItem(ACCESS_CODE_KEY);
  location.reload();
});

function enterDashboard() {
  show(loginView, false);
  show(dashboardView, true);
  socket.emit("presenter_operator", myName);
  refreshFiles();
}

// ---------- socket sync ----------
socket.on("connect", () => { connStatus.className = "badge bg-success"; connStatus.textContent = "online"; });
socket.on("disconnect", () => { connStatus.className = "badge bg-danger"; connStatus.textContent = "offline"; });

socket.on("presenter_state", s => {
  state = s;
  render();
});
socket.on("presenter_note", notes => {
  if (document.activeElement !== notesArea) notesArea.value = notes || "";
});
socket.on("presenter_chat", msg => addChat(msg));

// ---------- rendering ----------
function render() {
  if (!state) return;
  const active = state.active;
  // Preview uses the PDF.js viewer, which flips pages instantly from its cache.
  if (active) {
    const wanted = `/plugin/presenter/viewer.html?url=${encodeURIComponent(active.url)}&follow=0&page=${active.currentPage || 1}`;
    if (slideFrame.dataset.doc !== active.url) {
      slideFrame.dataset.doc = active.url;
      slideFrame.src = wanted;
    } else {
      slideFrame.contentWindow.postMessage({ type: "presenter_page", page: active.currentPage || 1 }, "*");
    }
    activeName.textContent = active.name || "presentation";
    pageLabel.textContent = `page ${active.currentPage || 1} of ${active.totalPages || "?"}`;
  } else {
    slideFrame.src = "about:blank";
    activeName.textContent = "No presentation loaded";
    pageLabel.textContent = "";
  }
  show(liveBadge, !!state.isLive);
  show(btnGoLive, !state.isLive && !!state.active);
  show(btnStopLive, !!state.isLive);
  if (document.activeElement !== notesArea) notesArea.value = state.notes || "";
  toggleNotes.checked = !!state.showNotes;
  toggleClock.checked = !!state.showClock;
}

btnPrev.addEventListener("click", () => socket.emit("presenter_prev"));
btnNext.addEventListener("click", () => socket.emit("presenter_next"));
btnExpand.addEventListener("click", () => {
  window.open("/screen/01/", "presenter_display", "width=1280,height=720");
});
document.addEventListener("keydown", e => {
  if (!dashboardView || dashboardView.classList.contains("hidden")) return;
  if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
  if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); socket.emit("presenter_next"); }
  if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); socket.emit("presenter_prev"); }
});

btnGoLive.addEventListener("click", () => {
  if (!state || !state.active) return;
  socket.emit("presenter_go_live", { live: true, active: state.active });
});
btnStopLive.addEventListener("click", () => socket.emit("presenter_end"));

toggleNotes.addEventListener("change", () => socket.emit("presenter_update", { showNotes: toggleNotes.checked }));
toggleClock.addEventListener("change", () => socket.emit("presenter_update", { showClock: toggleClock.checked }));

let notesTimer = null;
notesArea.addEventListener("input", () => {
  clearTimeout(notesTimer);
  notesTimer = setTimeout(() => socket.emit("presenter_note", notesArea.value), 300);
});

// clock
setInterval(() => {
  clockEl.textContent = new Date().toLocaleTimeString();
}, 1000);

// ---------- files ----------
async function refreshFiles() {
  try {
    const res = await fetch("/api/presenter/files");
    const files = await res.json();
    fileList.innerHTML = "";
    files.forEach(file => {
      const li = document.createElement("li");
      li.className = "list-group-item file-list-item d-flex justify-content-between align-items-center";
      const label = `${file.name} (${file.kind.toUpperCase()})`;
      li.innerHTML = `<span><i class="bi bi-file-earmark-${file.kind === "pdf" ? "pdf" : "slides"}"></i> ${label}</span>`;
      const group = document.createElement("div");
      const openBtn = document.createElement("button");
      openBtn.className = "btn btn-sm btn-outline-primary me-1";
      openBtn.innerHTML = '<i class="bi bi-play"></i>';
      openBtn.title = "Open in reader";
      openBtn.onclick = () => openFile(file);
      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-sm btn-outline-danger";
      delBtn.innerHTML = '<i class="bi bi-trash"></i>';
      delBtn.onclick = async () => {
        await fetch(`/api/presenter/files/${encodeURIComponent(file.id)}`, { method: "DELETE" });
        refreshFiles();
      };
      group.append(openBtn, delBtn);
      li.append(group);
      fileList.append(li);
    });
  } catch (err) {
    console.error("file list failed", err);
  }
}

async function openFile(file) {
  const pagesRes = await fetch(`/api/presenter/files/${encodeURIComponent(file.id)}/pages`);
  const { pages } = await pagesRes.json();
  const active = { ...file, totalPages: pages, currentPage: 1 };
  socket.emit("presenter_update", { active });
  render();
}

btnUpload.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const form = new FormData();
  form.append("presentation", file);
  show(uploadProgress, true);
  uploadBar.style.width = "0%";
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/presenter/upload");
  xhr.upload.onprogress = e => {
    if (e.lengthComputable) uploadBar.style.width = `${Math.round((e.loaded / e.total) * 100)}%`;
  };
  xhr.onload = () => {
    show(uploadProgress, false);
    if (xhr.status === 201) {
      const uploaded = JSON.parse(xhr.responseText);
      if (uploaded.converted === false) {
        alert("PowerPoint conversion failed on the server. Please upload a PDF export of this file instead.");
      } else {
        openFile(uploaded);
      }
      fileInput.value = "";
      refreshFiles();
    } else {
      let message = "Upload failed.";
      try { message = JSON.parse(xhr.responseText).error || message; } catch { }
      alert(message);
    }
  };
  xhr.onerror = () => { show(uploadProgress, false); alert("Upload failed."); };
  xhr.send(form);
});

// ---------- chat ----------
function addChat(msg) {
  const div = document.createElement("div");
  div.className = "chat-msg";
  div.innerHTML = `<span class="from">${escapeHtml(msg.from)}</span> <span class="text-muted small">${new Date(msg.at).toLocaleTimeString()}</span><br>${escapeHtml(msg.text)}`;
  chatBox.append(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
btnChatSend.addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (!text) return;
  socket.emit("presenter_chat", { from: myName, text });
  chatInput.value = "";
});
chatInput.addEventListener("keydown", e => { if (e.key === "Enter") btnChatSend.click(); });
