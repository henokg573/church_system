const playlistSelect = document.getElementById('song_playlist');
const titleInput = document.getElementById('song_title_input');
const subtitleInput = document.getElementById('song_subtitle_input');
const form = document.getElementById('song_editor_form');
const slideList = document.getElementById('song_slide_list');
const slideText = document.getElementById('song_slide_text');
const slideLabel = document.getElementById('song_slide_label');
const addSlideButton = document.getElementById('btn_add_slide');
const deleteSlideButton = document.getElementById('btn_delete_slide');
const moveSlideUpButton = document.getElementById('btn_move_slide_up');
const moveSlideDownButton = document.getElementById('btn_move_slide_down');
const duplicateSlideButton = document.getElementById('btn_duplicate_slide');
let slides = [''];
let activeSlide = 0;

function escapeHtml(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function saveCurrentSlide() { slides[activeSlide] = slideText.value; }

function moveSlide(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= slides.length) return;
    saveCurrentSlide();
    const [slide] = slides.splice(fromIndex, 1);
    slides.splice(toIndex, 0, slide);
    if (activeSlide === fromIndex) activeSlide = toIndex;
    else if (fromIndex < activeSlide && toIndex >= activeSlide) activeSlide--;
    else if (fromIndex > activeSlide && toIndex <= activeSlide) activeSlide++;
    renderSlides();
}

function duplicateActiveSlide() {
    saveCurrentSlide();
    slides.splice(activeSlide + 1, 0, slides[activeSlide]);
    activeSlide++;
    renderSlides();
    slideText.focus();
}

function renderSlides() {
    slideList.innerHTML = slides.map((slide, index) => {
        const preview = slide.trim().replace(/\s+/g, ' ') || 'Empty slide';
        return `<button type="button" class="song_slide_item ${index === activeSlide ? 'active' : ''}" data-index="${index}" draggable="true"><span class="song_slide_item_title"><i class="bi bi-file-earmark-text"></i> Slide ${index + 1}</span><small>${escapeHtml(preview)}</small></button>`;
    }).join('');
    slideList.querySelectorAll('.song_slide_item').forEach(button => {
        button.addEventListener('click', () => {
            saveCurrentSlide(); activeSlide = Number(button.dataset.index); renderSlides();
        });
        button.addEventListener('dragstart', event => {
            saveCurrentSlide();
            event.dataTransfer.setData('text/plain', button.dataset.index);
            event.dataTransfer.effectAllowed = 'move';
        });
        button.addEventListener('dragover', event => { event.preventDefault(); });
        button.addEventListener('drop', event => {
            event.preventDefault();
            moveSlide(Number(event.dataTransfer.getData('text/plain')), Number(button.dataset.index));
        });
    });
    slideText.value = slides[activeSlide] || '';
    slideLabel.textContent = `Slide ${activeSlide + 1}`;
    deleteSlideButton.disabled = slides.length === 1;
    moveSlideUpButton.disabled = activeSlide === 0;
    moveSlideDownButton.disabled = activeSlide === slides.length - 1;
}

async function loadPlaylists() {
    const response = await fetch('/api/lyrics/playlists');
    const playlists = await response.json();
    if (!response.ok) throw new Error('Could not load playlists');
    playlistSelect.innerHTML = playlists.map(playlist => `<option value="${escapeHtml(playlist.source_key)}">${escapeHtml(playlist.name)}</option>`).join('');
}

slideText.addEventListener('input', saveCurrentSlide);
addSlideButton.addEventListener('click', () => { saveCurrentSlide(); slides.push(''); activeSlide = slides.length - 1; renderSlides(); slideText.focus(); });
deleteSlideButton.addEventListener('click', () => { if (slides.length > 1) { slides.splice(activeSlide, 1); activeSlide = Math.min(activeSlide, slides.length - 1); renderSlides(); } });
moveSlideUpButton.addEventListener('click', () => moveSlide(activeSlide, activeSlide - 1));
moveSlideDownButton.addEventListener('click', () => moveSlide(activeSlide, activeSlide + 1));
duplicateSlideButton.addEventListener('click', duplicateActiveSlide);

form.addEventListener('submit', async event => {
    event.preventDefault();
    saveCurrentSlide();
    const lyrics = slides.map(slide => slide.trim()).filter(Boolean).join('\n\n');
    if (!lyrics) return alert('Add lyrics to at least one slide.');
    const saveButton = document.getElementById('btn_save_song');
    try {
        saveButton.disabled = true; saveButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving…';
        const response = await fetch('/api/lyrics/songs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: playlistSelect.value, title: titleInput.value.trim(), subtitle: subtitleInput.value.trim(), lyrics }) });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Could not save song');
        window.location.href = 'index.html';
    } catch (error) {
        alert(error.message); saveButton.disabled = false; saveButton.innerHTML = '<i class="bi bi-database-add"></i> Save to Library';
    }
});

loadPlaylists().catch(error => alert(error.message));
renderSlides();
