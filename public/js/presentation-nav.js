(() => {
    const navigation = document.querySelector(".plugin_nav");
    const button = navigation?.querySelector("[data-presentation-open]");
    if (!navigation || !button) return;

    const status = document.createElement("span");
    status.className = "presentation_status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.hidden = true;
    navigation.append(status);

    const dialog = document.createElement("dialog");
    dialog.className = "presentation_dialog";
    dialog.setAttribute("aria-labelledby", "presentation_dialog_title");
    dialog.innerHTML = `
        <div class="presentation_dialog_header">
            <div>
                <h2 id="presentation_dialog_title">Choose a display</h2>
                <p data-display-message>Select a secondary display for Screen 01.</p>
            </div>
            <button type="button" class="presentation_dialog_close" aria-label="Close display selection">&times;</button>
        </div>
        <div class="presentation_display_list" role="group" aria-label="Available displays"></div>
        <div class="presentation_dialog_footer">
            <button type="button" class="presentation_manual_open" hidden>Open a window to move manually</button>
        </div>`;
    document.body.append(dialog);

    const displayList = dialog.querySelector(".presentation_display_list");
    const message = dialog.querySelector("[data-display-message]");
    const manualOpen = dialog.querySelector(".presentation_manual_open");
    let screens = [];
    let currentScreen = null;
    let statusTimeout;

    const announce = (text) => {
        window.clearTimeout(statusTimeout);
        status.textContent = text;
        status.hidden = false;
        statusTimeout = window.setTimeout(() => {
            status.textContent = "";
            status.hidden = true;
        }, 4000);
    };

    const openPresentation = (targetScreen) => {
        const presentation = window.open("/screen/01/", "church-screen-presentation", "popup=yes");
        if (!presentation) {
            announce("The presentation window was blocked. Allow popups for this site and try again.");
            return;
        }

        if (targetScreen) {
            try {
                presentation.moveTo(targetScreen.availLeft, targetScreen.availTop);
                presentation.resizeTo(targetScreen.availWidth, targetScreen.availHeight);
                presentation.focus();
            } catch (error) {
                console.warn("Could not position the presentation window on the selected display.", error);
            }
        } else {
            presentation.focus();
        }

        const startFullscreen = () => {
            if (presentation.closed) return;
            const root = presentation.document.documentElement;
            if (typeof root.requestFullscreen !== "function") {
                announce("Screen 01 opened. Use F11 to enter fullscreen if needed.");
                return;
            }

            root.requestFullscreen().catch((error) => {
                console.warn("Could not enter presentation fullscreen automatically.", error);
                announce("Screen 01 opened. Your browser blocked automatic fullscreen; use F11 on the presentation window.");
            });
        };
        if (presentation.document.readyState === "complete") {
            startFullscreen();
        } else {
            presentation.addEventListener("load", startFullscreen, { once: true });
        }

        dialog.close();
        announce(targetScreen
            ? "Opening Screen 01 on the selected display."
            : "Screen 01 opened in a new window. Move it to the other monitor and use F11 if needed.");
    };

    const addManualOption = () => {
        manualOpen.hidden = false;
        manualOpen.onclick = () => openPresentation(null);
    };

    navigation.querySelector(".presentation_dialog_close")?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
    });

    button.addEventListener("click", async () => {
        displayList.replaceChildren();
        manualOpen.hidden = true;
        message.textContent = "Checking available displays...";
        dialog.showModal();

        if (typeof window.getScreenDetails !== "function") {
            message.textContent = "This browser does not support display selection. You can open Screen 01 in a window and move it manually.";
            addManualOption();
            return;
        }

        try {
            const details = await window.getScreenDetails();
            currentScreen = details.currentScreen;
            screens = details.screens.filter((screen) => screen.id !== currentScreen.id);
        } catch (error) {
            console.warn("Could not access available displays.", error);
            message.textContent = "Display access was denied or unavailable. Allow display access in your browser and try again, or open a window to move manually.";
            addManualOption();
            return;
        }

        if (!dialog.open) return;

        if (screens.length === 0) {
            message.textContent = "No other display is currently available. Connect another monitor, then try again.";
            addManualOption();
            return;
        }

        message.textContent = "Select the monitor where you want Screen 01 to appear.";
        screens.forEach((screen) => {
            const option = document.createElement("button");
            option.type = "button";
            option.className = "presentation_display_option";

            const label = document.createElement("span");
            label.className = "presentation_display_name";
            const displayNumber = details.screens.findIndex((available) => available.id === screen.id) + 1;
            label.textContent = screen.isPrimary ? `Display ${displayNumber} (Primary)` : `Display ${displayNumber}`;

            const resolution = document.createElement("span");
            resolution.className = "presentation_display_resolution";
            resolution.textContent = `${screen.width} × ${screen.height}`;

            option.append(label, resolution);
            option.addEventListener("click", () => openPresentation(screen));
            displayList.append(option);
        });
    });
})();
