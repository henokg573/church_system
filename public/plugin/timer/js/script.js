const input_minutes = document.getElementById('input_minutes');
const input_seconds = document.getElementById('input_seconds');
const start_timer = document.getElementById('start_timer');
const timer_minutes = document.getElementById('timer_minutes');
const timer_seconds = document.getElementById('timer_seconds');
const reset_timer = document.getElementById('reset_timer');
const stop_timer = document.getElementById('stop_timer');

// initilize socket connection
const socket = io();

// variables
let total_seconds = 0;
let total_minutes = 10;
let is_timer_running = false;
let isshowing = false;
let timer_interval = null;
let currentClickType = '';

function updateTimerDisplay() {
    timer_minutes.textContent = total_minutes.toString().padStart(2, '0');
    timer_seconds.textContent = total_seconds.toString().padStart(2, '0');
}

// update timer display on page load
updateTimerDisplay();

function stopTimer() {
    if (timer_interval !== null) {
        clearInterval(timer_interval);
        timer_interval = null;
    }

    is_timer_running = false;
    start_timer.disabled = false;
    input_minutes.disabled = false;
    input_seconds.disabled = false;
}

// input event listeners
input_minutes.addEventListener('input', () => {
    if (parseInt(input_minutes.value) > 59) {
        input_minutes.value = 59;
    }
    total_minutes = parseInt(input_minutes.value) || 0;
    updateTimerDisplay();
});

input_seconds.addEventListener('input', () => {
    if (parseInt(input_seconds.value) > 59) {
        input_seconds.value = 59;
    }
    total_seconds = parseInt(input_seconds.value) || 0;
    updateTimerDisplay();
});

// start timer event listener
start_timer.addEventListener('click', () => {
    if (is_timer_running) return;

    is_timer_running = true;
    start_timer.disabled = true;
    input_minutes.disabled = true;
    input_seconds.disabled = true;

    timer_interval = setInterval(() => {
        if (total_seconds === 0 && total_minutes === 0) {
            stopTimer();
            alert('Timer Ended!');
            reset_timer.click();
            return;
        }
        
        if (total_seconds === 0) {
            total_seconds = 59;
            total_minutes--;
        } else {
            total_seconds--;
        }

        updateTimerDisplay();
    }, 1000);
    isshowing = true;
    currentClickType = 'start';
    sendTimerData(currentClickType);
    
    
});

// reset timer event listener
reset_timer.addEventListener('click', () => {
    stopTimer();
    total_minutes = parseInt(input_minutes.value) || 0;
    total_seconds = parseInt(input_seconds.value) || 0;
    updateTimerDisplay();
    currentClickType = 'reset';
    sendTimerData(currentClickType);
});

// stop timer event listener
stop_timer.addEventListener('click', () => {

    stopTimer();
    currentClickType = 'stop';
    sendTimerData(currentClickType);
});

// send timer data

 const pause_hide = document.getElementById('pause_hide');
 pause_hide.textContent = 'Show';
            pause_hide.style.backgroundColor = '#2ecc71';
    pause_hide.addEventListener('click', () => {
        if (!isshowing) {
            isshowing = true;
            pause_hide.textContent = 'Hide';
            pause_hide.style.backgroundColor = '#e74c3c';
        } else {
            isshowing = false;
            pause_hide.textContent = 'Show';
            pause_hide.style.backgroundColor = '#2ecc71';
        }
        sendTimerData(currentClickType);

    });

function sendTimerData(clickType) {
    const timerTitle = document.getElementById('timer_title_input').value;
    const warningMessage = document.getElementById('warning_input').value;
    const endTimeMessage = document.getElementById('endtime_input').value;

    const timerData = {
        isShowing: isshowing,
        click: clickType,
        title: timerTitle,
        warning: warningMessage,
        endMessage: endTimeMessage,
        minutes: total_minutes,
        seconds: total_seconds
    };
    socket.emit('timer_data', timerData);
}