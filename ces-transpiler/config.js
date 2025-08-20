document.addEventListener('DOMContentLoaded', () => {

    // --- Lógica de Pestañas ---
    const tabs = document.querySelectorAll('.tab-link');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // --- Lógica para Logos Dinámicos ---
    const logoList = document.getElementById('logo-list');
    const addLogoBtn = document.getElementById('add-logo-btn');
    let logoId = 0;

    addLogoBtn.addEventListener('click', () => {
        logoId++;
        const newItem = document.createElement('div');
        newItem.classList.add('dynamic-list-item');
        newItem.innerHTML = `
            <div class="form-group">
                <label for="logo-file-${logoId}">Archivo de Logo</label>
                <input type="file" id="logo-file-${logoId}" class="logo-file-input" accept="image/*">
            </div>
            <div class="form-group">
                <label for="logo-duration-${logoId}">Duración (segundos)</label>
                <input type="number" id="logo-duration-${logoId}" class="logo-duration-input" min="1" max="10" value="3">
            </div>
            <button class="btn-remove" data-id="${logoId}">&times;</button>
        `;
        logoList.appendChild(newItem);
    });

    logoList.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove')) {
            e.target.parentElement.remove();
        }
    });

    // --- Lógica para Controles (Input Manager) Dinámicos ---
    const inputMapList = document.getElementById('input-map-list');
    const addInputMapBtn = document.getElementById('add-input-map-btn');
    let inputId = 0;

    addInputMapBtn.addEventListener('click', () => {
        inputId++;
        const newItem = document.createElement('div');
        newItem.classList.add('dynamic-list-item');
        newItem.innerHTML = `
             <div class="form-group">
                <label for="input-action-${inputId}">Nombre de la Acción</label>
                <input type="text" id="input-action-${inputId}" class="input-action-name" placeholder="Ej: Saltar">
            </div>
            <div class="form-group">
                <label for="input-key-${inputId}">Tecla Asignada</label>
                <input type="text" id="input-key-${inputId}" class="input-key-binding" placeholder="Ej: Space">
            </div>
            <button class="btn-remove" data-id="${inputId}">&times;</button>
        `;
        inputMapList.appendChild(newItem);
    });

    inputMapList.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove')) {
            e.target.parentElement.remove();
        }
    });


    // --- Lógica para Guardar y Generar JSON ---
    const saveConfigBtn = document.getElementById('save-config-btn');
    const jsonOutputContainer = document.getElementById('json-output-container');
    const jsonOutput = document.getElementById('json-output');

    saveConfigBtn.addEventListener('click', () => {
        const config = {
            general: {
                gameName: document.getElementById('game-name').value,
                version: document.getElementById('game-version').value,
                author: document.getElementById('author-name').value,
                packageId: document.getElementById('package-id').value,
                icon: document.getElementById('game-icon').files[0]?.name || null,
            },
            graphics: {
                shadows: document.getElementById('enable-shadows').checked,
                splashScreen: document.getElementById('splash-screen').files[0]?.name || null,
                sceneBackgrounds: {} // Simulación
            },
            startupLogos: [],
            security: {
                antiTampering: document.getElementById('enable-anti-tampering').checked,
                encryptionKey: document.getElementById('encryption-key').value,
                keystore: {
                    author: document.getElementById('keystore-author').value,
                    password: document.getElementById('keystore-password').value,
                }
            },
            inputManager: []
        };

        // Recopilar logos
        document.querySelectorAll('#logo-list .dynamic-list-item').forEach(item => {
            config.startupLogos.push({
                file: item.querySelector('.logo-file-input').files[0]?.name || null,
                duration: parseInt(item.querySelector('.logo-duration-input').value, 10)
            });
        });

        // Recopilar mapa de inputs
        document.querySelectorAll('#input-map-list .dynamic-list-item').forEach(item => {
             config.inputManager.push({
                action: item.querySelector('.input-action-name').value,
                key: item.querySelector('.input-key-binding').value
            });
        });

        jsonOutput.textContent = JSON.stringify(config, null, 2);
        jsonOutputContainer.classList.remove('hidden');
    });

});
