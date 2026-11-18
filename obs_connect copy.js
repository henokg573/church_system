const { OBSWebSocket } = require('obs-websocket-js');
const obs = new OBSWebSocket();
let pgmScene = null;
let prvScene = null;
function obsConnect(ip, port, password) {
    return obs.connect(`ws://${ip}:${port}`, password)
        .then(() => {
            console.log('Connected to OBS');
        });
}

async function obs_command(command) {
    const sceneCommands = {
        CAM_1_PRV: 'CAM 1',
        CAM_2_PRV: 'CAM 2',
        CAM_3_PRV: 'CAM 3',
        CAM_4_PRV: 'CAM 4',
        CAM_1_PGM: 'CAM 1',
        CAM_2_PGM: 'CAM 2',
        CAM_3_PGM: 'CAM 3',
        CAM_4_PGM: 'CAM 4'
    };

    if (sceneCommands[command]) {
        const request = command.endsWith('_PRV')
            ? 'SetCurrentPreviewScene'
            : 'SetCurrentProgramScene';

        return obs.call(request, { sceneName: sceneCommands[command] });
    }

    if (command === 'CUT' || command === 'AUTO') {
        const sceneInfo = await get_prv_pgm();

        if (!sceneInfo || !sceneInfo.previewScene) {
            throw new Error('No preview scene found. Enable Studio Mode in OBS.');
        }
        else{
            // console.log(`Current Preview Scene: ${sceneInfo.previewScene}`);
            // console.log(`Current Program Scene: ${sceneInfo.programScene}`);
        }

        if (command === 'CUT') {
            // Set the transition to "Cut" before triggering the studio transition
            //console.log('Setting transition to Cut');

            await obs.call('SetCurrentSceneTransition', {
                transitionName: 'Cut'
            });
        }
        else if (command === 'AUTO') {
            await obs.call('SetCurrentSceneTransition', {
                transitionName: 'Fade'
            }); 
        }
        // OBS promotes the current preview scene when the studio transition is triggered.
        // set pr
        return obs.call('TriggerStudioModeTransition');
    }
    if (command === 'INTRO') {
        // set program scene to intro
        return obs.call('SetCurrentProgramScene', { sceneName: 'Intro' });
    }
    if (command === 'INTRO_PRV') {
        // set preview scene to intro
        return obs.call('SetCurrentPreviewScene', { sceneName: 'Intro' });
    }

    throw new Error(`Unsupported OBS command: ${command}`);
}

async function get_prv_pgm() {
    try {
        const programScene = await obs.call('GetCurrentProgramScene');
        let previewScene = null;

        try {
            previewScene = await obs.call('GetCurrentPreviewScene');
        } catch (error) {
            console.warn('Preview scene is unavailable; Studio Mode may be disabled.');
        }

        pgmScene = programScene.sceneName;
        prvScene = previewScene ? previewScene.sceneName : null;

        return {
            
            previewScene: previewScene ? previewScene.sceneName : null,
            programScene: programScene.sceneName
        };
    } catch (error) {
        console.error('Error getting preview and program scenes:', error);
        return null;
    }
}

async function get_prv_pgm_after_command() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const sceneInfo = await get_prv_pgm();

        if (sceneInfo) {
            return sceneInfo;
        }
    }

    return null;
}

module.exports =function(app) {
    console.log("OBS module loaded");
    //obsConnect('localhost', 4455, '12345678'); 
    
    // Replace with your OBS WebSocket password

    // create an api endpoint

    app.post('/api/obs-connect', async (req, res) => {
        try {
            const { ip, port, password } = req.body;
            if (!ip || !port) {
                return res.status(400).json({ message: "OBS IP address and port are required" });
            }

            await obsConnect(ip, port, password);
            res.json({ message: "Connected to OBS" });
        } catch (error) {
            console.error("Error connecting to OBS:", error);
            res.status(502).json({ message: "Unable to connect to OBS" });
        }
    });
    app.post('/api/obs-disconnect', async (req, res) => {
        try {
            await obs.disconnect();
            res.json({ message: "OBS disconnected" });
        } catch (error) {
            console.error("Error disconnecting from OBS:", error);
            res.status(500).send("Error disconnecting from OBS");
        }
    });
    app.post('/api/obs-command', async (req, res) => {
        try {
            const { command } = req.body;
            if (!command) {
                return res.status(400).json({ message: "OBS command is required" });
            }

            const previousSceneInfo = await get_prv_pgm();
            await obs_command(command);
            let sceneInfo = null;

            try {
                sceneInfo = await get_prv_pgm_after_command();
            } catch (error) {
                console.warn("Scene information is unavailable:", error.message);
            }

            if (sceneInfo && previousSceneInfo) {
                if (command.endsWith('_PGM')) {
                    sceneInfo.previewScene = previousSceneInfo.previewScene;
                } else if (command.endsWith('_PRV')) {
                    sceneInfo.programScene = previousSceneInfo.programScene;
                }
            }

            res.json({ message: "OBS command sent", sceneInfo });
        } catch (error) {
            console.error("Error sending OBS command:", error);
            res.status(500).json({ message: "Error sending OBS command" });
        }
    });
    app.post('/api/obs-get-scene', async (req, res) => {
        try {
            const { scene } = req.body;
            if (!scene) {
                return res.status(400).json({ message: "OBS scene is required" });
            }

            const currentScene = await obs.call('GetCurrentScene');
            const allScenes = await obs.call('GetSceneList');

            const sceneExists = allScenes.scenes.some(s => s.name === scene);
            res.json({ sceneExists });
        } catch (error) {
            console.error("Error getting OBS scene:", error);
            res.status(500).json({ message: "Error getting OBS scene" });
        }
    });
    app.post('/api/obs-get-scene-list', async (req, res) => {
        try {
            const allScenes = await obs.call('GetSceneList');
            res.json({ scenes: allScenes.scenes });
        } catch (error) {
            console.error("Error getting OBS scene list:", error);
            res.status(500).json({ message: "Error getting OBS scene list" });
        }
    });
    const obsStatus = (req, res) => {
        res.json({ isConnected: obs.identified });
    };

    app.get('/api/obs-status', obsStatus);
    app.post('/api/obs-status', obsStatus);
    app.post('/api/obs-get-prv-pgm', async (req, res) => {
        try {
            const sceneInfo = await get_prv_pgm();
            res.json({ sceneInfo });
        } catch (error) {
            console.error("Error getting previous program scene:", error);
            res.status(500).json({ message: "Error getting previous program scene" });
        }
    })

};