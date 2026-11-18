const current_clock = document.getElementById('current_clock');

function updateCurrentClock() {
    // get 12 hours format date
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    // check if the time is AM or PM
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) {
        hours = 12;
    }
    // add 0 to the beginning if the number is less than 10
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;
    const timeString = `${hours}:${minutes}:${seconds}`;
    current_clock.textContent = timeString;
}

updateCurrentClock();
setInterval(updateCurrentClock, 1000);

// Scale the program iframe (intrinsic 1920x1080) to fit parent while preserving aspect ratio & centering
function scaleProgramIframe() {
    const iframe = document.getElementById('program_frame');
    if (!iframe || !iframe.parentElement) return;
    const container = iframe.parentElement;
    const styles = window.getComputedStyle(container);
    const paddingX = parseFloat(styles.paddingLeft || 0) + parseFloat(styles.paddingRight || 0);
    const paddingY = parseFloat(styles.paddingTop || 0) + parseFloat(styles.paddingBottom || 0);
    const pw = container.clientWidth - paddingX;
    const ph = container.clientHeight - paddingY;
    if (pw <= 0 || ph <= 0) return;
    const intrinsicW = 1920;
    const intrinsicH = 1080;
    const scale = Math.min(pw / intrinsicW, ph / intrinsicH);
    iframe.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

window.addEventListener('resize', scaleProgramIframe);
window.addEventListener('load', scaleProgramIframe);
document.addEventListener('DOMContentLoaded', scaleProgramIframe);

const programFrame = document.getElementById('program_frame');
if (programFrame) {
    programFrame.addEventListener('load', scaleProgramIframe);
    if (window.ResizeObserver && programFrame.parentElement) {
        new ResizeObserver(() => scaleProgramIframe()).observe(programFrame.parentElement);
    }
}

// send socket data to server
const socket = io();

const name_text=document.getElementById("name_text");
const title_text=document.getElementById("title_text");
const play_btn_1=document.getElementById("play_btn_1");
let name_status=0;

function sendCommand(command) {
    socket.emit("command", command);
}

function setToggleButtonState(button, isActive) {
    if (!button) return;
    button.innerHTML = isActive
        ? "<i class='bi bi-pause-circle-fill'></i>"
        : "<i class='bi bi-play-circle-fill'></i>";
}

socket.on("receive_command", (data) => {
    const activeStates = {
        name_plate_in: ["name", true],
        name_plate_out: ["name", false],
        bible_verse_in: ["bible", true],
        bible_verse_out: ["bible", false],
        bible_verse_mini_in: ["bibleMini", true],
        bible_verse_mini_out: ["bibleMini", false],
        lyric_mini_in: ["lyrics", true],
        lyric_mini_out: ["lyrics", false],
        caption_in: ["caption", true],
        caption_out: ["caption", false],
        live_sign_in: ["liveSign", true],
        live_sign_out: ["liveSign", false]
    };
    const state = activeStates[data?.cmd];
    if (!state) return;

    const [control, isActive] = state;
    if (control === "name") {
        name_status = Number(isActive);
        setToggleButtonState(play_btn_1, isActive);
    } else if (control === "bible") {
        b_status = Number(isActive);
        setToggleButtonState(bible_verse_btn, isActive);
    } else if (control === "bibleMini") {
        b_status_1 = Number(isActive);
        setToggleButtonState(bible_verse_mini_btn, isActive);
    } else if (control === "lyrics") {
        lyric_status = Number(isActive);
        setToggleButtonState(lyric_mini_btn, isActive);
    } else if (control === "caption") {
        caption_status = Number(isActive);
        setToggleButtonState(caption_btn, isActive);
    } else if (control === "liveSign") {
        live_sign_status = Number(isActive);
        setToggleButtonState(live_sign_btn, isActive);
    }
});

play_btn_1.addEventListener("click",()=>{
    if(name_status==0)
    {
        sendCommand({cmd:"name_plate_in",name:name_text.value,title:title_text.value,name_status:1});
        name_status=1;
        play_btn_1.innerHTML="<i class='bi bi-pause-circle-fill'></i>";
    }
    else{
        sendCommand({cmd:"name_plate_out",name:name_text.value,title:title_text.value,name_status:0});
        name_status=0;
        play_btn_1.innerHTML="<i class='bi bi-play-circle-fill'></i>";
    }
    
})

const bible_verse_btn=document.getElementById("play_btn_2");
let b_status=0;
bible_verse_btn.addEventListener('click',()=>{
    if(b_status==0){
        sendCommand({cmd:"bible_verse_in"});
        bible_verse_btn.innerHTML="<i class='bi bi-pause-circle-fill'></i>";
        b_status=1;
    }
    else
    {
        sendCommand({cmd:"bible_verse_out"});
        bible_verse_btn.innerHTML="<i class='bi bi-play-circle-fill'></i>";
        b_status=0;
    }
});

const bible_verse_mini_btn=document.getElementById("play_btn_3");
let b_status_1=0;
bible_verse_mini_btn.addEventListener('click',()=>{
    if(b_status_1==0){
        sendCommand({cmd:"bible_verse_mini_in"});
        bible_verse_mini_btn.innerHTML="<i class='bi bi-pause-circle-fill'></i>";
        b_status_1=1;
    }
    else
    {
        sendCommand({cmd:"bible_verse_mini_out"});
        bible_verse_mini_btn.innerHTML="<i class='bi bi-play-circle-fill'></i>";
        b_status_1=0;
    }
});

const lyric_mini_btn=document.getElementById("play_btn_4");
let lyric_status=0;
let lyric_num=0;
let lyric_group_count=0;
let lyric_groups=[];
if(lyric_mini_btn){
    lyric_mini_btn.addEventListener('click',()=>{
        if(lyric_status==0){
            sendCommand({cmd:"lyric_mini_in"});
            lyric_mini_btn.innerHTML="<i class='bi bi-pause-circle-fill'></i>";
            lyric_status=1;
        }
        else
        {
            sendCommand({cmd:"lyric_mini_out"});
            lyric_mini_btn.innerHTML="<i class='bi bi-play-circle-fill'></i>";
            lyric_status=0;
        }
    });
}
socket.on("receiveData", (data) => {
    if(data?.type !== "lyrics" || !data.data) return;
    const lines = String(data.data.pageText || '').split(/\r?\n/).filter(line => line.trim());
    lyric_groups = [];
    for(let i=0; i<lines.length; i+=2) lyric_groups.push(lines.slice(i, i+2));
    lyric_group_count = lyric_groups.length;
    lyric_num = 0;
});
socket.on("receive_command", (data) => {
    if(data?.cmd !== "song_lyric_tv" || !Array.isArray(data.lyric)) return;
    const selectedGroup = lyric_groups.findIndex(group =>
        group.length === data.lyric.length && group.every((line, index) => line === data.lyric[index])
    );
    if(selectedGroup !== -1) lyric_num = selectedGroup;
});
function lyric_prev()
{
    if(lyric_num>0)
    {
        lyric_num--;
        sendCommand({cmd:"lyric_mini_prev",lyric_num:lyric_num});
    }
}
function lyric_next()
{
    if(lyric_num<lyric_group_count-1)
    {
        lyric_num++;
        sendCommand({cmd:"lyric_mini_next",lyric_num:lyric_num});
    }
}

const transition_btn=document.getElementById("play_btn_5");

transition_btn.addEventListener('click',()=>{
    // send transition text from select box to server
    const transition_select=document.getElementById("transition_select").value;
    // get selected transition text
    if(transition_select=="")
    {
        alert("Please select a transition");
        return;
    }
    
    sendCommand({cmd:"transition_in",transition:transition_select});
});

const caption_btn=document.getElementById("play_btn_7");
let caption_status=0;
if(caption_btn){
    caption_btn.addEventListener('click',()=>{
        if(caption_status==0){
            sendCommand({cmd:"caption_in"});
            caption_btn.innerHTML="<i class='bi bi-pause-circle-fill'></i>";
            caption_status=1;
        }
        else
        {
            sendCommand({cmd:"caption_out"});
            caption_btn.innerHTML="<i class='bi bi-play-circle-fill'></i>";
            caption_status=0;
        }
    });
}

// receive text from server and display in transition text box
socket.on("receive_command", (data) => {
    if(data.cmd=="name_plate_text"){
        name_text.value=data.name;
        title_text.value=data.title;
    }
});

// Tab switching logic
const tabItems = document.querySelectorAll('.property_tab_title_item');
const propertyFrames = document.querySelectorAll('.property_frame');

tabItems.forEach((tab, index) => {
    tab.addEventListener('click', () => {
        tabItems.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        propertyFrames.forEach(f => f.classList.remove('active'));
        if(propertyFrames[index]) {
            propertyFrames[index].classList.add('active');
        }
    });
});

// select ci item by id and change background color
function select_ci(id, e){
    // Ignore clicks on interactive child elements
    const evt = e || window.event;
    const tag = evt.target.tagName.toLowerCase();
    if(['input','button','label','select','textarea','i'].includes(tag) || evt.target.closest('.play_btn') || evt.target.closest('.import_btn')){
        return;
    }
    console.log("select_ci",id);

    // Switch to corresponding tab
    let tabIndex = 0;
    if(id==1){ // Name Plate
        tabIndex = 0;
    }
    else if(id==4){ // Live Lyrics
        tabIndex = 1;
    }
    else if(id==5){ // Transition
        tabIndex = 2;
    }
    // Add other mappings if needed
    
    if(tabItems[tabIndex]) {
        tabItems[tabIndex].click();
    }
        
        const ci_item=document.getElementById("ci_"+id);
        const ci_items=document.getElementsByClassName("ci_item");
        for(let i=0;i<ci_items.length;i++){
            ci_items[i].style.backgroundColor="";
            ci_items[i].style.color="";
        }
        ci_item.style.backgroundColor="#333";
        ci_item.style.color="white";
    }

// receive command from transition_text
let transition_text=[];
let transition_index=0;
socket.on("receive_command", (data) => {
    transition_text=[];
    transition_index=0;
    if(data.cmd=="transition_text" && Array.isArray(data.sequence)){
        data.sequence.forEach(element => {
            if(element && element.name){
                transition_text.push(element.name);
            }
        });
        //console.log("transition_text",transition_text,"transition_index",data.index);
        transition_index=data.index;
        set_transition_text_ui();
    }
});

function set_transition_text_ui(){
    //clear transition list
    const transition_select=document.getElementById("transition_select");
    transition_select.innerHTML="";
    transition_text.forEach(element => {
        const option=document.createElement("option");
        option.value=element;
        option.text=element;
        transition_select.appendChild(option);
    });
    transition_select.value=transition_text[transition_index];
    
    
}
let now_text_status=0;
const now_next_play_btn=document.getElementById("play_btn_6");
now_next_play_btn.addEventListener('click',()=>{
    // send now and next text from select box to server
    const transition_select=document.getElementById("transition_select");
    const selected_index=transition_select.selectedIndex;
    const selected_option=transition_select.options[selected_index];
    if(!selected_option || !selected_option.value.trim()){
        alert("Please import or load a transition sequence first");
        return;
    }
    transition_index=selected_index;
    const now_text=selected_option.value.trim();
    const valid_options=Array.from(transition_select.options).filter((option) => option.value.trim());
    const selected_position=valid_options.indexOf(selected_option);
    const next_option=valid_options[(selected_position+1)%valid_options.length];
    const next_index=Array.from(transition_select.options).indexOf(next_option);
    const next_text=next_option.value.trim();
    now_text_status=1;
    sendCommand({cmd:"now_next_text",now_text:now_text,next_text:next_text,index:selected_index,next_index:next_index,now_text_status:now_text_status});
});
 

// live sign

const live_sign_btn=document.getElementById("play_btn_8");
let live_sign_status=0;
live_sign_btn.addEventListener('click',()=>{
    if(live_sign_status==0){
        sendCommand({cmd:"live_sign_in"});
        live_sign_btn.innerHTML="<i class='bi bi-pause-circle-fill'></i>";
        live_sign_status=1;
    }
    else
    {
        sendCommand({cmd:"live_sign_out"});
        live_sign_btn.innerHTML="<i class='bi bi-play-circle-fill'></i>";
        live_sign_status=0;
    }
});

// import caption file

const import_btn_7=document.getElementById("import_btn_7");
import_btn_7.addEventListener('click',()=>{
    const caption_file=document.getElementById("caption_file");
    caption_file.click();
});

function load_caption(files){
    if(files.length==0){
        return;
    }
    const file=files[0];
    const reader=new FileReader();
    reader.onload=function(e){
        let num=0;
        const data=e.target.result;
        const workbook=XLSX.read(data,{type:'array'});
        const sheet_name=workbook.SheetNames[0];
        const sheet=workbook.Sheets[sheet_name];
        const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:""});
        let caption_sequence=[];
        rows.forEach(row=>{
            if(num==0){
                num++;
                return;
            }
            caption_sequence.push({name:String(row[0]).trim(),id:String(row[1]).trim()});
        });
        const captionLabel = document.getElementById("caption_lable").value.trim();
        sendCommand({cmd:"caption_sequence",sequence:caption_sequence,label:captionLabel});
    };
    reader.readAsArrayBuffer(file);
}


// side_bar_adver event
const side_bar_btn=document.getElementById("play_btn_9");
side_bar_btn.onclick=function(){
    sendCommand({cmd:"advert_image_in"});
}

// get receive_remote_command from server
socket.on("receive_remote_command", (data) => {
    //console.log("receive_remote_command",data);
    switch(data){
        case "nameplate":
            play_btn_1.click();
            break;
            case "BIB":
                bible_verse_btn.click();
                break;
            case "BIB_M":
                bible_verse_mini_btn.click();
                break;
            case "Lyrics":
                lyric_mini_btn.click();
                break;
            case "Caption":
                caption_btn.click();
                break;
            case "SideB":
                side_bar_btn.click();
                break;
            case "Transition":
                transition_btn.click();
                break;
    
}
});