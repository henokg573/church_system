// declare const

const obs_port = document.getElementById("obs_port");
const obs_paddword = document.getElementById("obs_paddword");
const obs_ip = document.getElementById("obs_ip");
const btn_connect = document.getElementById("btn_connect");
const controller_status = document.getElementById("controller_status");

let is_connected = false;

function showStatus(message = "", isError = false) {
  controller_status.textContent = message;
  controller_status.hidden = !message;
  controller_status.classList.toggle("error", isError);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`The server returned an invalid response (${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(result.message || `Request failed (${response.status}).`);
  }
  return result;
}

async function updateConnectionUI() {
  btn_connect.textContent = is_connected ? "Disconnect" : "Connect";
  obs_ip.style.display = is_connected ? "none" : "flex";
  obs_port.style.display = is_connected ? "none" : "flex";
  obs_paddword.style.display = is_connected ? "none" : "flex";

  if (is_connected) {
    const data = await fetchJson("/api/obs-get-prv-pgm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    updateSceneClasses(data.sceneInfo);
  }
}

async function initializeController() {
  try {
    const data = await fetchJson("/api/obs-status");
    is_connected = Boolean(data.isConnected);
    await updateConnectionUI();
  } catch (error) {
    showStatus(`Could not check OBS connection: ${error.message}`, true);
  }
}

initializeController();
function updateSceneClasses(sceneInfo) {
  if (!sceneInfo) {
    return;
  }

  document.querySelectorAll("[class*='_prv'], [class*='_pgm']").forEach((camera) => {
    camera.classList.remove("prv", "pgm");
  });

  const sceneToCameraClass = (sceneName, mode) => {
    const match = /^CAM\s+(\d+)$/i.exec(sceneName || "");
    return match ? `.cam_${match[1]}_${mode}` : null;
  };

  const previewCamera = sceneToCameraClass(sceneInfo.previewScene, "prv");
  const programCamera = sceneToCameraClass(sceneInfo.programScene, "pgm");

  if (previewCamera) {
    document.querySelector(previewCamera)?.classList.add("prv");
  }

  if (programCamera) {
    document.querySelector(programCamera)?.classList.add("pgm");
  }
  if(sceneInfo.programScene=="Intro"){
    document.querySelector(".btn_intro")?.classList.add("pgm");
  } else{
    document.querySelector(".btn_intro")?.classList.remove("pgm");
  }

  if(sceneInfo.previewScene=="Intro"){
    document.querySelector(".btn_intro_prv")?.classList.add("prv");
  } else{
    document.querySelector(".btn_intro_prv")?.classList.remove("prv");
  }

}

btn_connect.addEventListener("click", async () => {
  if (btn_connect.disabled) return;
  btn_connect.classList.add("disabled");
  try {
    btn_connect.disabled = true;
    if (is_connected) {
      await fetchJson("/api/obs-disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      is_connected = false;
      showStatus("Disconnected from OBS.");
    } else {
      const ip = obs_ip.value.trim();
      const port = obs_port.value.trim();
      const password = obs_paddword.value;
      if (!ip || !port) {
        throw new Error("OBS IP address and port are required.");
      }

      await fetchJson("/api/obs-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip, port, password })
      });
      is_connected = true;
      showStatus("Connected to OBS.");
    }
    await updateConnectionUI();
  } catch (error) {
    showStatus(error.message || "OBS connection request failed.", true);
  } finally {
    btn_connect.classList.remove("disabled");
    btn_connect.disabled = false;
  }
});

async function obs_command(command) {
  if (!is_connected) {
    console.error("Not connected to OBS. Please connect first.");
    return;
  }

  try {
    console.log("Sending OBS command:", command);
    const result = await fetchJson("/api/obs-command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command })
    });
    updateSceneClasses(result.sceneInfo);
    showStatus(result.message || "OBS command sent.");
  } catch (error) {
    showStatus(error.message || "OBS command request failed.", true);
  }
};

// socket.io connection
const socket = io();

function remote_command(command) {
  //console.log("remote_command", command);
  socket.emit("remote_command", command);
}



// get receive_command from server
socket.on("receive_command", (command) => {
  //console.log("receive_command", command);
  get_command(command.cmd);

});

// btn_style from server
function get_command(command) {
  console.log("get_command", command);
  switch (command) {
    case "name_plate_out":
      document.querySelector(".btn_01").classList.remove("grx");
      break;
    case "name_plate_in":
      document.querySelector(".btn_01").classList.add("grx");
      break;
    case "bible_verse_in":
      document.querySelector(".btn_02").classList.add("grx");
      break;
    case "bible_verse_out":
      document.querySelector(".btn_02").classList.remove("grx");
      break;
      case "bible_verse_mini_in":
      document.querySelector(".btn_03").classList.add("grx");
      break;
    case "bible_verse_mini_out":
      document.querySelector(".btn_03").classList.remove("grx");
      break;
    case "lyric_mini_in":
      document.querySelector(".btn_04").classList.add("grx");
      break;
    case "lyric_mini_out":
      document.querySelector(".btn_04").classList.remove("grx");
      break;
      case "caption_in":
      document.querySelector(".btn_05").classList.add("grx");
      break;
    case "caption_out":
      document.querySelector(".btn_05").classList.remove("grx");
      break;
    }


}