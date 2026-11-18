function setMobileTestament(testament) {
    const booksList = document.querySelector('.books_list');
    if (!booksList) return;
    booksList.dataset.testament = testament;

    document.querySelectorAll('.mobile_testament_tabs button').forEach(button => {
        const isActive = button.textContent.toLowerCase().startsWith(testament);
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', String(isActive));
    });
}

function setMobilePage(page) {
    document.body.dataset.mobilePage = page;
    document.querySelectorAll('.mobile_navigation button').forEach(button => {
        const isActive = button.dataset.page === page;
        button.classList.toggle('active', isActive);
        button.toggleAttribute('aria-current', isActive);
    });
}

const mobileMenuToggle = document.getElementById('mobile_menu_toggle');
const mobileSystemMenu = document.getElementById('mobile_system_menu');

mobileMenuToggle?.addEventListener('click', () => {
    const expanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
    mobileMenuToggle.setAttribute('aria-expanded', String(!expanded));
    mobileMenuToggle.setAttribute('aria-label', expanded ? 'Open system menu' : 'Close system menu');
    mobileSystemMenu.hidden = expanded;
});

mobileSystemMenu?.addEventListener('click', event => {
    if (!event.target.closest('a')) return;
    mobileSystemMenu.hidden = true;
    mobileMenuToggle?.setAttribute('aria-expanded', 'false');
    mobileMenuToggle?.setAttribute('aria-label', 'Open system menu');
});

document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.mobile_menu_wrap') && mobileSystemMenu && mobileMenuToggle) {
        mobileSystemMenu.hidden = true;
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        mobileMenuToggle.setAttribute('aria-label', 'Open system menu');
    }
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobileSystemMenu && mobileMenuToggle) {
        mobileSystemMenu.hidden = true;
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        mobileMenuToggle.setAttribute('aria-label', 'Open system menu');
        mobileMenuToggle.focus();
    }
});

const mobileBooks = document.querySelector('.books_list');
if (mobileBooks) {
    const bookObserver = new MutationObserver(() => {
        const activeBook = mobileBooks.querySelector('li.active');
        if (!activeBook) return;
        setMobileTestament(activeBook.closest('.books_new') ? 'new' : 'old');
    });
    bookObserver.observe(mobileBooks, { attributes: true, subtree: true, attributeFilter: ['class'] });
}

document.getElementById('search_results')?.addEventListener('click', () => setMobilePage('bible'));
document.getElementById('history_list')?.addEventListener('click', () => setMobilePage('bible'));
document.getElementById('queue_list')?.addEventListener('click', () => setMobilePage('bible'));
document.getElementById('chapter_number')?.addEventListener('click', event => {
    if (event.target.closest('span')) setMobilePage('bible');
});