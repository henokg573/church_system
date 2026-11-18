const socket = io();

// Saved Sync preference
const savedSyncPref = (() => {
    try {
        const val = localStorage.getItem('lyrics_control_sync');
        return val !== null ? val === 'true' : true;
    } catch (e) {
        return true;
    }
})();

// Application State
const state = {
    source: 'hymnal',
    sort: 'order',
    playlists: [],
    songs: [],
    visibleSongs: [],
    selectedSongId: null,
    selectedPage: 0,
    isVisible: true,
    isSyncActive: savedSyncPref,
    playlistName: 'Local Songs',
    activeTab: 'search',
    isSongEditMode: false,
    isSongDeleteMode: false,
    properties: {
        fontSize: 50,
        fontColor: '#000000',
        titleColor: '#000000',
        chorusColor: '#000000',
        monitorFontSize: 50,
        monitorType: 'one',
        // Main Background (like Bible)
        mainBgType: 'gradient',
        mainBgColor: '#0d1320',
        mainGradC1: '#0d1320',
        mainGradC2: '#182235',
        mainGradC3: '#0f172a',
        mainGradAngle: 135,
        mainImgUrl: '',
        mainImgFit: 'cover',
        mainVidUrl: '',
        mainBgOpacity: 100,
        mainBgBlur: 0,
        // Mini Background (like Bible)
        miniBgShow: true,
        miniBgType: 'color',
        miniBgColor: '#141e2d',
        miniBgOpacity: 85,
        gradColor1: '#1a1a2e',
        gradColor2: '#16213e',
        gradColor3: '#0f3460',
        gradAngle: 135,
        bgImageUrl: '',
        imgFit: 'cover',
        bgVideoUrl: '',
        miniBgRadius: 18,
        miniBgBlur: 0,
        miniPaddingX: 40,
        miniPaddingY: 26
    },
    settings: {
        autoAdvance: false,
        advanceDelay: 5,
        bgColor: '#f7f3ec',
        screen: 'primary',
        transition: 'none'
    }
};
let draggedSongId = null;
let suppressSongClick = false;

let autoAdvanceTimer = null;
let songListScrollFrame = 0;

// DOM Elements
const songListEl = document.getElementById('song_list');
const songTitleEl = document.getElementById('song_title');
const songSubtitleEl = document.getElementById('song_subtitle');
const pageCounterEl = document.getElementById('page_counter');
const lyricTextEl = document.getElementById('lyric_text');
const previewNowFrame = document.getElementById('preview_now_frame');
const previewNextFrame = document.getElementById('preview_next_frame');
const btnPrev = document.getElementById('btn_prev');
const btnNext = document.getElementById('btn_next');
const btnShow = document.getElementById('btn_show');
const btnSync = document.getElementById('btn_sync');
const syncBtnLabel = document.getElementById('sync_btn_label');
const sourceSelect = document.getElementById('song_source');
const sortSelect = document.getElementById('song_sort');
const searchInput = document.getElementById('song_search');

// Right Panel: Tab & Search Elements
const tabButtons = document.querySelectorAll('.tab_btn');
const tabContents = document.querySelectorAll('.tab_content');
const playlistNameInput = document.getElementById('playlist_name');
const playlistSearchInput = document.getElementById('playlist_search');
const searchScopeInLyricsEl = document.getElementById('search_in_lyrics');
const searchResultsHeaderEl = document.getElementById('search_results_header');
const playlistResultsEl = document.getElementById('playlist_results');

// Right Panel: Property Elements
const propRenamePlaylistInput = document.getElementById('prop_rename_playlist_input');
const btnRenamePlaylist = document.getElementById('btn_rename_playlist');
const propRenameSongTitle = document.getElementById('prop_rename_song_title');
const propRenameSongSubtitle = document.getElementById('prop_rename_song_subtitle');
const btnRenameSong = document.getElementById('btn_rename_song');

// Library add/import controls
const btnAddMenu = document.getElementById('btn_add_menu');
const btnImportExcel = document.getElementById('btn_import_excel');
const btnExportPlaylist = document.getElementById('btn_export_playlist');
const btnEditSongs = document.getElementById('btn_edit_songs');
const btnDeleteSongs = document.getElementById('btn_delete_songs');
const deletePlaylistActions = document.getElementById('delete_playlist_actions');
const btnDeletePlaylistSongs = document.getElementById('btn_delete_playlist_songs');
const songOrderHint = document.getElementById('song_order_hint');
const addMenu = document.getElementById('add_menu');
const btnAddPlaylist = document.getElementById('btn_add_playlist');
const btnAddSong = document.getElementById('btn_add_song');
const btnAddSongMix = document.getElementById('btn_add_song_mix');
const libraryModalOverlay = document.getElementById('library_modal_overlay');
const libraryModalTitle = document.getElementById('library_modal_title');
const libraryModalClose = document.getElementById('library_modal_close');
const playlistForm = document.getElementById('playlist_form');
const songForm = document.getElementById('song_form');
const excelImportForm = document.getElementById('excel_import_form');
const playlistJsonImportForm = document.getElementById('playlist_json_import_form');
const btnOpenPlaylistJsonImport = document.getElementById('btn_open_playlist_json_import');
const btnBackToExcelImport = document.getElementById('btn_back_to_excel_import');
const newPlaylistName = document.getElementById('new_playlist_name');
const newSongPlaylist = document.getElementById('new_song_playlist');
const newSongTitle = document.getElementById('new_song_title');
const newSongSubtitle = document.getElementById('new_song_subtitle');
const songSlideList = document.getElementById('song_slide_list');
const songSlideText = document.getElementById('song_slide_text');
const songSlideLabel = document.getElementById('song_slide_label');
const btnSongAddSlide = document.getElementById('btn_song_add_slide');
const btnSongDeleteSlide = document.getElementById('btn_song_delete_slide');
const importPlaylist = document.getElementById('import_playlist');
const excelFile = document.getElementById('excel_file');
const excelImportSummary = document.getElementById('excel_import_summary');
const playlistJsonFile = document.getElementById('playlist_json_file');
const playlistJsonImportSummary = document.getElementById('playlist_json_import_summary');
const pptReviewForm = document.getElementById('ppt_review_form');
const pptReviewList = document.getElementById('ppt_review_list');
const pptReviewSummary = document.getElementById('ppt_review_summary');
const btnBackToPptPick = document.getElementById('btn_back_to_ppt_pick');
let pptReviewSongs = [];
let songEditorSlides = [''];
let activeSongEditorSlide = 0;

const propFontSizeEl = document.getElementById('prop_font_size');
const propFontColorEl = document.getElementById('prop_font_color');
const propTitleColorEl = document.getElementById('prop_title_color');
const propChorusColorEl = document.getElementById('prop_chorus_color');
const propMonitorFontSizeEl = document.getElementById('prop_monitor_font_size');
const propMonitorTypeEls = document.querySelectorAll('input[name="monitor_type"]');

// Right Panel: Settings Elements
const settingControlSyncEl = document.getElementById('setting_control_sync');
const settingAutoAdvanceEl = document.getElementById('setting_auto_advance');
const settingAdvanceDelayEl = document.getElementById('setting_advance_delay');
const settingBgColorEl = document.getElementById('setting_bg_color');
const settingScreenEl = document.getElementById('setting_screen');
const settingTransitionEl = document.getElementById('setting_transition');
const btnReloadSongsEl = document.getElementById('btn_reload_songs');
const btnClearCacheEl = document.getElementById('btn_clear_cache');

// ── Tab Management ──────────────────────────────────────────────────────────

function setActiveTab(tabName) {
    state.activeTab = tabName;
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `tab_${tabName}`);
    });
    try {
        localStorage.setItem('lyrics_active_tab', tabName);
    } catch (e) {
        // ignore storage errors
    }
}

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        setActiveTab(btn.dataset.tab);
    });
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function highlightMatches(text, query) {
    if (!query) return escapeHtml(text);
    const escapedText = escapeHtml(text);
    const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!escapedQuery) return escapedText;
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return escapedText.replace(regex, '<span class="search_match">$1</span>');
}

function animateSongListScroll(targetScrollTop) {
    if (songListScrollFrame) cancelAnimationFrame(songListScrollFrame);

    const maxScrollTop = songListEl.scrollHeight - songListEl.clientHeight;
    const target = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
    const start = songListEl.scrollTop;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || Math.abs(target - start) < 1) {
        songListEl.scrollTop = target;
        return;
    }

    const duration = 500;
    let startTime = null;
    const animate = timestamp => {
        if (startTime === null) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        songListEl.scrollTop = start + (target - start) * easedProgress;
        if (progress < 1) {
            songListScrollFrame = requestAnimationFrame(animate);
        } else {
            songListScrollFrame = 0;
        }
    };

    songListScrollFrame = requestAnimationFrame(animate);
}

function scrollSelectedSongIntoView() {
    if (!songListEl || state.selectedSongId === null) return;
    const selectedItem = [...songListEl.querySelectorAll('.song-item')]
        .find(item => item.classList.contains('active'));
    if (!selectedItem) return;

    const listRect = songListEl.getBoundingClientRect();
    const itemRect = selectedItem.getBoundingClientRect();
    if (itemRect.top >= listRect.top && itemRect.bottom <= listRect.bottom) return;

    const targetScrollTop = songListEl.scrollTop + itemRect.top - listRect.top -
        (songListEl.clientHeight - itemRect.height) / 2;
    const maxScrollTop = songListEl.scrollHeight - songListEl.clientHeight;
    songListEl.scrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
}

function buildPageList(song) {
    if (!song) return [];
    const lyricPages = String(song.lyrics || '')
        .split(/\n\s*\n+/)
        .map(page => page.trim())
        .filter(Boolean);
    const titlePage = [song.title, song.subtitle]
        .map(value => String(value || '').trim())
        .filter(Boolean)
        .join('\n');
    return titlePage ? [titlePage, ...lyricPages] : lyricPages;
}

/**
 * Searches inside the lyrics of a song for a query.
 * Returns null if not found, or { pageIndex, line, snippet } if found.
 */
function findLyricMatch(song, query) {
    if (!query || !song) return null;
    const qLower = query.toLowerCase().trim();
    if (!qLower) return null;

    const pages = song.pages && song.pages.length ? song.pages : buildPageList(song);
    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
        const lines = pages[pageIdx].split('\n');
        for (let line of lines) {
            const trimmed = line.trim();
            if (trimmed.toLowerCase().includes(qLower)) {
                return {
                    pageIndex: pageIdx,
                    line: trimmed,
                    snippet: trimmed
                };
            }
        }
    }
    return null;
}

// ── Preview & State Sync ───────────────────────────────────────────────────

function sendPreview(frame, payload) {
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage({ type: 'lyrics-preview', data: payload }, '*');
}

function renderPreviewCards() {
    const songIndex = state.songs.findIndex(item => String(item.id) === String(state.selectedSongId));
    const song = songIndex >= 0 ? state.songs[songIndex] : null;
    const pages = song ? buildPageList(song) : [];
    const nowText = pages[state.selectedPage] || '';
    const nowIsTitleSlide = state.selectedPage === 0;
    const nowSongNumber = songIndex >= 0 ? String(songIndex + 1).padStart(2, '0') : (song?.id ? String(song.id).padStart(2, '0') : '01');

    let nextTitle = song ? song.title : 'Song Title';
    let nextSubtitle = song && song.subtitle ? song.subtitle : '';
    let nextSongNumber = nowSongNumber;
    let nextText = '';
    let nextIsTitleSlide = false;

    if (song && state.selectedPage + 1 < pages.length) {
        nextText = pages[state.selectedPage + 1];
        nextIsTitleSlide = state.selectedPage + 1 === 0;
    } else if (song && songIndex + 1 < state.songs.length) {
        const nextSong = state.songs[songIndex + 1];
        const nextPages = buildPageList(nextSong);
        nextTitle = nextSong.title;
        nextSubtitle = nextSong.subtitle || '';
        nextSongNumber = String(songIndex + 2).padStart(2, '0');
        nextText = nextPages[0] || '';
        nextIsTitleSlide = true;
    } else {
        nextText = pages[state.selectedPage] || '';
        nextIsTitleSlide = nowIsTitleSlide;
    }

    const previewProps = {
        fontSize: state.properties.fontSize,
        fontColor: state.properties.fontColor,
        titleColor: state.properties.titleColor,
        chorusColor: state.properties.chorusColor,
        bgColor: state.settings.bgColor,
        // Background & Mini Background
        mainBgType: state.properties.mainBgType,
        mainBgColor: state.properties.mainBgColor,
        mainGradC1: state.properties.mainGradC1,
        mainGradC2: state.properties.mainGradC2,
        mainGradC3: state.properties.mainGradC3,
        mainGradAngle: state.properties.mainGradAngle,
        mainImgUrl: state.properties.mainImgUrl,
        mainImgFit: state.properties.mainImgFit,
        mainVidUrl: state.properties.mainVidUrl,
        mainBgOpacity: state.properties.mainBgOpacity,
        mainBgBlur: state.properties.mainBgBlur,
        miniBgShow: state.properties.miniBgShow,
        miniBgType: state.properties.miniBgType,
        miniBgColor: state.properties.miniBgColor,
        miniBgOpacity: state.properties.miniBgOpacity,
        gradColor1: state.properties.gradColor1,
        gradColor2: state.properties.gradColor2,
        gradColor3: state.properties.gradColor3,
        gradAngle: state.properties.gradAngle,
        bgImageUrl: state.properties.bgImageUrl,
        imgFit: state.properties.imgFit,
        bgVideoUrl: state.properties.bgVideoUrl,
        miniBgRadius: state.properties.miniBgRadius,
        miniBgBlur: state.properties.miniBgBlur,
        miniPaddingX: state.properties.miniPaddingX,
        miniPaddingY: state.properties.miniPaddingY
    };

    sendPreview(previewNowFrame, {
        title: song ? song.title : 'Song Title',
        subtitle: song && song.subtitle ? song.subtitle : '',
        songNumber: nowSongNumber,
        pageText: nowText || 'No page selected',
        isTitleSlide: nowIsTitleSlide,
        ...previewProps
    });

    sendPreview(previewNextFrame, {
        title: nextTitle,
        subtitle: nextSubtitle,
        songNumber: nextSongNumber,
        pageText: nextText || 'No next page',
        isTitleSlide: nextIsTitleSlide,
        ...previewProps
    });
}

window.addEventListener('message', (event) => {
    if (event.data?.type === 'lyrics-preview-ready') {
        renderPreviewCards();
    }
});

if (previewNowFrame) previewNowFrame.addEventListener('load', renderPreviewCards);
if (previewNextFrame) previewNextFrame.addEventListener('load', renderPreviewCards);

// ── Control Synchronization Logic ──────────────────────────────────────────

function updateSyncButtonUI() {
    const isActive = Boolean(state.isSyncActive);
    if (btnSync) {
        btnSync.classList.toggle('active', isActive);
        btnSync.classList.toggle('sync_off', !isActive);
        btnSync.setAttribute('title', isActive
            ? 'Control Sync is ON: Changes sync live across all devices and projectors. Click to turn off.'
            : 'Control Sync is OFF: Operating in independent private mode. Your changes will not affect others. Click to sync.');
        btnSync.innerHTML = `
            <span class="sync_pulse ${isActive ? '' : 'off'}"></span>
            <i class="bi bi-${isActive ? 'broadcast' : 'wifi-off'}"></i>
            <span id="sync_btn_label">${isActive ? 'Sync: On' : 'Sync: Off'}</span>
        `;
    }
    if (settingControlSyncEl) {
        settingControlSyncEl.checked = isActive;
    }
}

function setControlSync(nextState) {
    state.isSyncActive = Boolean(nextState);
    try {
        localStorage.setItem('lyrics_control_sync', String(state.isSyncActive));
    } catch (e) {}

    updateSyncButtonUI();

    // When sync is turned back ON, broadcast current state to others
    if (state.isSyncActive) {
        emitLyricsState();
    }
}

function emitLyricsState() {
    // If control sync is disabled on this device, do NOT broadcast changes to other devices/projectors
    if (!state.isSyncActive) return;

    const songIndex = state.songs.findIndex(item => String(item.id) === String(state.selectedSongId));
    const song = songIndex >= 0 ? state.songs[songIndex] : null;
    const pages = song ? buildPageList(song) : [];
    const pageText = pages[state.selectedPage] || '';
    const songNumber = songIndex >= 0 ? String(songIndex + 1).padStart(2, '0') : (song?.id ? String(song.id).padStart(2, '0') : '01');

    socket.emit('sendData', {
        type: 'lyrics',
        senderId: socket.id,
        data: {
            type: 'lyrics',
            senderId: socket.id,
            source: state.source,
            songId: state.selectedSongId,
            songNumber: songNumber,
            title: song?.title || '',
            subtitle: song?.subtitle || '',
            song,
            pages,
            pageIndex: state.selectedPage,
            pageText,
            isTitleSlide: state.selectedPage === 0,
            isVisible: state.isVisible,
            properties: state.properties,
            settings: state.settings
        }
    });

    socket.emit('sendConfig', {
        type: 'lyrics_properties',
        properties: { ...state.properties }
    });
}

// ── Song List (Sidebar) ────────────────────────────────────────────────────

function isSongEditorPage() {
    const pageName = window.location.pathname.split('/').pop();
    return pageName === 'add-song.html' || pageName === 'edit-song.html';
}

function renderSongList() {
    if (!songListEl) return;
    songListEl.innerHTML = '';

    const query = (searchInput ? searchInput.value.trim() : '').toLowerCase();
    const isNumberQuery = /^\d+$/.test(query);
    const canReorder = state.isSongEditMode && state.sort === 'order' && !query &&
        state.visibleSongs.length === state.songs.length;
    if (songOrderHint) songOrderHint.hidden = !state.isSongEditMode;

    state.visibleSongs.forEach((song, index) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'song-item';
        item.draggable = canReorder;
        item.dataset.songId = String(song.id);
        if (String(song.id) === String(state.selectedSongId)) {
            item.classList.add('active');
        }

        let lyricMatch = null;
        if (query && !isNumberQuery) {
            const titleMatches = (song.title || '').toLowerCase().includes(query) ||
                                 (song.subtitle || '').toLowerCase().includes(query);
            if (!titleMatches) {
                lyricMatch = findLyricMatch(song, query);
            }
        }

        const snippetHtml = lyricMatch
            ? `<span class="song-match-snippet">↳ V${lyricMatch.pageIndex + 1}: ${highlightMatches(lyricMatch.snippet, query)}</span>`
            : '';
        const subtitle = String(song.subtitle || '').trim();
        const subtitleHtml = subtitle ? `<span class="song-subtitle">${escapeHtml(subtitle)}</span>` : '';

        item.innerHTML = `
            <span class="song-no">${song.listNumber || index + 1}</span>
            ${canReorder ? '<i class="bi bi-grip-vertical song-drag-handle" aria-label="Drag to reorder"></i>' : ''}
            <span class="song-copy">
                <span class="song-name">${query && !isNumberQuery ? highlightMatches(song.title, query) : escapeHtml(song.title)}</span>
                ${subtitleHtml}
                ${snippetHtml}
            </span>
            ${state.isSongEditMode ? `<span class="song-edit-action" role="button" tabindex="0" title="Edit ${escapeHtml(song.title)}"><i class="bi bi-pencil-square"></i></span>` : ''}
            ${state.isSongDeleteMode ? `<span class="song-edit-action song-delete-action" role="button" tabindex="0" title="Delete ${escapeHtml(song.title)}"><i class="bi bi-trash3"></i></span>` : ''}
        `;

        item.addEventListener('click', () => {
            if (suppressSongClick) return;
            const targetPage = lyricMatch ? lyricMatch.pageIndex : 0;
            selectSong(song.id, targetPage);
        });
        if (canReorder) {
            item.addEventListener('dragstart', event => {
                draggedSongId = String(song.id);
                item.classList.add('dragging');
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', draggedSongId);
            });
            item.addEventListener('dragover', event => {
                if (!draggedSongId || draggedSongId === String(song.id)) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                item.classList.add('drag-over');
            });
            item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
            item.addEventListener('drop', async event => {
                event.preventDefault();
                item.classList.remove('drag-over');
                const fromId = draggedSongId || event.dataTransfer.getData('text/plain');
                const toId = String(song.id);
                draggedSongId = null;
                suppressSongClick = true;
                setTimeout(() => { suppressSongClick = false; }, 250);
                if (!fromId || fromId === toId) return;

                const reorderedSongs = [...state.songs];
                const fromIndex = reorderedSongs.findIndex(entry => String(entry.id) === fromId);
                const toIndex = reorderedSongs.findIndex(entry => String(entry.id) === toId);
                if (fromIndex < 0 || toIndex < 0) return;
                const [movedSong] = reorderedSongs.splice(fromIndex, 1);
                reorderedSongs.splice(toIndex, 0, movedSong);
                state.songs = reorderedSongs.map((entry, orderIndex) => ({ ...entry, listNumber: orderIndex + 1 }));
                state.visibleSongs = state.songs;
                renderSongList();

                try {
                    const response = await fetch(`/api/lyrics/playlist/${encodeURIComponent(state.source)}/song-order`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ songIds: state.songs.map(entry => Number(entry.id)) })
                    });
                    const result = await response.json();
                    if (!response.ok || !result.success) throw new Error(result.error || 'Could not save song order');
                } catch (error) {
                    alert(error.message || 'Could not save song order');
                    await loadSongs();
                }
            });
            item.addEventListener('dragend', () => {
                draggedSongId = null;
                songListEl.querySelectorAll('.song-item').forEach(row => row.classList.remove('dragging', 'drag-over'));
            });
        }
        const editAction = item.querySelector('.song-edit-action');
        if (editAction) {
            const openEditor = (event) => {
                event.preventDefault();
                event.stopPropagation();
                window.location.href = `edit-song.html?id=${encodeURIComponent(song.id)}`;
            };
            editAction.addEventListener('click', openEditor);
            editAction.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') openEditor(event);
            });
        }
        const deleteAction = item.querySelector('.song-delete-action');
        if (deleteAction) {
            const deleteSong = async (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!window.confirm(`Delete “${song.title}” permanently?`)) return;
                try {
                    const response = await fetch(`/api/lyrics/song/${encodeURIComponent(song.id)}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (!response.ok || !result.success) throw new Error(result.error || 'Could not delete song');

                    // Never route a deletion back into the add-song/editor flow.
                    if (isSongEditorPage()) {
                        window.location.href = 'index.html';
                        return;
                    }

                    await loadSongs();
                } catch (error) {
                    alert(error.message || 'Could not delete song');
                }
            };
            deleteAction.addEventListener('click', deleteSong);
            deleteAction.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') deleteSong(event);
            });
        }
        songListEl.appendChild(item);
    });
    scrollSelectedSongIntoView();
}

// ── Search Tab (Right Panel) ───────────────────────────────────────────────

function renderPlaylistResults() {
    if (!playlistResultsEl) return;

    const query = (playlistSearchInput ? playlistSearchInput.value.trim() : '').toLowerCase();
    const searchInLyrics = searchScopeInLyricsEl ? searchScopeInLyricsEl.checked : true;

    if (!query) {
        if (searchResultsHeaderEl) {
            searchResultsHeaderEl.style.display = 'block';
            searchResultsHeaderEl.textContent = `All songs in ${state.playlistName} (${state.songs.length})`;
        }

        const initialList = state.songs.slice(0, 30);
        if (!initialList.length) {
            playlistResultsEl.innerHTML = '<div class="empty-state">No songs available in this playlist.</div>';
            return;
        }

        playlistResultsEl.innerHTML = initialList.map((song) => {
            const isActive = String(song.id) === String(state.selectedSongId);
            const pageCount = song.pages?.length || song.page_count || 1;
            return `
                <button type="button" class="playlist_result_item ${isActive ? 'active' : ''}" data-song-id="${song.id}">
                    <div class="result_title_row">
                        <span class="result_name">${escapeHtml(song.title)}</span>
                        <span class="result_badge">${pageCount} verses</span>
                    </div>
                </button>
            `;
        }).join('');

        playlistResultsEl.querySelectorAll('.playlist_result_item').forEach((button) => {
            button.addEventListener('click', () => {
                const songId = button.dataset.songId;
                if (songId) selectSong(songId, 0);
            });
        });
        return;
    }

    // Filter songs: title, subtitle, AND inside lyrics
    const results = [];
    let lyricMatchCount = 0;

    for (const song of state.songs) {
        const titleMatches = (song.title || '').toLowerCase().includes(query);
        const subtitleMatches = (song.subtitle || '').toLowerCase().includes(query);
        let lyricMatch = null;

        if (searchInLyrics) {
            lyricMatch = findLyricMatch(song, query);
        }

        if (titleMatches || subtitleMatches || lyricMatch) {
            if (lyricMatch) lyricMatchCount++;
            results.push({
                song,
                titleMatches,
                subtitleMatches,
                lyricMatch
            });
        }
    }

    if (searchResultsHeaderEl) {
        searchResultsHeaderEl.style.display = 'block';
        searchResultsHeaderEl.textContent = `Found ${results.length} songs ${lyricMatchCount > 0 ? `(${lyricMatchCount} matched inside lyrics)` : ''}`;
    }

    if (!results.length) {
        playlistResultsEl.innerHTML = `
            <div class="empty-state">
                No songs matching "<strong>${escapeHtml(query)}</strong>"${searchInLyrics ? ' in titles or lyrics' : ''}.
            </div>
        `;
        return;
    }

    playlistResultsEl.innerHTML = results.slice(0, 50).map(({ song, lyricMatch }) => {
        const isActive = String(song.id) === String(state.selectedSongId);
        const pageCount = song.pages?.length || song.page_count || 1;
        const targetPage = lyricMatch ? lyricMatch.pageIndex : 0;

        const lyricSnippetHtml = lyricMatch ? `
            <div class="result_snippet">
                <span class="result_badge">Verse ${lyricMatch.pageIndex + 1}</span>
                ${highlightMatches(lyricMatch.snippet, query)}
            </div>
        ` : '';

        return `
            <button type="button" class="playlist_result_item ${isActive ? 'active' : ''}" data-song-id="${song.id}" data-page-index="${targetPage}">
                <div class="result_title_row">
                    <span class="result_name">${highlightMatches(song.title, query)}</span>
                    <span class="result_badge">${pageCount} verses</span>
                </div>
                ${lyricSnippetHtml}
            </button>
        `;
    }).join('');

    playlistResultsEl.querySelectorAll('.playlist_result_item').forEach((button) => {
        button.addEventListener('click', () => {
            const songId = button.dataset.songId;
            const pageIndex = Number(button.dataset.pageIndex) || 0;
            if (songId) selectSong(songId, pageIndex);
        });
    });
}

// ── Verse Navigation & Current Page ────────────────────────────────────────

function renderCurrentPage() {
    const song = state.songs.find(item => String(item.id) === String(state.selectedSongId));
    const pages = song ? buildPageList(song) : [];
    const currentTextWrap = document.querySelector('.current_text_wrap');

    if (!song || !pages.length) {
        if (currentTextWrap) currentTextWrap.hidden = false;
        songTitleEl.textContent = 'No song selected';
        songSubtitleEl.textContent = '';
        songSubtitleEl.hidden = true;
        pageCounterEl.textContent = '0 / 0';
        lyricTextEl.innerHTML = '<div class="empty-state">Select a song to display.</div>';
        if (propRenameSongTitle && document.activeElement !== propRenameSongTitle) {
            propRenameSongTitle.value = '';
        }
        if (propRenameSongSubtitle && document.activeElement !== propRenameSongSubtitle) {
            propRenameSongSubtitle.value = '';
        }
        renderPreviewCards();
        return;
    }

    if (propRenameSongTitle && document.activeElement !== propRenameSongTitle) {
        propRenameSongTitle.value = song.title || '';
    }
    if (propRenameSongSubtitle && document.activeElement !== propRenameSongSubtitle) {
        propRenameSongSubtitle.value = song.subtitle || '';
    }
    if (propRenamePlaylistInput && document.activeElement !== propRenamePlaylistInput) {
        propRenamePlaylistInput.value = state.playlistName || 'Local Songs';
    }

    const rendered = pages
        .map((pageText, index) => {
            const lines = (pageText || '').split('\n').filter(Boolean);
            const verseLines = lines.map((line) => `
                <span class="verse-text">${escapeHtml(line)}</span>
            `).join('');

            return `
                <button type="button" class="verse-item ${index === state.selectedPage ? 'active' : ''}" data-page-index="${index}">
                    <span class="verse-copy">${verseLines}</span>
                </button>
            `;
        })
        .join('');

    songTitleEl.textContent = song.title;
    songSubtitleEl.textContent = song.subtitle || '';
    if (currentTextWrap) currentTextWrap.hidden = state.selectedPage === 0;
    songSubtitleEl.hidden = !song.subtitle;
    pageCounterEl.textContent = `${state.selectedPage + 1} / ${pages.length}`;
    lyricTextEl.innerHTML = rendered || '<div class="empty-state">No text for this page</div>';

    lyricTextEl.querySelectorAll('.verse-item').forEach((item) => {
        item.addEventListener('click', () => {
            const idx = Number(item.dataset.pageIndex || 0);
            if (Number.isNaN(idx)) return;
            if (idx === state.selectedPage) return;
            state.selectedPage = idx;
            renderCurrentPage();
            emitLyricsState();
        });
    });

    renderPreviewCards();
}

// ── Song Loading & Selection ───────────────────────────────────────────────

async function loadSongs(preferredSongId = null, { emit = true, targetPage = 0 } = {}) {
    const q = searchInput ? searchInput.value.trim() : '';
    const numberQuery = /^\d+$/.test(q) ? Number(q) : null;
    const isNumberQuery = Number.isSafeInteger(numberQuery) && numberQuery > 0;
    const url = new URL('/api/lyrics/songs', window.location.origin);
    url.searchParams.set('source', state.source);
    url.searchParams.set('sort', state.sort);

    try {
        const response = await fetch(url);
        const songs = await response.json();
        state.songs = songs.map((song, index) => ({
            ...song,
            pages: buildPageList(song),
            listNumber: index + 1
        }));
        if (isNumberQuery) {
            state.visibleSongs = state.songs;
        } else if (q) {
            const query = q.toLowerCase();
            state.visibleSongs = state.songs.filter(song =>
                (song.title || '').toLowerCase().includes(query) ||
                (song.subtitle || '').toLowerCase().includes(query) ||
                (song.lyrics || '').toLowerCase().includes(query)
            );
        } else {
            state.visibleSongs = state.songs;
        }

        if (q) {
            renderSongList();
            renderPlaylistResults();
            if (isNumberQuery) {
                const targetItem = songListEl.querySelectorAll('.song-item')[numberQuery - 1];
                if (targetItem) {
                    const listRect = songListEl.getBoundingClientRect();
                    const targetRect = targetItem.getBoundingClientRect();
                    const targetScrollTop = songListEl.scrollTop + targetRect.top - listRect.top - (songListEl.clientHeight - targetRect.height) / 2;
                    animateSongListScroll(targetScrollTop);
                    targetItem.classList.remove('search-target');
                    void targetItem.offsetWidth;
                    targetItem.classList.add('search-target');
                    const targetNumber = targetItem.querySelector('.song-no');
                    if (targetNumber) {
                        targetNumber.classList.remove('search-target-number');
                        void targetNumber.offsetWidth;
                        targetNumber.classList.add('search-target-number');
                    }
                }
            }
            return;
        }

        if (!state.songs.length) {
            state.selectedSongId = null;
            state.selectedPage = 0;
            renderSongList();
            renderCurrentPage();
            renderPlaylistResults();
            if (emit) emitLyricsState();
            return;
        }

        const preferredSong = preferredSongId
            ? state.songs.find(item => String(item.id) === String(preferredSongId))
            : null;
        const previouslySelected = state.songs.find(item => String(item.id) === String(state.selectedSongId));
        if (preferredSong) {
            state.selectedSongId = preferredSong.id;
            state.selectedPage = Math.max(0, Math.min(preferredSong.pages.length - 1, targetPage));
        } else if (!previouslySelected) {
            state.selectedSongId = state.songs[0].id;
            state.selectedPage = 0;
        } else {
            state.selectedPage = Math.min(
                state.selectedPage,
                Math.max(0, (previouslySelected.pages?.length || 1) - 1)
            );
        }

        renderSongList();
        renderCurrentPage();
        renderPlaylistResults();
        if (emit) emitLyricsState();
    } catch (err) {
        console.error('Failed to load songs:', err);
    }
}

async function loadSongById(songId, targetPage = 0) {
    try {
        const response = await fetch(`/api/lyrics/song/${songId}`);
        const song = await response.json();
        const index = state.songs.findIndex(item => String(item.id) === String(songId));
        const songWithPages = { ...song, pages: buildPageList(song) };

        if (index >= 0) {
            state.songs[index] = songWithPages;
        } else {
            state.songs.unshift(songWithPages);
        }

        state.selectedSongId = song.id;
        state.selectedPage = Math.max(0, Math.min((songWithPages.pages?.length || 1) - 1, targetPage));

        renderSongList();
        renderCurrentPage();
        renderPlaylistResults();
        emitLyricsState();
    } catch (err) {
        console.error(`Failed to load song ${songId}:`, err);
    }
}

async function selectSong(songId, targetPage = 0) {
    state.selectedSongId = songId;

    const found = state.songs.find(item => String(item.id) === String(songId));
    if (found && found.pages && found.pages.length) {
        state.selectedPage = Math.max(0, Math.min(found.pages.length - 1, targetPage));
        renderSongList();
        renderCurrentPage();
        renderPlaylistResults();
        emitLyricsState();
        return;
    }
    await loadSongById(songId, targetPage);
}

function changePage(delta) {
    const song = state.songs.find(item => String(item.id) === String(state.selectedSongId));
    if (!song) return;
    const pages = buildPageList(song);
    if (!pages.length) return;

    if (delta > 0 && state.selectedPage >= pages.length - 1) {
        // loop around if auto-advancing
        if (state.settings.autoAdvance) {
            state.selectedPage = 0;
        } else {
            scrollSelectedSongIntoView();
            return;
        }
    } else {
        state.selectedPage = Math.max(0, Math.min(pages.length - 1, state.selectedPage + delta));
    }

    renderCurrentPage();
    scrollSelectedSongIntoView();
    emitLyricsState();
}

function setShowButton(nextState) {
    state.isVisible = nextState;
    if (btnShow) {
        btnShow.classList.toggle('active', nextState);
        btnShow.innerHTML = `<i class="bi bi-eye${nextState ? '-fill' : ''}"></i> ${nextState ? 'Hide' : 'Show'}`;
    }
    emitLyricsState();
}

// ── Auto-Advance Automation ────────────────────────────────────────────────

function updateAutoAdvance() {
    if (autoAdvanceTimer) {
        clearInterval(autoAdvanceTimer);
        autoAdvanceTimer = null;
    }

    if (state.settings.autoAdvance) {
        const delayMs = Math.max(1, state.settings.advanceDelay) * 1000;
        autoAdvanceTimer = setInterval(() => {
            changePage(1);
        }, delayMs);
    }
}

// ── Preferences Persistence ────────────────────────────────────────────────

function savePreferences() {
    try {
        localStorage.setItem('lyrics_properties', JSON.stringify(state.properties));
        localStorage.setItem('lyrics_settings', JSON.stringify(state.settings));
    } catch (e) {
        // ignore
    }
}

function loadPreferences() {
    try {
        const savedProps = localStorage.getItem('lyrics_properties');
        if (savedProps) {
            Object.assign(state.properties, JSON.parse(savedProps));
        }
        const savedSettings = localStorage.getItem('lyrics_settings');
        if (savedSettings) {
            Object.assign(state.settings, JSON.parse(savedSettings));
        }
    } catch (e) {
        // ignore
    }

    // Sync UI with loaded preferences
    syncPropertyUI();

    if (settingAutoAdvanceEl) settingAutoAdvanceEl.checked = state.settings.autoAdvance;
    if (settingAdvanceDelayEl) settingAdvanceDelayEl.value = state.settings.advanceDelay;
    if (settingBgColorEl) settingBgColorEl.value = state.settings.bgColor;
    if (settingScreenEl) settingScreenEl.value = state.settings.screen;
    if (settingTransitionEl) settingTransitionEl.value = state.settings.transition;

    updateAutoAdvance();
}

function syncPropertyUI() {
    const p = state.properties;
    if (propFontSizeEl) propFontSizeEl.value = p.fontSize;
    if (propFontColorEl) propFontColorEl.value = p.fontColor;
    if (propTitleColorEl) propTitleColorEl.value = p.titleColor;
    if (propChorusColorEl) propChorusColorEl.value = p.chorusColor;
    if (propMonitorFontSizeEl) propMonitorFontSizeEl.value = p.monitorFontSize;
    propMonitorTypeEls.forEach(radio => {
        radio.checked = (radio.value === p.monitorType);
    });

    // Main BG
    const mainTypeEl = document.getElementById('main_bg_type');
    if (mainTypeEl) mainTypeEl.value = p.mainBgType || 'gradient';
    showSections(mainSections, p.mainBgType || 'gradient');
    const mainColorEl = document.getElementById('main_bg_color');
    if (mainColorEl) mainColorEl.value = p.mainBgColor || '#0d1320';
    const mainC1 = document.getElementById('main_grad_c1');
    if (mainC1) mainC1.value = p.mainGradC1 || '#0d1320';
    const mainC2 = document.getElementById('main_grad_c2');
    if (mainC2) mainC2.value = p.mainGradC2 || '#182235';
    const mainC3 = document.getElementById('main_grad_c3');
    if (mainC3) mainC3.value = p.mainGradC3 || '#0f172a';
    setRange('main_grad_angle', 'main_grad_angle_val', p.mainGradAngle ?? 135, 'deg');
    const mainImgEl = document.getElementById('main_img_url');
    if (mainImgEl) mainImgEl.value = p.mainImgUrl ? p.mainImgUrl.split('/').pop() : '';
    const mainFitEl = document.getElementById('main_img_fit');
    if (mainFitEl) mainFitEl.value = p.mainImgFit || 'cover';
    const mainVidEl = document.getElementById('main_vid_url');
    if (mainVidEl) mainVidEl.value = p.mainVidUrl ? p.mainVidUrl.split('/').pop() : '';
    setRange('main_bg_opacity', 'main_bg_opacity_val', p.mainBgOpacity ?? 100, '%');
    setRange('main_bg_blur', 'main_bg_blur_val', p.mainBgBlur ?? 0, 'px');

    // Mini BG
    const miniShowEl = document.getElementById('mini_bg_show');
    if (miniShowEl) miniShowEl.checked = p.miniBgShow !== false;
    const miniTypeEl = document.getElementById('mini_bg_type');
    if (miniTypeEl) miniTypeEl.value = p.miniBgType || 'color';
    showSections(miniSections, p.miniBgType || 'color');
    const miniColorEl = document.getElementById('mini_bg_color');
    if (miniColorEl) miniColorEl.value = p.miniBgColor || '#141e2d';
    const op = p.miniBgOpacity ?? 85;
    setRange('mini_bg_opacity', 'mini_bg_opacity_val', op, '%');
    setRange('mini_bg_opacity_grad', 'mini_bg_opacity_grad_val', op, '%');
    setRange('mini_bg_opacity_img', 'mini_bg_opacity_img_val', op, '%');
    setRange('mini_bg_opacity_vid', 'mini_bg_opacity_vid_val', op, '%');
    const gradC1 = document.getElementById('grad_color1');
    if (gradC1) gradC1.value = p.gradColor1 || '#1a1a2e';
    const gradC2 = document.getElementById('grad_color2');
    if (gradC2) gradC2.value = p.gradColor2 || '#16213e';
    const gradC3 = document.getElementById('grad_color3');
    if (gradC3) gradC3.value = p.gradColor3 || '#0f3460';
    setRange('grad_angle', 'grad_angle_val', p.gradAngle ?? 135, 'deg');
    const miniImgEl = document.getElementById('bg_image_url');
    if (miniImgEl) miniImgEl.value = p.bgImageUrl ? p.bgImageUrl.split('/').pop() : '';
    const imgFitEl = document.getElementById('img_fit');
    if (imgFitEl) imgFitEl.value = p.imgFit || 'cover';
    const miniVidEl = document.getElementById('bg_video_url');
    if (miniVidEl) miniVidEl.value = p.bgVideoUrl ? p.bgVideoUrl.split('/').pop() : '';
    setRange('mini_bg_radius', 'mini_bg_radius_val', p.miniBgRadius ?? 18, 'px');
    setRange('mini_bg_blur', 'mini_bg_blur_val', p.miniBgBlur ?? 0, 'px');
    setRange('mini_padding_x', 'mini_padding_x_val', p.miniPaddingX ?? 40, 'px');
    setRange('mini_padding_y', 'mini_padding_y_val', p.miniPaddingY ?? 26, 'px');
}

// ── Song & Playlist Rename Operations ──────────────────────────────────────

async function handleRenameSong() {
    const song = state.songs.find(item => String(item.id) === String(state.selectedSongId));
    if (!song) {
        alert('Please select a song first to rename.');
        return;
    }

    const newTitle = propRenameSongTitle ? propRenameSongTitle.value.trim() : '';
    const newSubtitle = propRenameSongSubtitle ? propRenameSongSubtitle.value.trim() : '';

    if (!newTitle) {
        alert('Song title cannot be empty.');
        if (propRenameSongTitle) propRenameSongTitle.focus();
        return;
    }

    try {
        if (btnRenameSong) {
            btnRenameSong.disabled = true;
            btnRenameSong.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving…';
        }

        const response = await fetch(`/api/lyrics/song/${song.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle, subtitle: newSubtitle })
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Failed to rename song');
        }

        song.title = newTitle;
        song.subtitle = newSubtitle;
        if (result.song) {
            Object.assign(song, result.song, { pages: buildPageList(result.song) });
        }

        renderSongList();
        renderCurrentPage();
        renderPlaylistResults();
        emitLyricsState();

        if (btnRenameSong) {
            btnRenameSong.classList.add('success');
            btnRenameSong.innerHTML = '<i class="bi bi-check-lg"></i> Renamed!';
            setTimeout(() => {
                btnRenameSong.classList.remove('success');
                btnRenameSong.disabled = false;
                btnRenameSong.innerHTML = '<i class="bi bi-pencil"></i> Rename Song';
            }, 1800);
        }
    } catch (err) {
        console.error('Rename song error:', err);
        alert(err.message || 'Error renaming song');
        if (btnRenameSong) {
            btnRenameSong.disabled = false;
            btnRenameSong.innerHTML = '<i class="bi bi-pencil"></i> Rename Song';
        }
    }
}

// ── Database-Level Playlist Operations ─────────────────────────────────────

function applyPlaylists(playlists) {
    if (!Array.isArray(playlists) || !playlists.length) return;
    state.playlists = playlists;

    if (sourceSelect) {
        const prevValue = state.source;
        sourceSelect.innerHTML = playlists.map(p => `
            <option value="${escapeHtml(p.source_key)}" ${p.source_key === prevValue ? 'selected' : ''}>
                ${escapeHtml(p.name)}
            </option>
        `).join('');

        if (sourceSelect.value) {
            state.source = sourceSelect.value;
        }
    }

    const currentPl = playlists.find(p => p.source_key === state.source) || playlists[0];
    if (currentPl) {
        state.playlistName = currentPl.name;
        if (playlistNameInput) playlistNameInput.value = state.playlistName;
        if (propRenamePlaylistInput) propRenamePlaylistInput.value = state.playlistName;
    }
}

async function loadPlaylists() {
    try {
        const response = await fetch('/api/lyrics/playlists');
        const playlists = await response.json();
        applyPlaylists(playlists);
    } catch (err) {
        console.error('Failed to load playlists from DB:', err);
    }
}

function populatePlaylistChoices(selectedSource = state.source) {
    const options = state.playlists.map(({ source_key, name }) =>
        `<option value="${escapeHtml(source_key)}">${escapeHtml(name)}</option>`
    ).join('');
    [newSongPlaylist, importPlaylist].forEach(select => {
        if (!select) return;
        select.innerHTML = options;
        if (select.querySelector(`option[value="${CSS.escape(selectedSource)}"]`)) select.value = selectedSource;
    });
}

function closeLibraryModal() {
    if (libraryModalOverlay) libraryModalOverlay.hidden = true;
    if (excelImportSummary) excelImportSummary.hidden = true;
    if (playlistJsonImportSummary) playlistJsonImportSummary.hidden = true;
    if (pptReviewSummary) pptReviewSummary.hidden = true;
}

function saveActiveSongSlide() {
    if (songSlideText) songEditorSlides[activeSongEditorSlide] = songSlideText.value;
}

function renderSongSlideEditor() {
    if (!songSlideList || !songSlideText) return;
    songSlideList.innerHTML = songEditorSlides.map((text, index) => {
        const preview = text.trim().replace(/\s+/g, ' ') || 'Empty slide';
        return `<button type="button" class="song_slide_item ${index === activeSongEditorSlide ? 'active' : ''}" data-slide-index="${index}">
            Slide ${index + 1}<small>${escapeHtml(preview)}</small></button>`;
    }).join('');
    songSlideList.querySelectorAll('.song_slide_item').forEach(button => button.addEventListener('click', () => {
        saveActiveSongSlide();
        activeSongEditorSlide = Number(button.dataset.slideIndex);
        renderSongSlideEditor();
    }));
    songSlideText.value = songEditorSlides[activeSongEditorSlide] || '';
    if (songSlideLabel) songSlideLabel.textContent = `Slide ${activeSongEditorSlide + 1}`;
    if (btnSongDeleteSlide) btnSongDeleteSlide.disabled = songEditorSlides.length === 1;
}

function resetSongSlideEditor() {
    songEditorSlides = [''];
    activeSongEditorSlide = 0;
    renderSongSlideEditor();
}

function openLibraryModal(kind) {
    if (!libraryModalOverlay) return;
    if (addMenu) addMenu.hidden = true;
    populatePlaylistChoices();
    playlistForm.hidden = kind !== 'playlist';
    if (songForm) songForm.hidden = kind !== 'song';
    excelImportForm.hidden = kind !== 'import';
    if (playlistJsonImportForm) playlistJsonImportForm.hidden = true;
    if (pptReviewForm) pptReviewForm.hidden = true;
    libraryModalTitle.textContent = kind === 'playlist' ? 'Add Playlist' : kind === 'song' ? 'Add Song' : 'Import Songs from Excel or TXT';
    libraryModalOverlay.hidden = false;
    const focusTarget = kind === 'playlist' ? newPlaylistName : kind === 'song' ? newSongTitle : excelFile;
    setTimeout(() => focusTarget?.focus(), 0);
}

async function createSong({ source, title, subtitle, lyrics }) {
    const response = await fetch('/api/lyrics/songs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, title, subtitle, lyrics })
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Could not add song');
    return result.song;
}

function readExcelSongs(file) {
    return new Promise((resolve, reject) => {
        if (!window.XLSX) return reject(new Error('Excel importer is unavailable. Refresh this page and try again.'));
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read the selected file'));
        reader.onload = (event) => {
            try {
                const workbook = XLSX.read(event.target.result, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, blankrows: true });
                const normalizeKey = key => String(key).toLowerCase().replace(/[^a-z]/g, '');
                const headers = (rows[0] || []).map(normalizeKey);
                const titleColumn = headers.findIndex(key => ['title', 'songtitle', 'name'].includes(key));
                const subtitleColumn = headers.findIndex(key => ['subtitle', 'origin', 'artist'].includes(key));
                const lyricsColumn = headers.findIndex(key => ['lyrics', 'lyric', 'text', 'words'].includes(key));
                let songs;

                if (titleColumn >= 0 && lyricsColumn >= 0) {
                    songs = rows.slice(1).map(row => ({
                        title: String(row[titleColumn] || '').trim(),
                        subtitle: subtitleColumn >= 0 ? String(row[subtitleColumn] || '').trim() : '',
                        lyrics: String(row[lyricsColumn] || '').replace(/\r\n?/g, '\n').trim()
                    })).filter(song => song.title && song.lyrics);
                } else {
                    const title = String(rows[0]?.[0] || '').trim();
                    const subtitle = String(rows[1]?.[0] || '').trim();
                    const lyrics = rows.slice(2)
                        .map(row => String(row[0] || '').replace(/\r\n?/g, '\n').trim())
                        .join('\n')
                        .replace(/\n(?:[ \t]*\n){2,}/g, '\n\n')
                        .trim();
                    songs = title && lyrics ? [{ title, subtitle, lyrics }] : [];
                }

                resolve({ songs, totalRows: rows.length });
            } catch (error) { reject(new Error('This file could not be read as an Excel workbook')); }
        };
        reader.readAsArrayBuffer(file);
    });
}

async function readTxtSongs(file) {
    const text = (await file.text()).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const blocks = text.split(/^\s*\/end\s*$/gim);
    const songs = blocks.map(block => {
        const lines = block.split('\n');
        const titleIndex = lines.findIndex(line => line.trim());
        if (titleIndex < 0) return null;
        const title = lines[titleIndex].trim();
        const subtitleIndex = lines.findIndex((line, index) => index > titleIndex && line.trim());
        if (subtitleIndex < 0) return null;
        const subtitle = lines[subtitleIndex].trim();
        const lyrics = lines.slice(subtitleIndex + 1).join('\n').trim();
        return title && lyrics ? { title, subtitle, lyrics } : null;
    }).filter(Boolean);

    return { songs, totalRows: blocks.length };
}

async function readImportedSongs(file) {
    if (/\.pptx$/i.test(file.name)) return readPptxSongs(file);
    if (/\.pdf$/i.test(file.name)) return readPdfSongs(file);
    return /\.txt$/i.test(file.name) ? readTxtSongs(file) : readExcelSongs(file);
}

// ── PowerPoint (.pptx) import ──────────────────────────────────────────────

function decodeXmlEntities(text) {
    return String(text || '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/&amp;/g, '&');
}

function extractPptxSlideText(slideXml) {
    const paragraphs = [];
    // Collect all <a:p> paragraph blocks in document order
    const paraBlocks = slideXml.match(/<a:p(\s[^>]*)?>[\s\S]*?<\/a:p>/g) || [];
    for (const block of paraBlocks) {
        const runs = block.match(/<a:t>([\s\S]*?)<\/a:t>/g) || [];
        const line = runs.map(run => decodeXmlEntities(run.replace(/<\/?a:t>/g, ''))).join('');
        paragraphs.push(line);
    }
    return paragraphs.join('\n');
}

function readPptxSongs(file) {
    return new Promise((resolve, reject) => {
        if (!window.JSZip) return reject(new Error('PowerPoint importer is unavailable. Refresh this page and try again.'));
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read the selected file'));
        reader.onload = async (event) => {
            try {
                const zip = await JSZip.loadAsync(event.target.result);
                const slideFiles = Object.keys(zip.files)
                    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
                    .sort((a, b) => {
                        const num = name => Number(name.match(/slide(\d+)\.xml$/)[1]);
                        return num(a) - num(b);
                    });
                if (!slideFiles.length) throw new Error('No slides found in this PowerPoint file.');

                const slides = [];
                for (const name of slideFiles) {
                    const xml = await zip.file(name).async('string');
                    const text = extractPptxSlideText(xml).replace(/\r\n?/g, '\n').trim();
                    if (text) slides.push(text);
                }
                if (!slides.length) throw new Error('All slides in this file are empty.');

                // If slide 1 looks like a title (few lines, short), use it as song title;
                // otherwise use the file name.
                const firstLines = slides[0].split('\n').filter(Boolean);
                const looksLikeTitle = firstLines.length <= 3 && slides.length > 1;
                const title = looksLikeTitle ? firstLines[0].trim() : file.name.replace(/\.pptx$/i, '');
                const subtitle = looksLikeTitle && firstLines[1] ? firstLines[1].trim() : '';
                const lyricSlides = looksLikeTitle ? slides.slice(1) : slides;
                const lyrics = lyricSlides.join('\n\n');

                resolve({ songs: [{ title, subtitle, lyrics }], totalRows: slides.length });
            } catch (error) {
                reject(error instanceof Error ? error : new Error('This file could not be read as a PowerPoint presentation'));
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

// Strips raw PDF syntax that sometimes leaks into extracted text
// (object references like /F5 5 0 R, dictionaries like /MediaBox [0 0 794 595], operators, etc.)
function isPdfJunkLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return true;
    // Starts with a PDF name token followed by object refs/values: /F5 5 0 R, /Contents 16 0 R, /Tabs /S
    if (/^\/[A-Za-z][A-Za-z0-9]*\s+(?:\d+\s+\d+\s+R|\[|[\/(<]|\d+(?:\.\d+)?|true|false|null)/.test(trimmed)) return true;
    // Pure PDF operators / structure tokens
    if (/^(?:obj|endobj|stream|endstream|xref|trailer|startxref|%%EOF|<<|>>|\[|\])/.test(trimmed)) return true;
    // Mostly PDF object-reference noise, e.g. "/F9 9 0 R>>>>"
    const refs = trimmed.match(/\/[A-Za-z][A-Za-z0-9]*(?:\s+\d+\s+\d+\s+R|\s+\/S\b)/g);
    const words = trimmed.replace(/\/[A-Za-z][A-Za-z0-9]*/g, '').replace(/[\d\s<>\[\](){}\/R]/g, '');
    if (refs && refs.length >= 1 && words.length < 3) return true;
    // Lines that are almost entirely PDF syntax characters
    if (words.length === 0 && trimmed.length < 60) return true;
    return false;
}

function sanitizePdfLine(line) {
    let out = String(line || '');
    // Remove inline object references like /F5 5 0 R or /StructParents 4 (keep readable words)
    out = out.replace(/\/[A-Za-z][A-Za-z0-9]*(?:\s+\d+\s+\d+\s+R)+/g, '');
    out = out.replace(/\/[A-Za-z][A-Za-z0-9]*\s+\d+\s+\d+\s+R/g, '');
    // Remove dictionary key markers like /MediaBox /Contents /Tabs when followed by values
    out = out.replace(/\/[A-Za-z][A-Za-z0-9]*(?=\s+[\[\(<\d\/])/g, '');
    // Remove stray PDF syntax characters
    out = out.replace(/[<>\[\]{}]/g, '');
    out = out.replace(/\b(?:obj|endobj|stream|endstream|xref|trailer|startxref)\b/g, '');
    return out.replace(/[ \t]+/g, ' ').trim();
}

function readPdfSongs(file) {
    return new Promise((resolve, reject) => {
        if (!window.pdfjsLib) return reject(new Error('PDF importer is unavailable. Refresh this page and try again.'));
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read the selected file'));
        reader.onload = async (event) => {
            try {
                pdfjsLib.GlobalWorkerOptions.workerSrc = '/plugin/presenter/vendor/pdf.worker.min.js';
                const doc = await pdfjsLib.getDocument({ data: new Uint8Array(event.target.result) }).promise;
                if (!doc.numPages) throw new Error('No pages found in this PDF file.');

                const pages = [];
                for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
                    const page = await doc.getPage(pageNum);
                    const content = await page.getTextContent();
                    // Group text items into lines using their vertical position
                    const lines = [];
                    let currentY = null;
                    let currentLine = [];
                    for (const item of content.items) {
                        if (typeof item.str !== 'string') continue;
                        const y = item.transform ? Math.round(item.transform[5]) : 0;
                        if (currentY === null || Math.abs(y - currentY) <= 2) {
                            currentLine.push(item.str);
                            currentY = currentY === null ? y : currentY;
                        } else {
                            lines.push(currentLine.join(' '));
                            currentLine = [item.str];
                            currentY = y;
                        }
                    }
                    if (currentLine.length) lines.push(currentLine.join(' '));
                    const cleaned = lines.map(sanitizePdfLine).filter(Boolean);
                    const text = cleaned.join('\n').replace(/\r\n?/g, '\n').trim();
                    if (text) pages.push(text);
                }
                if (!pages.length) throw new Error('All pages in this PDF are empty or contain no selectable text. Scanned PDFs are not supported.');

                const fileName = file.name.replace(/\.pdf$/i, '');
                // If page 1 looks like a title (few lines, short), use it as song title;
                // otherwise use the file name.
                const firstLines = pages[0].split('\n').filter(Boolean);
                const looksLikeTitle = firstLines.length <= 3 && pages.length > 1;
                const title = looksLikeTitle ? firstLines[0].trim() : fileName;
                const subtitle = looksLikeTitle && firstLines[1] ? firstLines[1].trim() : '';
                const lyricPages = looksLikeTitle ? pages.slice(1) : pages;
                const lyrics = lyricPages.join('\n\n');

                resolve({ songs: [{ title, subtitle, lyrics }], totalRows: pages.length });
            } catch (error) {
                reject(error instanceof Error ? error : new Error('This file could not be read as a PDF document'));
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

// ── PPT review-before-save flow ───────────────────────────────────────────

function openPptReview(songs, source) {
    pptReviewSongs = songs.map(song => ({ ...song, source }));
    renderPptReview();
    if (excelImportForm) excelImportForm.hidden = true;
    if (pptReviewForm) pptReviewForm.hidden = false;
    if (libraryModalTitle) libraryModalTitle.textContent = 'Review Song(s) from PowerPoint';
}

function renderPptReview() {
    if (!pptReviewList) return;
    pptReviewList.innerHTML = pptReviewSongs.map((song, index) => `
        <div class="ppt_review_card" data-review-index="${index}">
            <div class="ppt_review_inputs">
                <label>Playlist
                    <select class="property_input ppt_review_playlist">${state.playlists.map(p =>
                        `<option value="${escapeHtml(p.source_key)}" ${p.source_key === song.source ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
                    ).join('')}</select>
                </label>
                <label>Title
                    <input type="text" class="property_input ppt_review_title" value="${escapeHtml(song.title)}" maxlength="200">
                </label>
                <label>Subtitle / Origin
                    <input type="text" class="property_input ppt_review_subtitle" value="${escapeHtml(song.subtitle || '')}" maxlength="200">
                </label>
                <label>Lyrics (blank lines separate the projected slides)
                    <textarea class="property_input ppt_review_lyrics">${escapeHtml(song.lyrics)}</textarea>
                </label>
            </div>
            <span class="ppt_review_meta">${song.lyrics.split(/\n\s*\n/).filter(Boolean).length} slide(s) · extracted from PowerPoint</span>
        </div>
    `).join('');

    pptReviewList.querySelectorAll('.ppt_review_card').forEach(card => {
        const index = Number(card.dataset.reviewIndex);
        card.querySelector('.ppt_review_playlist').addEventListener('change', e => { pptReviewSongs[index].source = e.target.value; });
        card.querySelector('.ppt_review_title').addEventListener('input', e => { pptReviewSongs[index].title = e.target.value; });
        card.querySelector('.ppt_review_subtitle').addEventListener('input', e => { pptReviewSongs[index].subtitle = e.target.value; });
        card.querySelector('.ppt_review_lyrics').addEventListener('input', e => { pptReviewSongs[index].lyrics = e.target.value; });
    });
}

function exportPlaylist() {
    const playlistName = state.playlists.find(playlist => playlist.source_key === state.source)?.name || state.source;
    const safeName = playlistName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').trim() || 'playlist';
    const data = {
        format: 'church-system-playlist',
        version: 1,
        playlist: {
            name: playlistName,
            songs: state.songs.map(song => ({
                title: song.title || '',
                subtitle: song.subtitle || '',
                lyrics: song.lyrics || ''
            }))
        }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function readPlaylistJson(file) {
    let data;
    try {
        data = JSON.parse(await file.text());
    } catch {
        throw new Error('The selected file is not valid JSON.');
    }
    if (data?.format !== 'church-system-playlist' || data?.version !== 1) {
        throw new Error('Choose a playlist JSON file exported from Church System.');
    }
    const name = String(data.playlist?.name || '').trim();
    const songs = data.playlist?.songs;
    if (!name || !Array.isArray(songs)) {
        throw new Error('The playlist file must include a name and songs array.');
    }
    return { name, songs };
}

async function handleRenamePlaylist() {
    const newName = propRenamePlaylistInput ? propRenamePlaylistInput.value.trim() : '';
    if (!newName) {
        alert('Playlist name cannot be empty.');
        if (propRenamePlaylistInput) propRenamePlaylistInput.focus();
        return;
    }

    try {
        if (btnRenamePlaylist) {
            btnRenamePlaylist.disabled = true;
            btnRenamePlaylist.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving to DB…';
        }

        const response = await fetch('/api/lyrics/playlist/rename', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentSource: state.source, newName })
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Failed to rename playlist in database');
        }

        // Apply updated playlists from DB to state and dropdown
        if (result.playlists) {
            applyPlaylists(result.playlists);
        } else {
            state.playlistName = newName;
            if (playlistNameInput) playlistNameInput.value = newName;
            if (propRenamePlaylistInput) propRenamePlaylistInput.value = newName;
            if (sourceSelect && sourceSelect.options[sourceSelect.selectedIndex]) {
                sourceSelect.options[sourceSelect.selectedIndex].text = newName;
            }
        }

        renderPlaylistResults();

        // Broadcast DB-level playlist update across devices
        socket.emit('sendData', {
            type: 'lyrics',
            action: 'playlist-renamed',
            data: {
                type: 'lyrics',
                action: 'playlist-renamed',
                playlists: result.playlists || state.playlists,
                source: state.source,
                playlistName: newName
            }
        });

        if (btnRenamePlaylist) {
            btnRenamePlaylist.classList.add('success');
            btnRenamePlaylist.innerHTML = '<i class="bi bi-check-lg"></i> DB Updated!';
            setTimeout(() => {
                btnRenamePlaylist.classList.remove('success');
                btnRenamePlaylist.disabled = false;
                btnRenamePlaylist.innerHTML = '<i class="bi bi-pencil-square"></i> Rename Playlist';
            }, 1800);
        }
    } catch (err) {
        console.error('Rename playlist error:', err);
        alert(err.message || 'Error renaming playlist in DB');
        if (btnRenamePlaylist) {
            btnRenamePlaylist.disabled = false;
            btnRenamePlaylist.innerHTML = '<i class="bi bi-pencil-square"></i> Rename Playlist';
        }
    }
}

// ── Event Listeners ────────────────────────────────────────────────────────

if (btnAddMenu) {
    btnAddMenu.addEventListener('click', () => { if (addMenu) addMenu.hidden = !addMenu.hidden; });
}
if (btnAddPlaylist) btnAddPlaylist.addEventListener('click', () => openLibraryModal('playlist'));
if (btnAddSong) btnAddSong.addEventListener('click', () => {
    window.location.href = 'add-song.html';
});
if (btnAddSongMix) btnAddSongMix.addEventListener('click', () => {
    window.location.href = 'song-mix.html';
});
if (btnImportExcel) btnImportExcel.addEventListener('click', () => openLibraryModal('import'));
if (btnExportPlaylist) btnExportPlaylist.addEventListener('click', exportPlaylist);
if (btnOpenPlaylistJsonImport) btnOpenPlaylistJsonImport.addEventListener('click', () => {
    excelImportForm.hidden = true;
    playlistJsonImportForm.hidden = false;
    libraryModalTitle.textContent = 'Import Playlist';
    playlistJsonImportSummary.hidden = true;
    playlistJsonFile?.focus();
});
if (btnBackToExcelImport) btnBackToExcelImport.addEventListener('click', () => {
    playlistJsonImportForm.hidden = true;
    excelImportForm.hidden = false;
    libraryModalTitle.textContent = 'Import Songs from Excel or TXT';
});
if (btnEditSongs) btnEditSongs.addEventListener('click', () => {
    state.isSongEditMode = !state.isSongEditMode;
    if (state.isSongEditMode) {
        state.isSongDeleteMode = false;
        if (btnDeleteSongs) {
            btnDeleteSongs.classList.remove('active');
            btnDeleteSongs.innerHTML = '<i class="bi bi-trash3"></i> Delete';
        }
        if (deletePlaylistActions) deletePlaylistActions.hidden = true;
    }
    btnEditSongs.classList.toggle('active', state.isSongEditMode);
    btnEditSongs.innerHTML = state.isSongEditMode
        ? '<i class="bi bi-x-lg"></i> Done'
        : '<i class="bi bi-pencil-square"></i> Edit';
    renderSongList();
});
if (btnDeleteSongs) btnDeleteSongs.addEventListener('click', () => {
    state.isSongDeleteMode = !state.isSongDeleteMode;
    if (state.isSongDeleteMode) {
        state.isSongEditMode = false;
        btnEditSongs.classList.remove('active');
        btnEditSongs.innerHTML = '<i class="bi bi-pencil-square"></i> Edit';
    }
    btnDeleteSongs.classList.toggle('active', state.isSongDeleteMode);
    btnDeleteSongs.innerHTML = state.isSongDeleteMode
        ? '<i class="bi bi-x-lg"></i> Done'
        : '<i class="bi bi-trash3"></i> Delete';
    if (deletePlaylistActions) deletePlaylistActions.hidden = !state.isSongDeleteMode;
    renderSongList();
});
if (btnDeletePlaylistSongs) btnDeletePlaylistSongs.addEventListener('click', async () => {
    const source = state.source;
    const playlistName = state.playlistName || state.source;
    btnDeletePlaylistSongs.disabled = true;
    try {
        const songsResponse = await fetch(`/api/lyrics/songs?source=${encodeURIComponent(source)}`);
        const songs = await songsResponse.json();
        if (!songsResponse.ok || !Array.isArray(songs)) {
            throw new Error(songs.error || 'Could not count songs in this playlist');
        }
        if (!songs.length) {
            alert(`There are no songs in "${playlistName}".`);
            return;
        }
        if (!window.confirm(`Delete all ${songs.length} songs from "${playlistName}"? This cannot be undone.`)) return;

        const response = await fetch(`/api/lyrics/playlist/${encodeURIComponent(source)}/songs`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Could not delete playlist songs');
        state.selectedSongId = null;
        state.selectedPage = 0;
        state.isSongDeleteMode = false;
        btnDeleteSongs?.classList.remove('active');
        if (btnDeleteSongs) btnDeleteSongs.innerHTML = '<i class="bi bi-trash3"></i> Delete';
        if (deletePlaylistActions) deletePlaylistActions.hidden = true;
        await loadSongs();
        alert(`${result.deletedCount} song${result.deletedCount === 1 ? '' : 's'} deleted from "${playlistName}".`);
    } catch (error) {
        alert(error.message || 'Could not delete playlist songs');
    } finally {
        btnDeletePlaylistSongs.disabled = false;
    }
});
if (songSlideText) songSlideText.addEventListener('input', saveActiveSongSlide);
if (btnSongAddSlide) btnSongAddSlide.addEventListener('click', () => {
    saveActiveSongSlide();
    songEditorSlides.push('');
    activeSongEditorSlide = songEditorSlides.length - 1;
    renderSongSlideEditor();
    songSlideText?.focus();
});
if (btnSongDeleteSlide) btnSongDeleteSlide.addEventListener('click', () => {
    if (songEditorSlides.length === 1) return;
    songEditorSlides.splice(activeSongEditorSlide, 1);
    activeSongEditorSlide = Math.min(activeSongEditorSlide, songEditorSlides.length - 1);
    renderSongSlideEditor();
});
if (libraryModalClose) libraryModalClose.addEventListener('click', closeLibraryModal);
if (libraryModalOverlay) libraryModalOverlay.addEventListener('click', (event) => {
    if (event.target === libraryModalOverlay) closeLibraryModal();
});

if (playlistForm) playlistForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = newPlaylistName?.value.trim();
    if (!name) return;
    try {
        const response = await fetch('/api/lyrics/playlist', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name })
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Could not create playlist');
        state.source = result.playlist.source_key;
        applyPlaylists(result.playlists);
        if (sourceSelect) sourceSelect.value = state.source;
        newPlaylistName.value = '';
        closeLibraryModal();
        await loadSongs();
    } catch (error) { alert(error.message); }
});

if (songForm) songForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
        saveActiveSongSlide();
        const lyrics = songEditorSlides.map(slide => slide.trim()).filter(Boolean).join('\n\n');
        if (!lyrics) throw new Error('Add lyrics to at least one slide.');
        const song = await createSong({
            source: newSongPlaylist.value, title: newSongTitle.value.trim(),
            subtitle: newSongSubtitle.value.trim(), lyrics
        });
        const shouldLoad = song.source === state.source;
        songForm.reset();
        resetSongSlideEditor();
        closeLibraryModal();
        if (shouldLoad) await loadSongs();
    } catch (error) { alert(error.message); }
});

if (excelImportForm) excelImportForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = excelFile?.files?.[0];
    if (!file) return;
    // PowerPoint and PDF files go to a review step before saving
    if (/\.(pptx|pdf)$/i.test(file.name)) {
        try {
            const { songs } = await readImportedSongs(file);
            if (!songs.length) throw new Error(/\.pdf$/i.test(file.name)
                ? 'No readable pages found in this PDF file.'
                : 'No readable slides found in this PowerPoint file.');
            openPptReview(songs, importPlaylist.value);
        } catch (error) {
            if (excelImportSummary) { excelImportSummary.hidden = false; excelImportSummary.textContent = error.message; }
            else alert(error.message);
        }
        return;
    }
    try {
        const { songs, totalRows } = await readImportedSongs(file);
        if (!songs.length) throw new Error(/\.txt$/i.test(file.name)
            ? 'No songs found. Each TXT song needs a title, singer/subtitle, lyrics, and an /end separator.'
            : 'No valid songs found. Include Title and Lyrics columns.');
        if (excelImportSummary) {
            excelImportSummary.hidden = false;
            excelImportSummary.textContent = `Importing ${songs.length} song(s) from ${totalRows} row(s)…`;
        }
        const targetSource = importPlaylist.value;
        const results = [];
        for (const song of songs) {
            try {
                results.push({
                    status: 'fulfilled',
                    value: await createSong({ ...song, source: targetSource })
                });
            } catch (reason) {
                results.push({ status: 'rejected', reason });
            }
        }
        const added = results.filter(item => item.status === 'fulfilled').length;
        const skipped = results.length - added;
        if (!added) throw new Error(results[0]?.reason?.message || 'No songs were imported');
        excelImportForm.reset();
        closeLibraryModal();
        if (targetSource === state.source) await loadSongs();
        alert(`${added} song${added === 1 ? '' : 's'} imported${skipped ? `; ${skipped} skipped (usually duplicate titles).` : '.'}`);
    } catch (error) {
        if (excelImportSummary) { excelImportSummary.hidden = false; excelImportSummary.textContent = error.message; }
        else alert(error.message);
    }
});

if (pptReviewForm) pptReviewForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const valid = pptReviewSongs.filter(song => song.title.trim() && song.lyrics.trim());
    if (!valid.length) {
        if (pptReviewSummary) { pptReviewSummary.hidden = false; pptReviewSummary.textContent = 'Each song needs a title and lyrics.'; }
        return;
    }
    try {
        if (pptReviewSummary) { pptReviewSummary.hidden = false; pptReviewSummary.textContent = `Saving ${valid.length} song(s)…`; }
        const results = [];
        for (const song of valid) {
            try {
                results.push({ status: 'fulfilled', value: await createSong({ ...song }) });
            } catch (reason) {
                results.push({ status: 'rejected', reason });
            }
        }
        const added = results.filter(item => item.status === 'fulfilled').length;
        const skipped = results.length - added;
        if (!added) throw new Error(results[0]?.reason?.message || 'No songs were saved');
        const targetSource = valid[0].source;
        pptReviewForm.reset();
        pptReviewSongs = [];
        excelImportForm.reset();
        closeLibraryModal();
        if (targetSource === state.source) await loadSongs();
        alert(`${added} song${added === 1 ? '' : 's'} saved${skipped ? `; ${skipped} skipped (usually duplicate titles).` : '.'}`);
    } catch (error) {
        if (pptReviewSummary) { pptReviewSummary.hidden = false; pptReviewSummary.textContent = error.message; }
        else alert(error.message);
    }
});

if (btnBackToPptPick) btnBackToPptPick.addEventListener('click', () => {
    if (pptReviewForm) pptReviewForm.hidden = true;
    if (excelImportForm) excelImportForm.hidden = false;
    if (libraryModalTitle) libraryModalTitle.textContent = 'Import Songs from Excel or TXT';
});

if (playlistJsonImportForm) playlistJsonImportForm.addEventListener('submit', async event => {
    event.preventDefault();
    const file = playlistJsonFile?.files?.[0];
    if (!file) return;

    try {
        const playlist = await readPlaylistJson(file);
        playlistJsonImportSummary.hidden = false;
        playlistJsonImportSummary.textContent = `Importing ${playlist.songs.length} song(s) from “${playlist.name}”…`;
        const response = await fetch('/api/lyrics/playlist/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(playlist)
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Could not import playlist');

        applyPlaylists(result.playlists);
        state.source = result.playlist.source_key;
        state.playlistName = result.playlist.name;
        if (sourceSelect) sourceSelect.value = state.source;
        if (playlistNameInput) playlistNameInput.value = state.playlistName;
        if (propRenamePlaylistInput) propRenamePlaylistInput.value = state.playlistName;
        playlistJsonImportForm.reset();
        closeLibraryModal();
        await loadSongs();
        alert(`Imported playlist “${result.playlist.name}” with ${result.importedCount} song(s).`);
    } catch (error) {
        playlistJsonImportSummary.hidden = false;
        playlistJsonImportSummary.textContent = error.message;
    }
});

if (sourceSelect) {
    sourceSelect.addEventListener('change', (event) => {
        state.source = event.target.value;
        const currentPl = state.playlists.find(p => p.source_key === state.source);
        const selectedLabel = currentPl ? currentPl.name : (sourceSelect.options[sourceSelect.selectedIndex]?.text || 'Local Songs');

        state.playlistName = selectedLabel;
        if (playlistNameInput) playlistNameInput.value = state.playlistName;
        if (propRenamePlaylistInput) propRenamePlaylistInput.value = state.playlistName;
        loadSongs();
    });
}

if (sortSelect) {
    sortSelect.addEventListener('change', (event) => {
        state.sort = event.target.value;
        loadSongs();
    });
}

if (searchInput) {
    searchInput.addEventListener('input', () => {
        loadSongs();
    });
}

if (playlistNameInput) {
    playlistNameInput.addEventListener('input', (event) => {
        state.playlistName = event.target.value.trim() || 'Local Songs';
        if (propRenamePlaylistInput) propRenamePlaylistInput.value = state.playlistName;
        renderPlaylistResults();
    });
}

if (propRenamePlaylistInput) {
    propRenamePlaylistInput.addEventListener('input', (event) => {
        state.playlistName = event.target.value.trim() || 'Local Songs';
        if (playlistNameInput) playlistNameInput.value = state.playlistName;
    });
    propRenamePlaylistInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleRenamePlaylist();
        }
    });
}

if (btnRenamePlaylist) {
    btnRenamePlaylist.addEventListener('click', handleRenamePlaylist);
}

if (propRenameSongTitle) {
    propRenameSongTitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleRenameSong();
        }
    });
}

if (propRenameSongSubtitle) {
    propRenameSongSubtitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleRenameSong();
        }
    });
}

if (btnRenameSong) {
    btnRenameSong.addEventListener('click', handleRenameSong);
}

if (playlistSearchInput) {
    playlistSearchInput.addEventListener('input', () => {
        renderPlaylistResults();
    });
}

if (searchScopeInLyricsEl) {
    searchScopeInLyricsEl.addEventListener('change', () => {
        renderPlaylistResults();
    });
}

if (btnPrev) {
    btnPrev.addEventListener('click', () => changePage(-1));
}

if (btnNext) {
    btnNext.addEventListener('click', () => changePage(1));
}

if (btnShow) {
    btnShow.addEventListener('click', () => setShowButton(!state.isVisible));
}

document.addEventListener('keydown', event => {
    const target = event.target;
    if (target.isContentEditable || target.closest('input, textarea, select, [role="textbox"]')) return;

    if (event.key === 'Shift' && !event.repeat) {
        event.preventDefault();
        setShowButton(!state.isVisible);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        changePage(-1);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        changePage(1);
    }
});

if (btnSync) {
    btnSync.addEventListener('click', () => {
        setControlSync(!state.isSyncActive);
    });
}

if (settingControlSyncEl) {
    settingControlSyncEl.addEventListener('change', (e) => {
        setControlSync(e.target.checked);
    });
}

// Property Event Listeners
if (propFontSizeEl) {
    propFontSizeEl.addEventListener('input', (e) => {
        state.properties.fontSize = Number(e.target.value);
        savePreferences();
        renderPreviewCards();
        emitLyricsState();
    });
}

if (propFontColorEl) {
    propFontColorEl.addEventListener('input', (e) => {
        state.properties.fontColor = e.target.value;
        savePreferences();
        renderPreviewCards();
        emitLyricsState();
    });
}

if (propTitleColorEl) {
    propTitleColorEl.addEventListener('input', (e) => {
        state.properties.titleColor = e.target.value;
        savePreferences();
        renderPreviewCards();
        emitLyricsState();
    });
}

if (propChorusColorEl) {
    propChorusColorEl.addEventListener('input', (e) => {
        state.properties.chorusColor = e.target.value;
        savePreferences();
        emitLyricsState();
    });
}

if (propMonitorFontSizeEl) {
    propMonitorFontSizeEl.addEventListener('input', (e) => {
        state.properties.monitorFontSize = Number(e.target.value);
        savePreferences();
        emitLyricsState();
    });
}

propMonitorTypeEls.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.checked) {
            state.properties.monitorType = e.target.value;
            savePreferences();
            emitLyricsState();
        }
    });
});

// Settings Event Listeners
if (settingAutoAdvanceEl) {
    settingAutoAdvanceEl.addEventListener('change', (e) => {
        state.settings.autoAdvance = e.target.checked;
        savePreferences();
        updateAutoAdvance();
        emitLyricsState();
    });
}

if (settingAdvanceDelayEl) {
    settingAdvanceDelayEl.addEventListener('input', (e) => {
        state.settings.advanceDelay = Math.max(1, Number(e.target.value) || 5);
        savePreferences();
        updateAutoAdvance();
        emitLyricsState();
    });
}

if (settingBgColorEl) {
    settingBgColorEl.addEventListener('input', (e) => {
        state.settings.bgColor = e.target.value;
        savePreferences();
        renderPreviewCards();
        emitLyricsState();
    });
}

if (settingScreenEl) {
    settingScreenEl.addEventListener('change', (e) => {
        state.settings.screen = e.target.value;
        savePreferences();
        emitLyricsState();
    });
}

if (settingTransitionEl) {
    settingTransitionEl.addEventListener('change', (e) => {
        state.settings.transition = e.target.value;
        savePreferences();
        emitLyricsState();
    });
}

if (btnReloadSongsEl) {
    btnReloadSongsEl.addEventListener('click', async () => {
        btnReloadSongsEl.innerHTML = '<i class="bi bi-hourglass-split"></i> Loading…';
        await loadSongs();
        btnReloadSongsEl.innerHTML = '<i class="bi bi-check-lg"></i> Updated!';
        setTimeout(() => {
            btnReloadSongsEl.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh';
        }, 1500);
    });
}

// Background & Mini Background Section Maps
const mainSections = {
    color: 'main_section_color',
    gradient: 'main_section_gradient',
    image: 'main_section_image',
    video: 'main_section_video'
};
const miniSections = {
    color: 'section_color',
    gradient: 'section_gradient',
    image: 'section_image',
    video: 'section_video'
};

function showSections(map, active) {
    Object.values(map).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('section-hidden');
    });
    if (active && map[active]) {
        const el = document.getElementById(map[active]);
        if (el) el.classList.remove('section-hidden');
    }
}

function setRange(id, valId, val, unit) {
    const el = document.getElementById(id);
    const ve = valId ? document.getElementById(valId) : null;
    if (el) el.value = val;
    if (ve) ve.textContent = val + unit;
}

function bindRange(id, key, valId, unit) {
    const el = document.getElementById(id);
    const ve = valId ? document.getElementById(valId) : null;
    if (!el) return;
    el.addEventListener('input', () => {
        state.properties[key] = parseFloat(el.value);
        if (ve) ve.textContent = el.value + unit;
        savePreferences();
        renderPreviewCards();
        emitLyricsState();
    });
}

function bindColor(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
        state.properties[key] = el.value;
        savePreferences();
        renderPreviewCards();
        emitLyricsState();
    });
}

function bindCheck(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
        state.properties[key] = el.checked;
        savePreferences();
        renderPreviewCards();
        emitLyricsState();
    });
}

function bindSelect(id, key, onChange) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
        state.properties[key] = el.value;
        if (onChange) onChange(el.value);
        savePreferences();
        renderPreviewCards();
        emitLyricsState();
    });
}

// Main Background Controls
bindSelect('main_bg_type', 'mainBgType', (val) => {
    showSections(mainSections, val);
});
bindColor('main_bg_color', 'mainBgColor');
bindColor('main_grad_c1', 'mainGradC1');
bindColor('main_grad_c2', 'mainGradC2');
bindColor('main_grad_c3', 'mainGradC3');
bindRange('main_grad_angle', 'mainGradAngle', 'main_grad_angle_val', 'deg');
bindSelect('main_img_fit', 'mainImgFit');
bindRange('main_bg_opacity', 'mainBgOpacity', 'main_bg_opacity_val', '%');
bindRange('main_bg_blur', 'mainBgBlur', 'main_bg_blur_val', 'px');

// Mini Background Controls
bindCheck('mini_bg_show', 'miniBgShow');
bindSelect('mini_bg_type', 'miniBgType', (val) => {
    showSections(miniSections, val);
});
bindColor('mini_bg_color', 'miniBgColor');
bindRange('mini_bg_opacity', 'miniBgOpacity', 'mini_bg_opacity_val', '%');
bindColor('grad_color1', 'gradColor1');
bindColor('grad_color2', 'gradColor2');
bindColor('grad_color3', 'gradColor3');
bindRange('grad_angle', 'gradAngle', 'grad_angle_val', 'deg');
bindRange('mini_bg_opacity_grad', 'miniBgOpacity', 'mini_bg_opacity_grad_val', '%');
bindSelect('img_fit', 'imgFit');
bindRange('mini_bg_opacity_img', 'miniBgOpacity', 'mini_bg_opacity_img_val', '%');
bindRange('mini_bg_opacity_vid', 'miniBgOpacity', 'mini_bg_opacity_vid_val', '%');
bindRange('mini_bg_radius', 'miniBgRadius', 'mini_bg_radius_val', 'px');
bindRange('mini_bg_blur', 'miniBgBlur', 'mini_bg_blur_val', 'px');
bindRange('mini_padding_x', 'miniPaddingX', 'mini_padding_x_val', 'px');
bindRange('mini_padding_y', 'miniPaddingY', 'mini_padding_y_val', 'px');

// Media Library File Picker Modal Logic
let fpFiles = [];
let fpSelectedItem = null;
let fpCallback = null;

function openFilePicker(type, callback) {
    fpCallback = callback;
    fpSelectedItem = null;
    const filterEl = document.getElementById('fp_filter');
    if (filterEl) filterEl.value = type || 'all';
    const selectBtn = document.getElementById('fp_select_btn');
    if (selectBtn) selectBtn.disabled = true;
    const deleteBtn = document.getElementById('fp_delete_btn');
    if (deleteBtn) deleteBtn.style.display = 'none';
    const overlay = document.getElementById('file_picker_overlay');
    if (overlay) overlay.classList.add('open');
    loadMediaFiles();
}

function closeFilePicker() {
    const overlay = document.getElementById('file_picker_overlay');
    if (overlay) overlay.classList.remove('open');
    fpCallback = null;
    fpSelectedItem = null;
}

const fpCloseBtn = document.getElementById('fp_close');
if (fpCloseBtn) fpCloseBtn.addEventListener('click', closeFilePicker);

const fpCancelBtn = document.getElementById('fp_cancel_btn');
if (fpCancelBtn) fpCancelBtn.addEventListener('click', closeFilePicker);

const fpFilterEl = document.getElementById('fp_filter');
if (fpFilterEl) fpFilterEl.addEventListener('change', renderMediaGrid);

const fpRefreshBtn = document.getElementById('fp_refresh_btn');
if (fpRefreshBtn) fpRefreshBtn.addEventListener('click', loadMediaFiles);

async function loadMediaFiles() {
    try {
        const res = await fetch('/api/lyrics/uploads');
        if (!res.ok) throw new Error('Not ok');
        fpFiles = await res.json();
    } catch (e) {
        try {
            const res2 = await fetch('/api/bible/uploads');
            if (res2.ok) {
                fpFiles = await res2.json();
            } else {
                fpFiles = [];
            }
        } catch (err) {
            fpFiles = [];
        }
    }
    renderMediaGrid();
}

function renderMediaGrid() {
    const grid = document.getElementById('file_picker_grid');
    if (!grid) return;
    const filter = document.getElementById('fp_filter')?.value || 'all';
    const shown = filter === 'all' ? fpFiles : fpFiles.filter(f => f.type === filter);

    grid.innerHTML = '';
    if (!shown.length) {
        grid.innerHTML = '<div id="fp_empty">No files found. Click Upload to add images or videos.</div>';
        return;
    }

    shown.forEach(file => {
        const item = document.createElement('div');
        item.className = 'fp-item';
        item.dataset.url = file.url;
        item.dataset.type = file.type;
        item.dataset.name = file.name;

        if (file.type === 'image') {
            item.innerHTML = `
                <img class="thumb" src="${file.url}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23222%22/></svg>'">
                <div class="fp-name" title="${file.name}">${file.name}</div>
            `;
        } else {
            item.innerHTML = `
                <div class="vid-icon"><i class="bi bi-play-circle-fill"></i></div>
                <div class="fp-name" title="${file.name}">${file.name}</div>
            `;
        }

        item.addEventListener('click', () => {
            document.querySelectorAll('.fp-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            fpSelectedItem = file;
            const selectBtn = document.getElementById('fp_select_btn');
            if (selectBtn) selectBtn.disabled = false;
            const deleteBtn = document.getElementById('fp_delete_btn');
            if (deleteBtn) deleteBtn.style.display = 'inline-flex';
        });

        grid.appendChild(item);
    });
}

const fpSelectBtn = document.getElementById('fp_select_btn');
if (fpSelectBtn) {
    fpSelectBtn.addEventListener('click', () => {
        if (!fpSelectedItem || !fpCallback) return;
        fpCallback(fpSelectedItem.url, fpSelectedItem.type);
        closeFilePicker();
    });
}

const fpDeleteBtn = document.getElementById('fp_delete_btn');
if (fpDeleteBtn) {
    fpDeleteBtn.addEventListener('click', async () => {
        if (!fpSelectedItem) return;
        if (!confirm(`Delete "${fpSelectedItem.name}"?`)) return;
        try {
            const res = await fetch(`/api/lyrics/uploads/${encodeURIComponent(fpSelectedItem.name)}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Not ok');
        } catch (e) {
            try {
                await fetch(`/api/bible/uploads/${encodeURIComponent(fpSelectedItem.name)}`, { method: 'DELETE' });
            } catch (err) {
                console.warn('Delete failed', err);
            }
        }
        fpSelectedItem = null;
        loadMediaFiles();
        if (fpSelectBtn) fpSelectBtn.disabled = true;
        fpDeleteBtn.style.display = 'none';
    });
}

const fpUploadBtn = document.getElementById('fp_upload_btn');
const fpFileInput = document.getElementById('fp_file_input');
if (fpUploadBtn && fpFileInput) {
    fpUploadBtn.addEventListener('click', () => fpFileInput.click());
    fpFileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        const badge = document.getElementById('fp_uploading');
        if (badge) badge.classList.add('show');
        for (const file of files) {
            const fd = new FormData();
            fd.append('file', file);
            let uploaded = false;
            try {
                const res = await fetch('/api/lyrics/upload', { method: 'POST', body: fd });
                if (res.ok) uploaded = true;
            } catch (err) {}
            if (!uploaded) {
                try {
                    await fetch('/api/bible/upload', { method: 'POST', body: fd });
                } catch (e) {
                    console.warn('Upload failed', e);
                }
            }
        }
        if (badge) badge.classList.remove('show');
        e.target.value = '';
        loadMediaFiles();
    });
}

// Media pick triggers
const btnMainImgPick = document.getElementById('btn_main_img_pick');
if (btnMainImgPick) {
    btnMainImgPick.addEventListener('click', () => {
        openFilePicker('image', (url) => {
            state.properties.mainImgUrl = url;
            const el = document.getElementById('main_img_url');
            if (el) el.value = url.split('/').pop();
            savePreferences();
            renderPreviewCards();
            emitLyricsState();
        });
    });
}

const btnMainVidPick = document.getElementById('btn_main_vid_pick');
if (btnMainVidPick) {
    btnMainVidPick.addEventListener('click', () => {
        openFilePicker('video', (url) => {
            state.properties.mainVidUrl = url;
            const el = document.getElementById('main_vid_url');
            if (el) el.value = url.split('/').pop();
            savePreferences();
            renderPreviewCards();
            emitLyricsState();
        });
    });
}

const btnMiniImgPick = document.getElementById('btn_mini_img_pick');
if (btnMiniImgPick) {
    btnMiniImgPick.addEventListener('click', () => {
        openFilePicker('image', (url) => {
            state.properties.bgImageUrl = url;
            const el = document.getElementById('bg_image_url');
            if (el) el.value = url.split('/').pop();
            savePreferences();
            renderPreviewCards();
            emitLyricsState();
        });
    });
}

const btnMiniVidPick = document.getElementById('btn_mini_vid_pick');
if (btnMiniVidPick) {
    btnMiniVidPick.addEventListener('click', () => {
        openFilePicker('video', (url) => {
            state.properties.bgVideoUrl = url;
            const el = document.getElementById('bg_video_url');
            if (el) el.value = url.split('/').pop();
            savePreferences();
            renderPreviewCards();
            emitLyricsState();
        });
    });
}

if (btnClearCacheEl) {
    btnClearCacheEl.addEventListener('click', () => {
        if (confirm('Reset all font and display settings to defaults?')) {
            try {
                localStorage.removeItem('lyrics_properties');
                localStorage.removeItem('lyrics_settings');
            } catch (e) {}
            state.properties = {
                fontSize: 50,
                fontColor: '#000000',
                titleColor: '#000000',
                chorusColor: '#000000',
                monitorFontSize: 50,
                monitorType: 'one',
                mainBgType: 'gradient',
                mainBgColor: '#0d1320',
                mainGradC1: '#0d1320',
                mainGradC2: '#182235',
                mainGradC3: '#0f172a',
                mainGradAngle: 135,
                mainImgUrl: '',
                mainImgFit: 'cover',
                mainVidUrl: '',
                mainBgOpacity: 100,
                mainBgBlur: 0,
                miniBgShow: true,
                miniBgType: 'color',
                miniBgColor: '#141e2d',
                miniBgOpacity: 85,
                gradColor1: '#1a1a2e',
                gradColor2: '#16213e',
                gradColor3: '#0f3460',
                gradAngle: 135,
                bgImageUrl: '',
                imgFit: 'cover',
                bgVideoUrl: '',
                miniBgRadius: 18,
                miniBgBlur: 0,
                miniPaddingX: 40,
                miniPaddingY: 26
            };
            state.settings = {
                autoAdvance: false,
                advanceDelay: 5,
                bgColor: '#f7f3ec',
                screen: 'primary',
                transition: 'none'
            };
            loadPreferences();
            renderPreviewCards();
            emitLyricsState();
        }
    });
}

// ── Socket Synchronization ────────────────────────────────────────────────

socket.on('receiveConfig', (res) => {
    if (res && res.type === 'lyrics_properties' && res.properties) {
        Object.assign(state.properties, res.properties);
        syncPropertyUI();
        renderPreviewCards();
    }
});

async function handleLyricsSyncMessage(response) {
    if (response?.type !== 'lyrics' || !response.data) return;

    // Handle database-level playlist rename broadcast on all devices
    if (response.action === 'playlist-renamed' || response.data?.action === 'playlist-renamed') {
        const plList = response.playlists || response.data?.playlists;
        if (plList) {
            applyPlaylists(plList);
            renderPlaylistResults();
        }
        return;
    }

    // If Control Sync is OFF on this device, ignore incoming updates so the user can use their own screen
    if (!state.isSyncActive) return;

    // Ignore echo of our own emitted data
    if (response.senderId && response.senderId === socket.id) return;
    if (response.data.senderId && response.data.senderId === socket.id) return;

    const data = response.data;
    let hasChanged = false;

    if (data.properties) {
        Object.assign(state.properties, data.properties);
        syncPropertyUI();
        renderPreviewCards();
    }

    if (data.songId && String(data.songId) !== String(state.selectedSongId)) {
        state.selectedSongId = data.songId;
        state.selectedPage = Number(data.pageIndex) || 0;
        hasChanged = true;
    } else if (typeof data.pageIndex === 'number' && data.pageIndex !== state.selectedPage) {
        state.selectedPage = data.pageIndex;
        hasChanged = true;
    }

    if (typeof data.isVisible === 'boolean' && data.isVisible !== state.isVisible) {
        state.isVisible = data.isVisible;
        if (btnShow) {
            btnShow.classList.toggle('active', state.isVisible);
            btnShow.innerHTML = `<i class="bi bi-eye${state.isVisible ? '-fill' : ''}"></i> ${state.isVisible ? 'Hide' : 'Show'}`;
        }
    }

    if (data.source && data.source !== state.source) {
        state.source = data.source;
        if (searchInput) searchInput.value = '';
        if (sourceSelect) sourceSelect.value = data.source;
        const playlist = state.playlists.find(item => item.source_key === data.source);
        if (playlist) {
            state.playlistName = playlist.name;
            if (playlistNameInput) playlistNameInput.value = playlist.name;
            if (propRenamePlaylistInput) propRenamePlaylistInput.value = playlist.name;
        }
        await loadSongs(data.songId, {
            emit: false,
            targetPage: Number(data.pageIndex) || 0
        });
        return;
    }

    if (hasChanged) {
        renderSongList();
        renderCurrentPage();
        renderPlaylistResults();
    }
}

socket.on('receiveData', handleLyricsSyncMessage);

// ── Initialization ────────────────────────────────────────────────────────

try {
    localStorage.removeItem('lyrics_playlist_names');
} catch (e) {}

updateSyncButtonUI();

const savedTab = (() => {
    try {
        return localStorage.getItem('lyrics_active_tab') || 'search';
    } catch (e) {
        return 'search';
    }
})();
setActiveTab(savedTab);

loadPreferences();

if (playlistSearchInput) {
    playlistSearchInput.value = '';
}

async function init() {
    await loadPlaylists();
    const returnParams = new URLSearchParams(window.location.search);
    const preferredSongId = returnParams.get('song');
    const preferredSource = returnParams.get('source');
    const playlist = state.playlists.find(item => item.source_key === preferredSource);
    if (playlist) {
        state.source = playlist.source_key;
        state.playlistName = playlist.name;
        if (sourceSelect) sourceSelect.value = playlist.source_key;
        if (playlistNameInput) playlistNameInput.value = playlist.name;
        if (propRenamePlaylistInput) propRenamePlaylistInput.value = playlist.name;
    }
    await loadSongs(preferredSongId);
    if (preferredSongId || preferredSource) {
        window.history.replaceState({}, '', window.location.pathname);
    }
}

init();
