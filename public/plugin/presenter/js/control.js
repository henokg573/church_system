// Operator control panel logic
const socket = io();
const connStatus = document.getElementById("conn_status");
const liveBadge = document.getElementById("live_badge");
const operatorStatus = document.getElementById("operator_status");
const slideFrame = document.getElementById("slide_frame");
const activeName = document.getElementById("active_name");
const pageLabel = document.getElementById("page_label");
const notesView = document.getElementById("notes_view");
const clockEl = document.getElementById("clock");
const fileList = document.getElementById("file_list");
const fileInput = document.getElementById("file_input");
const btnUpload = document.getElementById("btn_upload");
const chatBox = document.getElementById("chat_box");
const chatInput = document.getElementById("chat_input");
const btnChatSend = document.getElementById("btn_chat_send");
const gotoInput = document.getElementById("goto_input");

const MY_NAME = "operator";
let state = null;

socket.on("connect", () => {
  connStatus.className = "badge bg-success";
  connStatus.textContent = "online";
  socket.emit("presenter_operator", MY_NAME);
});
socket.on("disconnect", () => { connStatus.className = "badge bg-danger"; connStatus.textContent = "offline"; });

socket.on("presenter_state", s => { state = s; render(); });
socket.on("presenter_note", notes => { notesView.textContent = notes || "—"; });
socket.on("presenter_chat", msg => addChat(msg));

function render() {
  if (!state) return;
  const active = state.active;
  if (active) {
    // Preview uses the PDF.js viewer, which flips pages instantly from its cache.
    const wanted = `/plugin/presenter/viewer.html?url=${encodeURIComponent(active.url)}&follow=0&page=${active.currentPage || 1}`;
    if (slideFrame.dataset.doc !== active.url) {
      slideFrame.dataset.doc = active.url;
      slideFrame.src = wanted;
    } else {
      try { slideFrame.contentWindow.postMessage({ type: "presenter_page", page: active.currentPage || 1 }, "*"); } catch (e) {}
    }
    activeName.textContent = active.name || "presentation";
    pageLabel.textContent = `page ${active.currentPage || 1} of ${active.totalPages || "?"}`;
    gotoInput.max = active.totalPages || 1;
  } else {
    slideFrame.src = "about:blank";
    activeName.textContent = "Nothing loaded";
    pageLabel.textContent = "";
  }
  liveBadge.classList.toggle("hidden", !state.isLive);
  notesView.textContent = state.notes || "—";
  operatorStatus.textContent = state.operator ? `signed in: ${state.operator}` : "";
}

document.getElementById("btn_prev").onclick = () => socket.emit("presenter_prev");
document.getElementById("btn_next").onclick = () => socket.emit("presenter_next");
document.getElementById("btn_stop_live").onclick = () => socket.emit("presenter_end");
document.getElementById("btn_goto").onclick = () => {
  const page = Number(gotoInput.value);
  if (Number.isInteger(page) && page > 0) socket.emit("presenter_goto", page);
};

setInterval(() => { clockEl.textContent = new Date().toLocaleTimeString(); }, 1000);

async function refreshFiles() {
  try {
    const res = await fetch("/api/presenter/files");
    const files = await res.json();
    fileList.innerHTML = "";
    files.forEach(file => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      li.innerHTML = `<span>${file.name} <span class="text-muted">(${file.kind.toUpperCase()})</span></span>`;
      const btn = document.createElement("button");
      btn.className = "btn btn-sm btn-outline-primary";
      btn.innerHTML = '<i class="bi bi-play"></i>';
      btn.title = "Load for preacher";
      btn.onclick = () => openFile(file);
      li.append(btn);
      fileList.append(li);
    });
  } catch (err) {
    console.error("file list failed", err);
  }
}

async function openFile(file) {
  const pagesRes = await fetch(`/api/presenter/files/${encodeURIComponent(file.id)}/pages`);
  const { pages } = await pagesRes.json();
  socket.emit("presenter_update", { active: { ...file, totalPages: pages, currentPage: 1 } });
}

btnUpload.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const form = new FormData();
  form.append("presentation", file);
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/presenter/upload");
  xhr.onload = () => {
    if (xhr.status === 201) {
      const uploaded = JSON.parse(xhr.responseText);
      if (uploaded.converted === false) {
        alert("PowerPoint conversion failed on the server. Please upload a PDF export instead.");
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
  xhr.send(form);
});

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
  socket.emit("presenter_chat", { from: MY_NAME, text });
  chatInput.value = "";
});
chatInput.addEventListener("keydown", e => { if (e.key === "Enter") btnChatSend.click(); });

document.addEventListener("keydown", e => {
  if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
  if (e.key === "ArrowRight" || e.key === "PageDown") socket.emit("presenter_next");
  if (e.key === "ArrowLeft" || e.key === "PageUp") socket.emit("presenter_prev");
});

refreshFiles();
