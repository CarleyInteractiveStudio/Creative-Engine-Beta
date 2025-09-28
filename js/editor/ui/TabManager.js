// --- TabManager.js ---
// Manages tabbing systems for editor panels.

const availableTabs = {
    'inspector-panel': ['Tile Palette'],
    'assets-panel': ['Animation', 'Animator Controller']
    // Add more panels and available tabs here
};

const openWindows = {}; // To store functions that create/return content for tabs

export function registerWindow(name, openFunction) {
    openWindows[name] = openFunction;
}

export function initialize() {
    document.querySelectorAll('.editor-panel').forEach(panel => {
        const tabBar = panel.querySelector('.panel-tab-bar');
        const addTabBtn = panel.querySelector('.panel-add-tab-btn');

        if (tabBar) {
            tabBar.addEventListener('click', (e) => {
                if (e.target.matches('.panel-tab-btn')) {
                    const tabId = e.target.dataset.tabId;
                    switchTab(panel, tabId);
                }
            });
        }

        if (addTabBtn) {
            addTabBtn.addEventListener('click', (e) => {
                showAddTabMenu(e.target);
            });
        }
    });
}

function switchTab(panel, tabId) {
    const tabBar = panel.querySelector('.panel-tab-bar');
    const contentArea = panel.querySelector('.panel-content-area');

    // Deactivate all tabs and content in this panel
    tabBar.querySelectorAll('.panel-tab-btn').forEach(btn => btn.classList.remove('active'));
    contentArea.querySelectorAll('.panel-content').forEach(content => content.classList.remove('active'));

    // Activate the selected one
    const tabButton = tabBar.querySelector(`[data-tab-id="${tabId}"]`);
    const contentElement = contentArea.querySelector(`#${tabId}`);

    if (tabButton) tabButton.classList.add('active');
    if (contentElement) contentElement.classList.add('active');
}

function showAddTabMenu(button) {
    const panelId = button.dataset.panelId;
    const panel = document.getElementById(panelId);
    const tabsForPanel = availableTabs[panelId] || [];

    // Simple context menu for now
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.display = 'block';

    const rect = button.getBoundingClientRect();
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom}px`;

    const list = document.createElement('ul');
    tabsForPanel.forEach(tabName => {
        const item = document.createElement('li');
        item.textContent = tabName;
        item.addEventListener('click', () => {
            if (openWindows[tabName]) {
                const { id, element } = openWindows[tabName]();
                addTab(panel, tabName, id, element);
            }
            document.body.removeChild(menu);
        });
        list.appendChild(item);
    });

    if (tabsForPanel.length === 0) {
        const item = document.createElement('li');
        item.textContent = 'No hay ventanas disponibles';
        item.style.color = '#888';
        list.appendChild(item);
    }

    menu.appendChild(list);
    document.body.appendChild(menu);

    // Hide menu on next click
    setTimeout(() => {
        document.addEventListener('click', () => document.body.removeChild(menu), { once: true });
    }, 0);
}

function addTab(panel, tabName, tabId, contentElement) {
    const tabBar = panel.querySelector('.panel-tab-bar');
    const contentArea = panel.querySelector('.panel-content-area');

    // Check if tab already exists
    if (tabBar.querySelector(`[data-tab-id="${tabId}"]`)) {
        switchTab(panel, tabId);
        return;
    }

    // Create new tab button
    const newTabBtn = document.createElement('button');
    newTabBtn.className = 'panel-tab-btn';
    newTabBtn.dataset.tabId = tabId;
    newTabBtn.textContent = tabName;
    tabBar.appendChild(newTabBtn);

    // Add content to content area
    contentElement.id = tabId;
    contentElement.classList.add('panel-content');
    contentArea.appendChild(contentElement);

    // Switch to the new tab
    switchTab(panel, tabId);
}