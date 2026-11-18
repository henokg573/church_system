const socket = io();
// change css variable
let yOffset = "100%";
let isExiting = false;
let exitTimer;

function setYOffset(value) {
    // If a number is passed (e.g. 60), append '%'
    const formattedValue = typeof value === "number" ? `${value}%` : value;
    document.documentElement.style.setProperty("--y-offset", formattedValue);
}

const container = document.querySelector(".container");

container.addEventListener("transitionend", (event) => {
    if (event.target !== container || event.propertyName !== "transform") {
        return;
    }

    if (!isExiting) {
        isExiting = true;
        exitTimer = setTimeout(() => {
            setYOffset("-100%");
        }, 500);
        return;
    }

    container.style.visibility = "hidden";
    container.style.transition = "none";
    setYOffset(yOffset);
    container.offsetHeight;
    container.style.transition = "";
    isExiting = false;
});

// Set initial value or update dynamically
setYOffset(yOffset);

setTimeout(() => {
    setYOffset("0%");
}, 1000);

socket.on("receive_command", (data) => {
    console.log(data);
    if(data.cmd=="transition_in")
    {
        const transition_text=data.transition;
        document.querySelector(".content h1").textContent = transition_text;
        clearTimeout(exitTimer);
        isExiting = false;
        setYOffset("0%");
        container.style.visibility = "visible";
    }
});
