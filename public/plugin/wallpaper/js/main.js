const socket = io();
const fileInput = document.getElementById('wallpaper_file');
const mediaLibrary = document.getElementById('media_library');
const previewImage = document.getElementById('preview_image');
const previewVideo = document.getElementById('preview_video');
const previewText = document.getElementById('preview_text');
const previewTextImage = document.getElementById('preview_text_image');
const previewTextVideo = document.getElementById('preview_text_video');
const previewTextContent = document.getElementById('preview_text_content');
const previewWords = document.getElementById('preview_words');
const previewSubtitle = document.getElementById('preview_subtitle');
const emptyPreview = document.getElementById('empty_preview');
const statusMessage = document.getElementById('studio_status');
const connectionState = document.getElementById('connection_state');
let selectedMedia = null;
let currentTextBackground = null;

function fontCssValue(fontFamily) {
    return ['serif', 'sans-serif'].includes(fontFamily) ? fontFamily : JSON.stringify(fontFamily);
}

function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle('error', isError);
}

function setPreviewMode(mode) {
    previewImage.hidden = mode !== 'image';
    previewVideo.hidden = mode !== 'video';
    previewText.hidden = mode !== 'text';
    emptyPreview.hidden = mode !== 'empty';
}

function previewWallpaper(wallpaper) {
    previewVideo.pause();
    if (!wallpaper) {
        setPreviewMode('empty');
        return;
    }

    if (wallpaper.type === 'text') {
        previewWords.textContent = wallpaper.text;
        previewSubtitle.textContent = wallpaper.subtitle || '';
        const background = wallpaper.background || {
            type: 'gradient',
            color1: wallpaper.backgroundColor || '#102a43',
            color2: '#071521'
        };
        previewTextImage.hidden = true;
        previewTextVideo.pause();
        previewTextVideo.hidden = true;
        previewText.style.setProperty('--wallpaper-bg', background.color1 || '#102a43');
        previewText.style.setProperty('--wallpaper-bg-2', background.color2 || '#071521');
        previewText.style.setProperty('--wallpaper-fg', wallpaper.textColor || '#ffffff');
        previewText.style.setProperty('--wallpaper-font', fontCssValue(wallpaper.fontFamily || 'Georgia'));
        previewText.style.setProperty('--wallpaper-font-size', `${wallpaper.fontSize || 72}px`);
        previewTextContent.dataset.position = wallpaper.position || 'center';
        setPreviewMode('text');
        if (background.type === 'image') {
            previewTextImage.src = background.url;
            previewTextImage.hidden = false;
        } else if (background.type === 'video') {
            previewTextVideo.src = background.url;
            previewTextVideo.load();
            previewTextVideo.hidden = false;
            previewTextVideo.play().catch(error => console.warn('Preview video could not autoplay:', error.message));
        }
    } else if (wallpaper.type === 'video') {
        previewVideo.src = wallpaper.url;
        previewVideo.load();
        previewVideo.play().catch(error => console.warn('Preview video could not autoplay:', error.message));
        setPreviewMode('video');
    } else if (wallpaper.type === 'image') {
        previewImage.src = wallpaper.url;
        setPreviewMode('image');
    } else {
        setPreviewMode('empty');
    }
}

function setWallpaper(wallpaper) {
    socket.emit('sendWallpaper', wallpaper);
}

function makeMediaCard(filename) {
    const url = `/plugin/wallpaper/data/${encodeURIComponent(filename)}`;
    const isVideo = /\.(mp4|webm|mov)$/i.test(filename);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'media-item';
    card.dataset.url = url;
    const media = document.createElement(isVideo ? 'video' : 'img');
    media.src = url;
    if (isVideo) {
        media.muted = true;
        media.loop = true;
        media.playsInline = true;
        media.addEventListener('mouseenter', () => {
            media.play().catch(error => console.warn('Library video preview could not play:', error.message));
        });
        media.addEventListener('mouseleave', () => media.pause());
    } else {
        media.alt = '';
    }
    const label = document.createElement('span');
    label.textContent = filename;
    card.append(media, label);
    card.addEventListener('click', () => {
        selectedMedia = { type: isVideo ? 'video' : 'image', url };
        previewWallpaper(selectedMedia);
        document.querySelectorAll('.media-item').forEach(item => {
            item.classList.toggle('selected', item === card);
        });
    });
    return card;
}

async function loadMediaLibrary() {
    try {
        const response = await fetch('/api/wallpapers');
        const files = await response.json();
        if (!response.ok) throw new Error(files.error || `Request failed (${response.status})`);
        populateTextBackgroundMedia(files);
        mediaLibrary.replaceChildren();
        files.forEach(filename => mediaLibrary.appendChild(makeMediaCard(filename)));
        if (!files.length) {
            const empty = document.createElement('p');
            empty.className = 'hint';
            empty.textContent = 'No media uploaded yet.';
            mediaLibrary.appendChild(empty);
        }
        if (selectedMedia) {
            mediaLibrary.querySelectorAll('.media-item').forEach(card => {
                card.classList.toggle('selected', card.dataset.url === selectedMedia.url);
            });
        }
    } catch (error) {
        showStatus(`Could not load media: ${error.message}`, true);
    }
}

function populateTextBackgroundMedia(files) {
    const select = document.getElementById('text_background_media');
    const selectedUrl = select.value;
    select.replaceChildren(new Option('Choose uploaded media', ''));
    files.forEach(filename => {
        const type = /\.(mp4|webm|mov)$/i.test(filename) ? 'video' : 'image';
        select.add(new Option(filename, JSON.stringify({
            type,
            url: `/plugin/wallpaper/data/${encodeURIComponent(filename)}`
        })));
    });
    if (currentTextBackground) {
        const savedValue = JSON.stringify(currentTextBackground);
        if ([...select.options].some(option => option.value === savedValue)) select.value = savedValue;
    }
    if ([...select.options].some(option => option.value === selectedUrl)) select.value = selectedUrl;
}

fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('wallpaper', file);
    showStatus('Uploading media…');
    try {
        const response = await fetch('/api/wallpapers/upload', { method: 'POST', body: formData });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Upload failed (${response.status})`);
        await loadMediaLibrary();
        const url = `/plugin/wallpaper/data/${encodeURIComponent(result.filename)}`;
        selectedMedia = { type: file.type.startsWith('video/') ? 'video' : 'image', url };
        previewWallpaper(selectedMedia);
        showStatus('Upload complete. Set it as the screen wallpaper when ready.');
    } catch (error) {
        showStatus(error.message, true);
    } finally {
        fileInput.value = '';
    }
});

document.getElementById('tab_text').addEventListener('click', () => {
    document.getElementById('tab_text').classList.add('active');
    document.getElementById('tab_text').setAttribute('aria-selected', 'true');
    document.getElementById('tab_media').classList.remove('active');
    document.getElementById('tab_media').setAttribute('aria-selected', 'false');
    document.getElementById('text_editor').hidden = false;
    document.getElementById('media_editor').hidden = true;
});

document.getElementById('tab_media').addEventListener('click', () => {
    document.getElementById('tab_media').classList.add('active');
    document.getElementById('tab_media').setAttribute('aria-selected', 'true');
    document.getElementById('tab_text').classList.remove('active');
    document.getElementById('tab_text').setAttribute('aria-selected', 'false');
    document.getElementById('media_editor').hidden = false;
    document.getElementById('text_editor').hidden = true;
});

function buildTextWallpaper() {
    const backgroundType = document.getElementById('text_background_type').value;
    const selectedBackground = document.getElementById('text_background_media').value;
    let background = {
        type: 'gradient',
        color1: document.getElementById('background_color').value,
        color2: document.getElementById('background_color_2').value
    };
    if (backgroundType !== 'gradient') {
        try {
            const media = JSON.parse(selectedBackground);
            if (media.type === backgroundType) background = media;
        } catch {
            background = { type: backgroundType, url: '' };
        }
    }
    return {
        type: 'text',
        text: document.getElementById('wallpaper_words').value.trim(),
        subtitle: document.getElementById('wallpaper_subtitle').value.trim(),
        background,
        textColor: document.getElementById('text_color').value,
        fontFamily: document.getElementById('wallpaper_font').value,
        fontSize: Number(document.getElementById('wallpaper_font_size').value),
        position: document.getElementById('wallpaper_position').value
    };
}

function updateBackgroundControls() {
    const type = document.getElementById('text_background_type').value;
    const isGradient = type === 'gradient';
    document.getElementById('gradient_colors').hidden = !isGradient;
    document.getElementById('text_background_media').hidden = isGradient;
    document.getElementById('text_background_media_label').hidden = isGradient;
    const mediaSelect = document.getElementById('text_background_media');
    [...mediaSelect.options].forEach(option => {
        if (!option.value) return;
        try {
            option.hidden = JSON.parse(option.value).type !== type;
        } catch {
            option.hidden = true;
        }
    });
    if (mediaSelect.selectedOptions[0]?.hidden) mediaSelect.value = '';
}

document.getElementById('text_background_type').addEventListener('change', () => {
    updateBackgroundControls();
    const wallpaper = buildTextWallpaper();
    if (wallpaper.text) previewWallpaper(wallpaper);
});

document.getElementById('wallpaper_font_size').addEventListener('input', event => {
    document.getElementById('wallpaper_font_size_value').textContent = `${event.target.value} px`;
});

[
    'wallpaper_words',
    'wallpaper_subtitle',
    'background_color',
    'background_color_2',
    'text_color',
    'wallpaper_font',
    'wallpaper_font_size',
    'wallpaper_position',
    'text_background_media'
].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        const wallpaper = buildTextWallpaper();
        if (wallpaper.text) previewWallpaper(wallpaper);
    });
    document.getElementById(id).addEventListener('change', () => {
        const wallpaper = buildTextWallpaper();
        if (wallpaper.text) previewWallpaper(wallpaper);
    });
});

document.getElementById('apply_text').addEventListener('click', () => {
    const wallpaper = buildTextWallpaper();
    if (!wallpaper.text) {
        showStatus('Write some words before setting a text wallpaper.', true);
        return;
    }
    if (wallpaper.background.type !== 'gradient' && !wallpaper.background.url) {
        showStatus(`Choose an uploaded ${wallpaper.background.type} for the text background.`, true);
        return;
    }
    previewWallpaper(wallpaper);
    setWallpaper(wallpaper);
});

document.getElementById('apply_media').addEventListener('click', () => {
    if (!selectedMedia) {
        showStatus('Select or upload an image or video first.', true);
        return;
    }
    setWallpaper(selectedMedia);
});

document.getElementById('refresh_media').addEventListener('click', loadMediaLibrary);
socket.on('connect', () => {
    connectionState.textContent = 'Connected';
    connectionState.className = 'connection-state online';
});
socket.on('disconnect', () => {
    connectionState.textContent = 'Disconnected';
    connectionState.className = 'connection-state offline';
});
socket.on('receiveWallpaper', wallpaper => {
    if (!wallpaper) return;
    if (wallpaper.type === 'text') {
        document.getElementById('wallpaper_words').value = wallpaper.text || '';
        document.getElementById('wallpaper_subtitle').value = wallpaper.subtitle || '';
        document.getElementById('text_color').value = wallpaper.textColor || '#ffffff';
        document.getElementById('wallpaper_font').value = wallpaper.fontFamily || 'Georgia';
        document.getElementById('wallpaper_font_size').value = wallpaper.fontSize || 72;
        document.getElementById('wallpaper_font_size_value').textContent = `${wallpaper.fontSize || 72} px`;
        document.getElementById('wallpaper_position').value = wallpaper.position || 'center';
        const background = wallpaper.background || {
            type: 'gradient',
            color1: wallpaper.backgroundColor || '#102a43',
            color2: '#071521'
        };
        currentTextBackground = background.type === 'gradient' ? null : background;
        document.getElementById('text_background_type').value = background.type || 'gradient';
        if (background.type === 'gradient') {
            document.getElementById('background_color').value = background.color1 || '#102a43';
            document.getElementById('background_color_2').value = background.color2 || '#071521';
        } else {
            document.getElementById('text_background_media').value = JSON.stringify(background);
        }
        updateBackgroundControls();
        previewWallpaper(wallpaper);
    } else {
        selectedMedia = wallpaper;
        previewWallpaper(wallpaper);
        mediaLibrary.querySelectorAll('.media-item').forEach(card => {
            card.classList.toggle('selected', card.dataset.url === wallpaper.url);
        });
    }
    showStatus('This wallpaper is currently on the screen.');
});
socket.on('wallpaper_error', data => showStatus(data?.message || 'Could not set wallpaper.', true));
socket.on('connect_error', error => showStatus(`Could not connect to the screen server: ${error.message}`, true));

loadMediaLibrary();
updateBackgroundControls();
