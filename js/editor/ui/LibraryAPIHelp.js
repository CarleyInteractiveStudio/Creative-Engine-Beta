let dom = {};

function openModal() {
    if (dom.modal) {
        dom.modal.classList.add('is-open');
    }
}

function closeModal() {
    if (dom.modal) {
        dom.modal.classList.remove('is-open');
    }
}

export function initialize() {
    dom = {
        modal: document.getElementById('library-api-help-modal'),
        closeBtn: document.querySelector('#library-api-help-modal .close-button'),
        openMenuBtn: document.getElementById('menu-library-api'),
        openCreatorBtn: document.getElementById('library-creator-help-btn')
    };

    if (dom.closeBtn) {
        dom.closeBtn.addEventListener('click', closeModal);
    }
    if (dom.openMenuBtn) {
        dom.openMenuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });
    }
    if (dom.openCreatorBtn) {
        dom.openCreatorBtn.addEventListener('click', openModal);
    }
}
