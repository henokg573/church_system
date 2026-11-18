let files = [];
let fileNames = [];
let fileNamesJson = {};

function file_reload() {
    fetch("/api/wallpapers")
        .then(response => response.json())
        .then(data => {
            files = data;
            // Clear arrays/objects before refilling
            fileNames = [];
            fileNamesJson = {};
            
            for (let i = 0; i < files.length; i++) {
                fileNames.push(files[i]);
                fileNamesJson[files[i]] = files[i];
            }
            // IMPORTANT: Call setWallpaper() HERE, inside .then(), 
            // after the data has arrived from the server.
            setWallpaper(); 
        })
        .catch(error => console.error("Error fetching wallpapers:", error));
}

function getVideoCover(url, seekTo = 4.0) {
    return new Promise((resolve, reject) => {
        const videoPlayer = document.createElement('video');
        videoPlayer.setAttribute('src', url);
        videoPlayer.preload = 'metadata';
        videoPlayer.muted = true;
        
        videoPlayer.addEventListener('error', () => {
            reject("error when loading video");
        });
        
        videoPlayer.addEventListener('loadedmetadata', () => {
            if (videoPlayer.duration < seekTo) {
                videoPlayer.currentTime = videoPlayer.duration / 2;
            } else {
                videoPlayer.currentTime = seekTo;
            }
        });
        
        videoPlayer.addEventListener('seeked', () => {
            const canvas = document.createElement('canvas');
            canvas.width = videoPlayer.videoWidth;
            canvas.height = videoPlayer.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg'));
        });
    });
}

// set wallpaper to div
function setWallpaper() {
    let html = "";
    // Iterate using the array length, not the object (which has no length property)
    for (let i = 0; i < fileNames.length; i++) {
        const fileExt = fileNames[i].split('.').pop().toLowerCase();
        const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(fileExt);

        if (isVideo) {
            html += `<div class="file_item" id="file_item_${i}" style="background-size: cover; background-color: #000;" onclick="setMediaUrl(${i})"><div class="file_name"> media ${i+1}</div><div class="media_item video_item"></div></div>`;
            getVideoCover('/plugin/wallpaper/data/' + fileNames[i]).then(cover => {
                const el = document.getElementById(`file_item_${i}`);
                if (el) {
                    el.style.backgroundImage = `url(${cover})`;
                }
            }).catch(console.error);
        } else {
            html += `<div class="file_item" id="file_item_${i}" style="background-image: url('/plugin/wallpaper/data/${fileNames[i]}');background-size: cover;" onclick="setMediaUrl(${i})"><div class="file_name"> media ${i+1}</div><div class="media_item image_item"></div></div>`;
        }
    }
    // Update the HTML element
    const container = document.getElementById("file_container");
    if (container) {
        container.innerHTML = html;
    }
}
let selected_media_index = 0;
let play_pause_state = false;
let selected_media_filename = "";
const fileItems = document.getElementsByClassName("file_item");
const filename=document.getElementsByClassName("file_name");
function setMediaUrl(index) {
    selected_media_index = index;
    // change selected file_item border color to red
    
    for (let i = 0; i < fileItems.length; i++) {
        if (i === index) {
            fileItems[i].style.borderColor = "green";
            filename[i].style.backgroundColor = "green";
            console.log("Selected media:", index);
        } else {
            fileItems[i].style.borderColor = "#ccc";
            filename[i].style.backgroundColor = "#00000088";
        }
    }
    //console.log("Selected media:", fileNames[index]);
    selected_media_filename = fileNames[index];
}


file_reload();

const add_btn = document.getElementById("add_btn");
const fileInput = document.getElementById("file_input");

if (add_btn && fileInput) {
    console.log('clicked both')
    add_btn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) {
            console.warn('No file selected for wallpaper upload.');
            return;
        }

        const formData = new FormData();
        formData.append("wallpaper", file);

        fetch("/api/upload_wallpaper", {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log("Upload successful:", data);
            file_reload(); // Reload wallpapers after successful upload
        })
        .catch(error => console.error("Error uploading wallpaper:", error));
    });

} else {
    // Elements not present on this page — don't attach handlers to avoid runtime errors
    // Helpful for pages that include this script but not the wallpaper UI
    // console.debug statements kept out of hot paths, but verbose message helps during development
    if (!add_btn) console.debug('Wallpaper: add button (#add_wallpaper) not found.');
    if (!fileInput) console.debug('Wallpaper: file input (#wallpaper_input) not found.');
}

const socket = io();
// button event 
const play_btn = document.getElementById("play_pause_btn");

// set event listener to play_btn
play_btn.addEventListener("click", () => {
    if (play_pause_state) {
        play_pause_state = false;
        play_btn.innerHTML = "Play";
        filename[selected_media_index].style.backgroundColor = "green";
        fileItems[selected_media_index].style.borderColor = "green";
        //console.log("Selected media:", selected_media_index);
    } else {
        play_pause_state = true;
        play_btn.innerHTML = "Pause";
        filename[selected_media_index].style.backgroundColor = "red";
        fileItems[selected_media_index].style.borderColor = "red";
    }
    if(selected_media_filename != ""){
        //let data={};
        socket.emit("sendData",{config:'media_player',file_name:selected_media_filename,play_pause_state:play_pause_state});
    }
});


//data
