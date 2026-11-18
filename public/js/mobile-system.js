document.querySelectorAll('[data-mobile-view-button]').forEach(button => {
    button.addEventListener('click', () => {
        const view = button.dataset.mobileViewButton;
        document.body.dataset.mobileView = view;
        document.querySelectorAll('[data-mobile-view-button]').forEach(tab => {
            const active = tab === button;
            tab.classList.toggle('active', active);
            tab.toggleAttribute('aria-current', active);
        });
    });
});

document.addEventListener('pointerdown', event => {
    if (!(event.target instanceof Element)) return;
    document.querySelectorAll('.mobile_tool_menu[open], .mobile_system_menu[open]').forEach(menu => {
        if (!menu.contains(event.target)) menu.open = false;
    });
});

document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    if (!event.target.closest('.mobile_tool_menu_panel a, .mobile_system_menu_panel a')) return;
    document.querySelectorAll('.mobile_tool_menu[open], .mobile_system_menu[open]').forEach(menu => {
        menu.open = false;
    });
});

document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.mobile_tool_menu[open], .mobile_system_menu[open]').forEach(menu => {
        menu.open = false;
        menu.querySelector('summary')?.focus();
    });
});