const socket = io();
let bible_configuration = {}; // Global store for style config
const lyricsFrame = document.getElementById('lyrics_iframe');
const timerFrame = document.getElementById('timer_iframe');
const presenterFrame = document.getElementById('presenter_iframe');
const wallpaperImage = document.getElementById('wallpaper_image');
const wallpaperVideo = document.getElementById('wallpaper_video');
const wallpaperText = document.getElementById('wallpaper_text');
const wallpaperTextImage = document.getElementById('wallpaper_text_image');
const wallpaperTextVideo = document.getElementById('wallpaper_text_video');
const wallpaperTextContent = document.getElementById('wallpaper_text_content');

// DOM Elements
const bible_verse_text = document.getElementById('bible_verse_text');
const bible_verse_number = document.getElementById('bible_verse_number');
const bible_present_container = document.getElementById('bible_present');
const bible_mini_background = document.getElementById('bible_mini_background');
const media_player = document.getElementById('media_player');
const media_player_img = document.getElementById('media_player_img');
const media_player_video = document.getElementById('media_player_video');

function wallpaperFontCssValue(fontFamily) {
    return ['serif', 'sans-serif'].includes(fontFamily) ? fontFamily : JSON.stringify(fontFamily);
}

socket.on("receiveData", (data) => {
    console.log(data);
    if (data?.type === 'song_lyric') {
        lyricsFrame.style.display = data.isvisible ? 'block' : 'none';
    } else if (data?.type === 'lyrics') {
        lyricsFrame.style.display = 'block';
    }
    if (!data || Object.keys(data).length === 0) return;

    if (data.config === 'bible_data') {
        show_bible_data(data);
    } else if (data.config === 'media_player') {
        show_media_player_data(data);
    }
});

socket.on('receive_timer_data', (data) => {
    if (!data || typeof data.isShowing === 'undefined') return;
    timerFrame.hidden = !data.isShowing;
});

// Presenter slides: when live, take over the screen like song lyrics / bible do.
// The iframe (display.html) follows presenter_state internally; when the
// preacher presses End the overlay simply hides — the page itself stays open.
socket.on('presenter_state', (state) => {
    if (!state) return;
    presenterFrame.hidden = !(state.isLive && state.active);
});

function show_bible_data(data) {
    if (data['button_status'] == 1) {
        bible_present_container.style.display = 'flex'; // Fix: use .display
        bible_verse_text.textContent = data['selected_verse_text'];
        
        let chapterint = parseInt(data['chapter_number']) + 1;
        let address = `${data['book_name']} ${chapterint}፥${parseInt(data['selected_number']) + 1}`;
        bible_verse_number.textContent = address;

        // Only style if we have a configuration
        if (Object.keys(bible_configuration).length > 0) {
            set_bible_style(bible_configuration);
        }
    } else {
        bible_present_container.style.display = 'none';
    }
}

function set_bible_style(data) {
    if (!data) return;
    if(data.type=='bible_config'){
        set_background_bible(data);

        if (data.mini_background_status) {
            bible_mini_background.style.backgroundColor = data.mini_background_color;
            bible_mini_background.style.borderColor = data.mini_background_stroke_color;
        } else {
            bible_mini_background.style.backgroundColor = "transparent";
            bible_mini_background.style.borderColor = "transparent";
        }

        bible_verse_text.style.fontSize = `${data.font_size}px`;
        bible_verse_text.style.lineHeight = `${data.line_height}rem`;
        bible_present_container.style.color = data.font_color;
    }
}

function set_background_bible(data) {
    let background_type = data.background_type;
    // Reset filters and images before applying new ones
    bible_present_container.style.filter = "none";
    
    switch (background_type) {
        case 1: // Color
            bible_present_container.style.backgroundColor = data.bible_background_data;
            bible_present_container.style.backgroundImage = "none";
            break;
        case 2: // Image
            bible_present_container.style.backgroundImage = `url(../../plugin/wallpaper/data/${data.bible_background_data})`;
            bible_present_container.style.backgroundSize = 'cover';
            bible_present_container.style.backgroundPosition = 'center';
            break;
        case 3: // Gradient
            let gradient_data = data.bible_background_data;
            bible_present_container.style.backgroundImage = `linear-gradient(90deg, ${gradient_data.color1}, ${gradient_data.color2})`;
            break;
        case 4: // Blur
            // Note: blur filter affects children too. Consider a backdrop-filter or a separate div.
            bible_present_container.style.backgroundColor = "#ffffff";
            bible_present_container.style.filter = `blur(${data.bible_background_data}px)`;
            break;
        case 5: // None
            bible_present_container.style.backgroundColor = "transparent";
            bible_present_container.style.backgroundImage = "none";
            break;
    }
}

socket.on("receiveConfiguration", (data) => {
    if (!data || Object.keys(data).length === 0) return;
    bible_configuration = data; // Save to global
    set_bible_style(data);
});

socket.on("receiveWallpaper", (data) => {
    applyWallpaper(data);
});

function applyWallpaper(wallpaper) {
    if (!wallpaperImage || !wallpaperVideo || !wallpaperText) return;
    wallpaperImage.hidden = true;
    wallpaperVideo.pause();
    wallpaperVideo.hidden = true;
    wallpaperText.hidden = true;
    wallpaperTextImage.hidden = true;
    wallpaperTextVideo.pause();
    wallpaperTextVideo.hidden = true;
    wallpaperText.querySelector('.wallpaper_words').textContent = '';
    wallpaperText.querySelector('.wallpaper_subtitle').textContent = '';

    if (!wallpaper) return;

    if (wallpaper.type === 'text') {
        const background = wallpaper.background || {
            type: 'gradient',
            color1: wallpaper.backgroundColor || '#102a43',
            color2: '#071521'
        };
        wallpaperText.style.setProperty('--wallpaper-bg', background.color1 || '#102a43');
        wallpaperText.style.setProperty('--wallpaper-bg-2', background.color2 || '#071521');
        wallpaperText.style.setProperty('--wallpaper-fg', wallpaper.textColor || '#ffffff');
        wallpaperText.style.setProperty('--wallpaper-font', wallpaperFontCssValue(wallpaper.fontFamily || 'Georgia'));
        wallpaperText.style.setProperty('--wallpaper-font-size', `${wallpaper.fontSize || 72}px`);
        wallpaperTextContent.dataset.position = wallpaper.position || 'center';
        wallpaperText.querySelector('.wallpaper_words').textContent = wallpaper.text || '';
        wallpaperText.querySelector('.wallpaper_subtitle').textContent = wallpaper.subtitle || '';
        wallpaperText.hidden = false;
        if (background.type === 'image' && background.url) {
            wallpaperTextImage.src = background.url;
            wallpaperTextImage.hidden = false;
        } else if (background.type === 'video' && background.url) {
            wallpaperTextVideo.src = background.url;
            wallpaperTextVideo.load();
            wallpaperTextVideo.hidden = false;
            wallpaperTextVideo.play().catch(error => console.warn('Text wallpaper video could not autoplay:', error.message));
        }
        return;
    }

    const url = wallpaper.url || (wallpaper.type === 'wallpaper' ? wallpaper.data : '');
    if (!url) return;
    const isVideo = wallpaper.type === 'video' || /\.(mp4|webm|mov|ogg)$/i.test(url);
    if (isVideo) {
        if (wallpaperVideo.src !== new URL(url, window.location.href).href) {
            wallpaperVideo.src = url;
            wallpaperVideo.load();
        }
        wallpaperVideo.hidden = false;
        wallpaperVideo.play().catch(error => console.warn('Wallpaper video could not autoplay:', error.message));
    } else {
        wallpaperImage.src = url;
        wallpaperImage.hidden = false;
    }
}

function show_media_player_data(data) {
    let filename = data.file_name;
    let play_pause_state = data.play_pause_state;

    if (!play_pause_state) {
        media_player.style.display = 'none';
        media_player_video.pause();
        return;
    }

    media_player.style.display = 'flex';
    let file_extension = filename.split('.').pop().toLowerCase();
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov'];

    if (videoExtensions.includes(file_extension)) {
        media_player_img.style.display = 'none';
        media_player_video.style.display = 'block';

        const newSrc = `../../plugin/wallpaper/data/${filename}`;
        // Only reload if the source is actually different
        if (!media_player_video.src.includes(filename)) {
            media_player_video.src = newSrc;
            media_player_video.load();
        }

        media_player_video.loop = true;
        media_player_video.muted = false; 

        media_player_video.play().catch(error => {
            console.warn("Autoplay interaction required, muting...");
            media_player_video.muted = true;
            media_player_video.play();
        });

    } else {
        media_player_img.style.display = 'flex';
        media_player_video.style.display = 'none';
        media_player_video.pause();
        media_player_img.src = `../../plugin/wallpaper/data/${filename}`;
        media_player_img.style.objectFit = 'contain';
    }
}