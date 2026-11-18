let socket= io();
socket.on("receiveData", (data) => {
    set_data_render(data);
});

const song_present=document.getElementById("song_present");
const bible_present=document.getElementById("bible_present");

function set_data_render(data){
    if(data.config=='bible_data'){
        if(data.button_status==0){
            bible_present.style.display='none';
        }
        else{
            bible_present.style.display='flex';
        }
    }
    if(data?.type=='song_lyric'){
        //console.log(data.isvisible);
        if(data.isvisible){
            song_present.style.display='flex';
        }
        else{
            song_present.style.display='none';
        }
    } else if (data?.type === 'lyrics') {
        song_present.style.display = data.data?.isVisible ? 'flex' : 'none';
    }

}
// set clock text
const clock_text=document.getElementById("clock_text");
function updateClock() {
    const now = new Date();
    // make 12 hour format
    const hours12 = now.getHours() % 12 || 12;
    const hrs = String(hours12).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    clock_text.textContent = `${hrs}:${minutes}`;
}
setInterval(updateClock, 1000);
updateClock();