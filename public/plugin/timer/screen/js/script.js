const timer_title= document.getElementById('screen_timer_title');
const screen_timer_minutes = document.getElementById('screen_timer_minutes');
const screen_timer_seconds = document.getElementById('screen_timer_seconds');
const screen_warning_text = document.getElementById('screen_warning_text');
const screen_warning_message = document.getElementById('screen_warning_message');
const timer_screen_display=document.getElementById('timer_screen_display');

// initilize socket connection
const socket = io();

// variables
let total_seconds = 10;
let total_minutes = 0;
let is_timer_running = false;
let endMessage = '';
let titleMessage = '';
let warningMessage = '';
let clickType = '';
let timer_interval = null;

function updateTimerDisplay() {
    screen_timer_minutes.textContent = total_minutes.toString().padStart(2, '0');
    screen_timer_seconds.textContent = total_seconds.toString().padStart(2, '0');
}

function stopTimer() {
    if (timer_interval !== null) {
        clearInterval(timer_interval);
        timer_interval = null;
    }

    is_timer_running = false;
}

function startTimer() {
    if (is_timer_running) return;

    is_timer_running = true;
    
    timer_interval = setInterval(() => {
        if (total_seconds === 0 && total_minutes === 0) {
            stopTimer();
            //alert('Timer Ended!');
            screen_warning_text.textContent = endMessage || 'Timer Ended!';
            screen_warning_message.classList.add('end');
            screen_warning_message.classList.remove('warning');
            return;
        }
        if(total_minutes < 5) {
            //console.log('less than 5 minutes');
            screen_warning_text.textContent = warningMessage || 'Timer is about to end!';
            screen_warning_message.classList.add('warning');
            screen_warning_message.classList.add('show');
            screen_warning_message.classList.remove('end');
            screen_warning_message.classList.remove('hide');
            timer_screen_display.style.color="#e74c3c";
        }
        else {
            screen_warning_message.classList.remove('warning');
            screen_warning_message.classList.remove('show');
            screen_warning_message.classList.add('hide');
            timer_screen_display.style.color="#333";
        }
        if (total_seconds === 0) {
            total_minutes--;
            total_seconds = 59;
        } else {
            total_seconds--;
        }

        updateTimerDisplay();
    }, 1000);
}

// receive timer data
socket.on('receive_timer_data', (data) => {
    if(!data)
        return;

    timer_title.textContent = data.title || '';
    screen_warning_text.textContent = data.warning || '';
    clickType = data.click || '';
    endMessage = data.endMessage || '';
    titleMessage = data.title || '';
    warningMessage = data.warning || '';
    total_minutes = parseInt(data.minutes) || 0;
    total_seconds = parseInt(data.seconds) || 0;
    updateTimerDisplay();
    if(clickType === 'start') {
        startTimer();
    } else if(clickType === 'stop') {
        stopTimer();
    } else if(clickType === 'reset') {
        stopTimer();
        screen_warning_text.textContent = '';
        screen_warning_message.classList.remove('warning');
        screen_warning_message.classList.remove('end');
    }    
});



// update timer function
function updateTimer() {

    

}