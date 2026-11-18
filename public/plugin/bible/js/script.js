const socket = io();

// ── State ──────────────────────────────────────────────────
const state = {
    testament: 'Old',
    selectedBook: 0,
    selectedChapter: 1,
    verses: [],
    selectedVerses: new Set(),
    queue: [],
    history: [],
    queueCursor: -1,
    translation: '',
    lang: 'en',
    isVisible:false,
    
};

let book_list=[];
// OT & NT book names in Amharic (index = bookNum - 1 for OT, bookNum - 40 for NT)
const OT_BOOKS = [
    'ዘፍጥረት','ዘጸአት','ዘሌዋውያን','ዘኁልቁ','ዘዳግም',
    'ኢያሱ','መሳፍንት','ሩት','1ኛ ሳሙኤል','2ኛ ሳሙኤል',
    '1ኛ ነገሥት','2ኛ ነገሥት','1ኛ ዜና','2ኛ ዜና','እዝራ',
    'ነህምያ','አስቴር','ኢዮብ','መዝሙር','ምሳሌ',
    'መክብብ','መኃልይ','ኢሳይያስ','ኤርምያስ','ሰቆቃወ ኤርምያስ',
    'ሕዝቅኤል','ዳንኤል','ሆሴዕ','ኢዩኤል','አሞጽ',
    'አብድዩ','ዮናስ','ሚክያስ','ናሆም','ዘካርያስ',
    'ሶፎኒያስ','ሐጌ','ዘካርያስ','ሚልክያስ'
];
const NT_BOOKS = [
    'ማቴዎስ','ማርቆስ','ሉቃስ','ዮሐንስ','ሐዋርያት',
    'ሮሜ','1ኛ ቆሮንቶስ','2ኛ ቆሮንቶስ','ገላትያ','ኤፌሶን',
    'ፊልጵስዩስ','ቆላስይስ','1ኛ ተሰሎንቄ','2ኛ ተሰሎንቄ','1ኛ ጢሞቴዎስ',
    '2ኛ ጢሞቴዎስ','ቲቶ','ፊልሞና','ዕብራውያን','ያዕቆብ',
    '1ኛ ጴጥሮስ','2ኛ ጴጥሮስ','1ኛ ዮሐንስ','2ኛ ዮሐንስ','3ኛ ዮሐንስ',
    'ይሁዳ','ራዕይ'
];

// English fallback names
const OT_EN = [
    'Genesis','Exodus','Leviticus','Numbers','Deuteronomy',
    'Joshua','Judges','Ruth','1 Samuel','2 Samuel',
    '1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
    'Nehemiah','Esther','Job','Psalms','Proverbs',
    'Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations',
    'Ezekiel','Daniel','Hosea','Joel','Amos',
    'Obadiah','Jonah','Micah','Nahum','Habakkuk',
    'Zephaniah','Haggai','Zechariah','Malachi'
];
const NT_EN = [
    'Matthew','Mark','Luke','John','Acts',
    'Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians',
    'Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy',
    '2 Timothy','Titus','Philemon','Hebrews','James',
    '1 Peter','2 Peter','1 John','2 John','3 John',
    'Jude','Revelation'
];

const translation_books=document.getElementById("translation_books");
const books_old=document.getElementById("books_old");
const books_new=document.getElementById("books_new");
const DEFAULT_TRANSLATION = 'Amharic Bible (መጽሐፍ ቅዱስ (የብሉይና የሐዲስ ኪዳን መጻሕፍት))';

async function getbooks(){
    try {
        const res = await fetch('/api/bible/translations');
        const data = await res.json();
        //console.log(data);
        translation_books.innerHTML = "<option value=''>Select Translation</option>";
        data.forEach(translation => {
            const option = document.createElement('option');
            option.value = translation;
            option.textContent = translation;
            translation_books.appendChild(option);
        });

        const defaultTranslation = data.find(translation =>
            translation === DEFAULT_TRANSLATION || translation.includes('መጽሐፍ ቅዱስ (የብሉይና የሐዲስ ኪዳን መጻሕፍት)')
        );
        if (defaultTranslation) {
            translation_books.value = defaultTranslation;
            translation_books.dispatchEvent(new Event('change'));
        }
    } catch (error) {
        console.error(error);
    }
}
getbooks();

// translation

translation_books.addEventListener('change', (e) => {
    state.translation = e.target.value;
    resetBibleSearch();
    console.log(state.translation);
    updatebooklist();
    selectedbook(state.selectedBook);
});

// update booklist

function updatebooklist(){
    if(state.translation.includes('Amharic')){
        //console.log("Amharic")
        books_old.innerHTML = OT_BOOKS.map((book, index) => `<li onclick="selectedbook(${index})">${book}</li>`).join('');
        books_new.innerHTML = NT_BOOKS.map((book, index) => `<li onclick="selectedbook(${index+OT_BOOKS.length})">${book}</li>`).join('');
        state.lang = 'am';
    }
    else if(state.translation.includes('English')){
        //console.log("English")
        books_old.innerHTML = OT_EN.map((book, index) => `<li onclick="selectedbook(${index})">${book}</li>`).join('');
        books_new.innerHTML = NT_EN.map((book, index) => `<li onclick="selectedbook(${index+OT_EN.length})">${book}</li>`).join('');
        state.lang = 'en';
    }      
}

async function selectedbook(position){
    state.selectedBook = position;
    // Fetch real chapter count from DB
    const num=state.selectedBook+1;
    try {
        const res = await fetch(
            `/api/bible/chapters?translation=${encodeURIComponent(state.translation)}&book=${num}`
        );
        const data = await res.json();
        await renderChapters(data.total || 1);
    } catch {
        await renderChapters(50); // fallback
    }
    // make it active book
    document.querySelectorAll('.books_list div ul li').forEach((li, index) => {
        if (index === state.selectedBook) {
            li.classList.add('active');
        } else {
            li.classList.remove('active');
        }
    });
    // if position is <39 then OT else NT
    if(state.selectedBook < 39){
        state.testament = 'Old';
    } else {
        state.testament = 'New';
    }
    //console.log(state.selectedBook);
}
const chapter_number=document.getElementById('chapter_number');
// render chapter
async function renderChapters(total){
    //console.log(total);
    let html='';
    chapter_number.innerHTML='';
    for(let i=1;i<=total;i++){
        html +=`<span onclick="changeChapter(${i})">${i}</span>`
    }
    chapter_number.innerHTML=html
    state.selectedChapter=1;
    return await changeChapter(state.selectedChapter);
}

const verses_list=document.getElementById('versus_list');
const selected_chapter=document.getElementById('selected_chapter');
// change chapter

async function changeChapter(chapter){
    state.selectedChapter = chapter;
   //console.log(state.selectedChapter);
    // make it active chapter_number span
    const chapter_spans = document.querySelectorAll('.chapter_number span');
    chapter_spans.forEach((span, index) => {
        if (index + 1 === chapter) {
            span.classList.add('active');
        } else {
            span.classList.remove('active');
        }
    });
    return await renderVerses();
}

// render verses

async function renderVerses(){
    //const verses_list=document.getElementById("verses_list");
    //verses_list.innerHTML='';
    try {
        const res = await fetch(
            `/api/bible/verses?translation=${encodeURIComponent(state.translation)}&book=${state.selectedBook+1}&chapter=${state.selectedChapter}`
        );
        const data = await res.json();
        state.verses = data;
        //console.log(state.verses);
        displayVerses();
    } catch (error) {
        console.error(error);
    }
}

// display verses

function displayVerses(){
    verses_list.innerHTML='';
    let html='';
    for(let i=0;i<state.verses.length;i++){
        if(state.verses[i].text.trim() === '') continue; // Skip empty verses
        const verseNum = state.verses[i].verse ?? state.verses[i].verse_number ?? (i + 1);
        html +=`<div class='verse' data-verse-index='${i}' onclick="selectVerse(${i})"><span>${verseNum}</span> <span class='verse_text'>${state.verses[i].text}</span></div>`;
    }
    verses_list.innerHTML=html;
    if(state.lang == 'am'){
        book_title=[];
        book_title=OT_BOOKS.concat(NT_BOOKS);
    }
    else if(state.lang == 'en'){
        book_title=[];
        book_title=OT_EN.concat(NT_EN);
    }
    //console.log(book_title);
    selected_chapter.innerHTML=book_title[state.selectedBook]+' '+state.selectedChapter;
}

// selected verse

function selectVerse(vs_index){
    const verse=state.verses[vs_index]; 
    if (!verse) return;
    state.selectedVerse = verse;
    const verse_num = verse.verse ?? verse.verse_number ?? (vs_index + 1);
    //make verse active
    const verse_divs = document.querySelectorAll('#versus_list > .verse');
    verse_divs.forEach((div, index) => {
        if (Number(div.dataset.verseIndex) === vs_index) {
            div.classList.add('active');
        } else {
            div.classList.remove('active');
        }
    });

    // Record in history
    const allBooks = state.lang === 'am' ? OT_BOOKS.concat(NT_BOOKS) : OT_EN.concat(NT_EN);
    const bookName = allBooks[state.selectedBook] || '';
    const reference = `${bookName} ${state.selectedChapter}:${verse_num}`;
    
    if (!state.history) state.history = [];
    const lastHist = state.history[state.history.length - 1];
    if (!lastHist || lastHist.reference !== reference) {
        state.history.push({
            verse: verse,
            selectedBook: state.selectedBook,
            selectedChapter: state.selectedChapter,
            reference: reference,
            timestamp: new Date().toLocaleTimeString()
        });
    }

    if (typeof currentRightTab !== 'undefined' && currentRightTab === 'history') {
        renderHistory();
    }

    const data = {
        type:'bible',
        data:state
    };
    socket.emit('sendData',data);
}

// show / hide event 

const btn_show = document.getElementById('btn_show');

function setShowButton(isVisible) {
    state.isVisible = isVisible;
    btn_show.classList.toggle('active', isVisible);
    btn_show.innerHTML = `<i class="bi bi-eye"></i> ${isVisible ? 'Hide' : 'Show'}`;
}

socket.on('receiveData', data => {
    if (data?.type === 'bible' && typeof data.data?.isVisible === 'boolean') {
        setShowButton(data.data.isVisible);
    }
});

btn_show.addEventListener('click', () => {
    setShowButton(!state.isVisible);
    //console.log(state);
    const data = {
        type:'bible',
        data:state
    };
    socket.emit('sendData',data);
});

// Previous and Next button events
const btn_previous = document.getElementById('btn_previous');
const btn_next = document.getElementById('btn_next');

function getCurrentVerseIndex() {
    if (!state.selectedVerse || !state.verses.length) return -1;
    return state.verses.findIndex(v => v === state.selectedVerse || ((v.verse ?? v.verse_number) === (state.selectedVerse.verse ?? state.selectedVerse.verse_number) && v.text === state.selectedVerse.text));
}

function scrollToActiveVerse() {
    const activeDiv = document.querySelector('#versus_list > .verse.active');
    if (activeDiv) {
        activeDiv.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

if (btn_previous) {
    btn_previous.addEventListener('click', async () => {
        const currentIndex = getCurrentVerseIndex();
        if (currentIndex > 0) {
            selectVerse(currentIndex - 1);
            scrollToActiveVerse();
        } else if (state.selectedChapter > 1) {
            await changeChapter(state.selectedChapter - 1);
            if (state.verses.length > 0) {
                selectVerse(state.verses.length - 1);
                scrollToActiveVerse();
            }
        }
    });
}

if (btn_next) {
    btn_next.addEventListener('click', async () => {
        const currentIndex = getCurrentVerseIndex();
        if (currentIndex >= 0 && currentIndex < state.verses.length - 1) {
            selectVerse(currentIndex + 1);
            scrollToActiveVerse();
        } else if (currentIndex === -1 && state.verses.length > 0) {
            selectVerse(0);
            scrollToActiveVerse();
        } else {
            const totalChapters = document.querySelectorAll('.chapter_number span').length;
            if (state.selectedChapter < totalChapters) {
                await changeChapter(state.selectedChapter + 1);
                if (state.verses.length > 0) {
                    selectVerse(0);
                    scrollToActiveVerse();
                }
            }
        }
    });
}

document.addEventListener('keydown', event => {
    const target = event.target;
    if (target.isContentEditable || target.closest('input, textarea, select, [role="textbox"]')) return;

    if (event.key === 'Shift' && !event.repeat) {
        event.preventDefault();
        btn_show?.click();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        btn_previous?.click();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        btn_next?.click();
    }
});

// ── Queue List & History Management ────────────────────────────────

const btn_add_to_queue = document.getElementById('btn_add_to_queue');
const queue_list_el = document.getElementById('queue_list');
let currentRightTab = 'queue';

function switchRightTab(tab) {
    currentRightTab = tab;
    const tabQueueBtn = document.getElementById('tab_queue');
    const tabHistBtn = document.getElementById('tab_history');
    const tabSearchBtn = document.getElementById('tab_search');
    const tabPropBtn = document.getElementById('tab_property');
    const queueListEl = document.getElementById('queue_list');
    const historyListEl = document.getElementById('history_list');
    const searchContainerEl = document.getElementById('search_container');
    const propertyContainerEl = document.getElementById('property_container');

    if (tabQueueBtn) tabQueueBtn.classList.toggle('active', tab === 'queue');
    if (tabHistBtn) tabHistBtn.classList.toggle('active', tab === 'history');
    if (tabSearchBtn) tabSearchBtn.classList.toggle('active', tab === 'search');
    if (tabPropBtn) tabPropBtn.classList.toggle('active', tab === 'property');

    if (queueListEl) queueListEl.style.display = (tab === 'queue') ? 'flex' : 'none';
    if (historyListEl) historyListEl.style.display = (tab === 'history') ? 'flex' : 'none';
    if (searchContainerEl) searchContainerEl.style.display = (tab === 'search') ? 'flex' : 'none';
    if (propertyContainerEl) propertyContainerEl.style.display = (tab === 'property') ? 'block' : 'none';

    if (tab === 'queue') renderQueue();
    if (tab === 'history') renderHistory();
    if (tab === 'search') document.getElementById('bible_search_input')?.focus();
}

const bibleSearchForm = document.getElementById('bible_search_form');
const bibleSearchInput = document.getElementById('bible_search_input');
const bibleSearchStatus = document.getElementById('bible_search_status');
const bibleSearchResults = document.getElementById('search_results');
let bibleSearchDebounce = null;
let bibleSearchRequestId = 0;

function resetBibleSearch() {
    bibleSearchRequestId++;
    if (bibleSearchDebounce) clearTimeout(bibleSearchDebounce);
    if (bibleSearchInput) bibleSearchInput.value = '';
    if (bibleSearchStatus) bibleSearchStatus.textContent = state.translation ? 'Search across the selected translation.' : 'Select a translation to search.';
    if (bibleSearchResults) bibleSearchResults.replaceChildren();
}

function getSearchBookName(bookNumber) {
    const names = state.lang === 'am' ? OT_BOOKS.concat(NT_BOOKS) : OT_EN.concat(NT_EN);
    return names[Number(bookNumber) - 1] || `Book ${bookNumber}`;
}

function renderBibleSearchResults(results) {
    bibleSearchResults.replaceChildren();
    if (!results.length) {
        bibleSearchStatus.textContent = 'No matching verses found.';
        return;
    }

    bibleSearchStatus.textContent = results.length === 100
        ? 'Showing the first 100 matching verses.'
        : `${results.length} matching verse${results.length === 1 ? '' : 's'}.`;

    results.forEach(result => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';

        const reference = document.createElement('span');
        reference.className = 'search_result_reference';
        reference.textContent = `${getSearchBookName(result.book)} ${result.chapter}:${result.verse}`;

        const text = document.createElement('span');
        text.className = 'search_result_text';
        appendHighlightedSearchText(text, result.text, bibleSearchInput.value.trim());

        button.append(reference, text);
        button.addEventListener('click', () => openBibleSearchResult(result));
        li.appendChild(button);
        bibleSearchResults.appendChild(li);
    });
}

function appendHighlightedSearchText(container, text, query) {
    const normalizedText = text.toLocaleLowerCase();
    const normalizedQuery = query.toLocaleLowerCase();
    if (!normalizedQuery) {
        container.textContent = text;
        return;
    }

    let cursor = 0;
    let matchIndex = normalizedText.indexOf(normalizedQuery, cursor);
    while (matchIndex !== -1) {
        container.append(document.createTextNode(text.slice(cursor, matchIndex)));
        const match = document.createElement('mark');
        match.textContent = text.slice(matchIndex, matchIndex + query.length);
        container.append(match);
        cursor = matchIndex + query.length;
        matchIndex = normalizedText.indexOf(normalizedQuery, cursor);
    }
    container.append(document.createTextNode(text.slice(cursor)));
}

async function performBibleSearch() {
    const query = bibleSearchInput?.value.trim();
    const requestId = ++bibleSearchRequestId;
    if (bibleSearchDebounce) clearTimeout(bibleSearchDebounce);
    if (!query) {
        bibleSearchResults?.replaceChildren();
        if (bibleSearchStatus) bibleSearchStatus.textContent = 'Enter a word or phrase to search.';
        return;
    }
    if (!state.translation) {
        bibleSearchStatus.textContent = 'Select a translation before searching.';
        return;
    }

    bibleSearchStatus.textContent = `Searching ${state.translation}…`;
    bibleSearchResults.replaceChildren();
    try {
        const response = await fetch(`/api/bible/search?translation=${encodeURIComponent(state.translation)}&q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error(`Search failed (${response.status})`);
        const results = await response.json();
        if (requestId !== bibleSearchRequestId) return;
        renderBibleSearchResults(Array.isArray(results) ? results : []);
    } catch (error) {
        if (requestId !== bibleSearchRequestId) return;
        console.error('Bible search failed:', error);
        bibleSearchStatus.textContent = 'Search failed. Check the connection and try again.';
    }
}

async function openBibleSearchResult(result) {
    const targetBook = Number(result.book) - 1;
    const targetChapter = Number(result.chapter);
    const targetVerse = Number(result.verse);
    await selectedbook(targetBook);
    await changeChapter(targetChapter);

    const verseIndex = state.verses.findIndex(verse =>
        Number(verse.verse ?? verse.verse_number) === targetVerse && verse.text === result.text
    );
    if (verseIndex !== -1) {
        selectVerse(verseIndex);
        scrollToActiveVerse();
    }
}

if (bibleSearchForm) {
    bibleSearchForm.addEventListener('submit', event => {
        event.preventDefault();
        performBibleSearch();
    });
}
if (bibleSearchInput) {
    bibleSearchInput.addEventListener('input', () => {
        if (bibleSearchDebounce) clearTimeout(bibleSearchDebounce);
        bibleSearchDebounce = setTimeout(performBibleSearch, 300);
    });
}

function renderQueue() {
    if (!queue_list_el) return;
    queue_list_el.innerHTML = '';

    if (!state.queue || state.queue.length === 0) {
        queue_list_el.innerHTML = '<li style="justify-content:center; color: var(--border-color); font-size: 0.85rem;">Queue is empty</li>';
        return;
    }

    state.queue.forEach((item, index) => {
        const li = document.createElement('li');
        if (state.queueCursor === index) {
            li.classList.add('active');
        }
        
        const infoSpan = document.createElement('span');
        infoSpan.style.display = 'flex';
        infoSpan.style.flexDirection = 'column';
        infoSpan.style.gap = '2px';

        const refDiv = document.createElement('strong');
        refDiv.textContent = item.reference;

        const textSnippet = document.createElement('small');
        textSnippet.style.opacity = '0.75';
        textSnippet.style.fontSize = '0.8rem';
        textSnippet.textContent = item.verse?.text ? (item.verse.text.length > 35 ? item.verse.text.substring(0, 35) + '...' : item.verse.text) : '';

        infoSpan.appendChild(refDiv);
        infoSpan.appendChild(textSnippet);

        const deleteBtn = document.createElement('i');
        deleteBtn.className = 'bi bi-trash queue_remove';
        deleteBtn.title = 'Remove from queue';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            removeFromQueue(index);
        };

        li.appendChild(infoSpan);
        li.appendChild(deleteBtn);

        li.onclick = () => {
            selectQueuedItem(index);
        };

        queue_list_el.appendChild(li);
    });
}

function renderHistory() {
    const historyListEl = document.getElementById('history_list');
    if (!historyListEl) return;
    historyListEl.innerHTML = '';

    if (!state.history || state.history.length === 0) {
        historyListEl.innerHTML = '<li style="justify-content:center; color: var(--border-color); font-size: 0.85rem;">History is empty</li>';
        return;
    }

    const reversed = [...state.history].reverse();

    reversed.forEach((item) => {
        const li = document.createElement('li');

        const infoSpan = document.createElement('span');
        infoSpan.style.display = 'flex';
        infoSpan.style.flexDirection = 'column';
        infoSpan.style.gap = '2px';

        const refDiv = document.createElement('strong');
        refDiv.textContent = item.reference;

        const textSnippet = document.createElement('small');
        textSnippet.style.opacity = '0.75';
        textSnippet.style.fontSize = '0.8rem';
        textSnippet.textContent = item.verse?.text ? (item.verse.text.length > 35 ? item.verse.text.substring(0, 35) + '...' : item.verse.text) : '';

        infoSpan.appendChild(refDiv);
        infoSpan.appendChild(textSnippet);

        const timeSpan = document.createElement('small');
        timeSpan.style.opacity = '0.5';
        timeSpan.style.fontSize = '0.75rem';
        timeSpan.textContent = item.timestamp || '';

        li.appendChild(infoSpan);
        li.appendChild(timeSpan);

        li.onclick = async () => {
            if (state.selectedBook !== item.selectedBook) {
                await selectedbook(item.selectedBook);
            }
            if (state.selectedChapter !== item.selectedChapter) {
                await changeChapter(item.selectedChapter);
            }
            const targetVerseNum = item.verse.verse ?? item.verse.verse_number;
            const vsIndex = state.verses.findIndex(v => (v.verse ?? v.verse_number) === targetVerseNum || v.text === item.verse.text);
            if (vsIndex !== -1) {
                selectVerse(vsIndex);
                scrollToActiveVerse();
            } else {
                state.selectedVerse = item.verse;
                socket.emit('sendData', { type: 'bible', data: state });
            }
        };

        historyListEl.appendChild(li);
    });
}

function addToQueue() {
    if (!state.selectedVerse) return;

    const allBooks = state.lang === 'am' ? OT_BOOKS.concat(NT_BOOKS) : OT_EN.concat(NT_EN);
    const bookName = allBooks[state.selectedBook] || '';
    const chapterNum = state.selectedChapter;
    const verseNum = state.selectedVerse.verse ?? state.selectedVerse.verse_number ?? 1;
    const reference = `${bookName} ${chapterNum}:${verseNum}`;

    const queueItem = {
        verse: state.selectedVerse,
        selectedBook: state.selectedBook,
        selectedChapter: state.selectedChapter,
        reference: reference
    };

    if (!state.queue) state.queue = [];
    state.queue.push(queueItem);
    renderQueue();

    const data = {
        type: 'bible',
        data: state
    };
    socket.emit('sendData', data);
}

function removeFromQueue(index) {
    if (!state.queue) return;
    state.queue.splice(index, 1);
    if (state.queueCursor >= state.queue.length) {
        state.queueCursor = state.queue.length - 1;
    }
    renderQueue();
    socket.emit('sendData', { type: 'bible', data: state });
}

async function selectQueuedItem(index) {
    if (!state.queue || !state.queue[index]) return;
    state.queueCursor = index;
    const item = state.queue[index];

    if (state.selectedBook !== item.selectedBook) {
        await selectedbook(item.selectedBook);
    }
    if (state.selectedChapter !== item.selectedChapter) {
        await changeChapter(item.selectedChapter);
    }

    const targetVerseNum = item.verse.verse ?? item.verse.verse_number;
    const vsIndex = state.verses.findIndex(v => (v.verse ?? v.verse_number) === targetVerseNum || v.text === item.verse.text);
    if (vsIndex !== -1) {
        selectVerse(vsIndex);
        scrollToActiveVerse();
    } else {
        state.selectedVerse = item.verse;
        socket.emit('sendData', { type: 'bible', data: state });
    }

    renderQueue();
}

if (btn_add_to_queue) {
    btn_add_to_queue.addEventListener('click', addToQueue);
}

// Initial queue render
renderQueue();


// clock current time
const clock=document.getElementById('clock');
if (clock) setInterval(()=>{
    const date=new Date();
    const hours=date.getHours();
    const minutes=date.getMinutes()<10?'0'+date.getMinutes():date.getMinutes();
    const seconds=date.getSeconds()<10?'0'+date.getSeconds():date.getSeconds();
    clock.textContent=`${hours}:${minutes}:${seconds}`;
}, 1000);

