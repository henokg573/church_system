const sourcePlaylist = document.getElementById('source_playlist');
const sourceSongs = document.getElementById('source_songs');
const sourceSongSearch = document.getElementById('source_song_search');
const sourceVerses = document.getElementById('source_verses');
const addVersesButton = document.getElementById('btn_add_verses');
const mixList = document.getElementById('mix_verse_list');
const mixEmpty = document.getElementById('mix_empty');
const mixCount = document.getElementById('mix_count');
const mixStatus = document.getElementById('mix_status');
const mixForm = document.getElementById('song_mix_form');
const saveButton = document.getElementById('btn_save_mix');
const mixPlaylist = document.getElementById('mix_playlist');
const mixTitle = document.getElementById('mix_title');
const mixSubtitle = document.getElementById('mix_subtitle');
let currentSongPages = [];
let currentSongs = [];
let selectedSourceSong = null;
let selectedVerses = [];

function setStatus(message) {
    mixStatus.textContent = message;
}

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Request failed');
    return result;
}

function fillPlaylistOptions(playlists) {
    const options = playlists.map(playlist => {
        const option = document.createElement('option');
        option.value = playlist.source_key;
        option.textContent = playlist.name;
        return option;
    });
    sourcePlaylist.replaceChildren(...options.map(option => option.cloneNode(true)));
    mixPlaylist.replaceChildren(...options);

    try {
        const preferred = localStorage.getItem('song_mix_playlist');
        if (preferred && playlists.some(playlist => playlist.source_key === preferred)) {
            mixPlaylist.value = preferred;
        }
    } catch (error) {
        console.warn('Could not restore the preferred mix playlist:', error);
    }
}

async function loadPlaylists() {
    const playlists = await fetchJson('/api/lyrics/playlists');
    fillPlaylistOptions(playlists);
}

function clearSongSelection(message = 'Choose a song to view its verses.') {
    currentSongPages = [];
    currentSongs = [];
    selectedSourceSong = null;
    sourceSongs.replaceChildren();
    sourceVerses.replaceChildren();
    const empty = document.createElement('p');
    empty.className = 'mix_empty';
    empty.textContent = message;
    sourceVerses.append(empty);
    addVersesButton.disabled = true;
}

async function loadSongs() {
    clearSongSelection('Loading songs…');
    try {
        const songs = await fetchJson(`/api/lyrics/songs?source=${encodeURIComponent(sourcePlaylist.value)}`);
        currentSongs = songs;
        if (!songs.length) clearSongSelection('No songs in this playlist.');
        else {
            renderSourceSongs();
            clearVerseChoices();
        }
    } catch (error) {
        clearSongSelection(error.message);
    }
}

function renderSourceSongs() {
    sourceSongs.replaceChildren();
    const query = sourceSongSearch.value.trim().toLocaleLowerCase();
    const visibleSongs = currentSongs.filter(song =>
        !query ||
        String(song.title || '').toLocaleLowerCase().includes(query) ||
        String(song.subtitle || '').toLocaleLowerCase().includes(query) ||
        String(song.lyrics || '').toLocaleLowerCase().includes(query)
    );
    if (!visibleSongs.length) {
        const empty = document.createElement('p');
        empty.className = 'mix_empty';
        empty.textContent = query ? 'No matching songs.' : 'No songs in this playlist.';
        sourceSongs.append(empty);
        return;
    }

    visibleSongs.forEach(song => {
        const index = currentSongs.indexOf(song);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `source_song_item${selectedSourceSong?.id === song.id ? ' active' : ''}`;
        button.setAttribute('aria-pressed', String(selectedSourceSong?.id === song.id));
        button.title = song.title;
        const number = document.createElement('span');
        number.className = 'source_song_number';
        number.textContent = String(index + 1).padStart(2, '0');
        const title = document.createElement('span');
        title.className = 'source_song_title';
        title.textContent = song.title;
        button.append(number, title);
        button.addEventListener('click', () => loadSelectedSong(song));
        sourceSongs.append(button);
    });
}

function clearVerseChoices() {
    currentSongPages = [];
    sourceVerses.replaceChildren();
    const empty = document.createElement('p');
    empty.className = 'mix_empty';
    empty.textContent = 'Choose a song to view its verses.';
    sourceVerses.append(empty);
    addVersesButton.disabled = true;
}

function renderVerseChoices(song) {
    currentSongPages = String(song.lyrics || '')
        .split(/\n\s*\n+/)
        .map(page => page.trim())
        .filter(Boolean);
    sourceVerses.replaceChildren();
    if (!currentSongPages.length) {
        const empty = document.createElement('p');
        empty.className = 'mix_empty';
        empty.textContent = 'This song has no verses to add.';
        sourceVerses.append(empty);
        addVersesButton.disabled = true;
        return;
    }

    currentSongPages.forEach((text, index) => {
        const label = document.createElement('label');
        label.className = 'source_verse';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = String(index);
        const number = document.createElement('span');
        number.className = 'source_verse_number';
        number.textContent = String(index + 1).padStart(2, '0');
        const preview = document.createElement('span');
        preview.textContent = text;
        label.append(checkbox, number, preview);
        sourceVerses.append(label);
    });
    addVersesButton.disabled = false;
}

async function loadSelectedSong(song) {
    selectedSourceSong = song;
    renderSourceSongs();
    sourceVerses.replaceChildren();
    const loading = document.createElement('p');
    loading.className = 'mix_empty';
    loading.textContent = 'Loading verses…';
    sourceVerses.append(loading);
    addVersesButton.disabled = true;
    try {
        const fullSong = await fetchJson(`/api/lyrics/song/${encodeURIComponent(song.id)}`);
        if (selectedSourceSong?.id === song.id) renderVerseChoices(fullSong);
    } catch (error) {
        sourceVerses.replaceChildren();
        const errorMessage = document.createElement('p');
        errorMessage.className = 'mix_empty';
        errorMessage.textContent = error.message;
        sourceVerses.append(errorMessage);
    }
}

function renderMix() {
    mixList.replaceChildren();
    selectedVerses.forEach((verse, index) => {
        const item = document.createElement('li');
        item.className = 'mix_verse_item';
        const number = document.createElement('span');
        number.className = 'mix_verse_number';
        number.textContent = String(index + 1).padStart(2, '0');
        const content = document.createElement('div');
        const text = document.createElement('div');
        text.className = 'mix_verse_text';
        text.textContent = verse.text;
        const origin = document.createElement('small');
        origin.className = 'mix_verse_origin';
        origin.textContent = `${verse.songTitle} — Verse ${verse.pageNumber}`;
        content.append(text, origin);

        const actions = document.createElement('div');
        actions.className = 'mix_verse_actions';
        const up = document.createElement('button');
        up.type = 'button';
        up.title = 'Move verse up';
        up.setAttribute('aria-label', 'Move verse up');
        up.innerHTML = '<i class="bi bi-arrow-up"></i>';
        up.disabled = index === 0;
        up.addEventListener('click', () => {
            [selectedVerses[index - 1], selectedVerses[index]] = [selectedVerses[index], selectedVerses[index - 1]];
            renderMix();
        });
        const down = document.createElement('button');
        down.type = 'button';
        down.title = 'Move verse down';
        down.setAttribute('aria-label', 'Move verse down');
        down.innerHTML = '<i class="bi bi-arrow-down"></i>';
        down.disabled = index === selectedVerses.length - 1;
        down.addEventListener('click', () => {
            [selectedVerses[index + 1], selectedVerses[index]] = [selectedVerses[index], selectedVerses[index + 1]];
            renderMix();
        });
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.title = 'Remove verse';
        remove.setAttribute('aria-label', 'Remove verse');
        remove.className = 'remove_mix_verse';
        remove.innerHTML = '<i class="bi bi-trash3"></i>';
        remove.addEventListener('click', () => {
            selectedVerses.splice(index, 1);
            renderMix();
        });
        actions.append(up, down, remove);
        item.append(number, content, actions);
        mixList.append(item);
    });
    mixEmpty.hidden = selectedVerses.length > 0;
    mixCount.textContent = `${selectedVerses.length} ${selectedVerses.length === 1 ? 'verse' : 'verses'}`;
}

sourcePlaylist.addEventListener('change', loadSongs);
sourceSongSearch.addEventListener('input', renderSourceSongs);
mixPlaylist.addEventListener('change', () => {
    try {
        localStorage.setItem('song_mix_playlist', mixPlaylist.value);
    } catch (error) {
        console.warn('Could not save the preferred mix playlist:', error);
    }
});

addVersesButton.addEventListener('click', () => {
    const songTitle = selectedSourceSong?.title || 'Unknown song';
    const indexes = Array.from(sourceVerses.querySelectorAll('input[type="checkbox"]:checked'))
        .map(input => Number(input.value))
        .filter(index => Number.isInteger(index) && currentSongPages[index]);
    if (!indexes.length) {
        setStatus('Select at least one verse to add.');
        return;
    }
    selectedVerses.push(...indexes.map(index => ({
        text: currentSongPages[index],
        songTitle,
        pageNumber: index + 1
    })));
    sourceVerses.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = false; });
    setStatus('');
    renderMix();
});

mixForm.addEventListener('submit', async event => {
    event.preventDefault();
    setStatus('');
    if (!selectedVerses.length) {
        setStatus('Add at least one verse to the mix.');
        return;
    }

    saveButton.disabled = true;
    saveButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving…';
    try {
        const result = await fetchJson('/api/lyrics/songs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source: mixPlaylist.value,
                title: mixTitle.value.trim(),
                subtitle: mixSubtitle.value.trim(),
                lyrics: selectedVerses.map(verse => verse.text).join('\n\n')
            })
        });
        try {
            localStorage.setItem('song_mix_playlist', mixPlaylist.value);
        } catch (error) {
            console.warn('Could not save the preferred mix playlist:', error);
        }
        window.location.href = `index.html?source=${encodeURIComponent(mixPlaylist.value)}&song=${encodeURIComponent(result.song.id)}`;
    } catch (error) {
        setStatus(error.message);
        saveButton.disabled = false;
        saveButton.innerHTML = '<i class="bi bi-database-add"></i> Save Mix';
    }
});

loadPlaylists()
    .then(() => {
        if (sourcePlaylist.value) return loadSongs();
    })
    .catch(error => setStatus(error.message));
renderMix();
