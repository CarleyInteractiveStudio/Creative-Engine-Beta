
    const renderComponentList = (list, container) => {
        list.forEach(({ ley, index }) => {
            try {
                let componentHTML = '';
                const componentName = ley.constructor.name;
                const icon = componentIcons[componentName] || 'settings';
        const iconHTML = `<span class="component-icon">${getIconHTML(icon)}</span>`;

        if (ley instanceof Components.TextureRender) {
            let dimensionsHTML = '';
            if (ley.shape === 'Rectangle' || ley.shape === 'Triangle' || ley.shape === 'Capsule') {
                dimensionsHTML = `
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_DIMENSIONS">${L.get('PROP_DIMENSIONS', 'Dimensions')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="TextureRender" data-prop="width" value="${ley.width}" title="${L.get('PROP_WIDTH', 'Width')}">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="TextureRender" data-prop="height" value="${ley.height}" title="${L.get('PROP_HEIGHT', 'Height')}">
                        </div>
                    </div>
                `;
            } else if (ley.shape === 'Circle') {
                dimensionsHTML = `
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_RADIUS">${L.get('PROP_RADIUS', 'Radius')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="TextureRender" data-prop="radius" value="${ley.radius}" title="${L.get('PROP_RADIUS', 'Radius')}">
                        </div>
                    </div>
                `;
            }

            componentHTML = `
                ${renderComponentHeader(L.get('TEXTURE_RENDER', "Texture Render"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_SHAPE">${L.get('PROP_SHAPE', 'Shape')}</label>
                        <div class="prop-inputs">
                            <select class="prop-input inspector-re-render" data-component="TextureRender" data-prop="shape">
                                <option value="Rectangle" ${ley.shape === 'Rectangle' ? 'selected' : ''} data-i18n="RECTANGLE">${L.get('RECTANGLE', 'Rectangle')}</option>
                                <option value="Circle" ${ley.shape === 'Circle' ? 'selected' : ''} data-i18n="CIRCLE">${L.get('CIRCLE', 'Circle')}</option>
                                <option value="Triangle" ${ley.shape === 'Triangle' ? 'selected' : ''} data-i18n="TRIANGLE">${L.get('TRIANGLE', 'Triangle')}</option>
                                <option value="Capsule" ${ley.shape === 'Capsule' ? 'selected' : ''} data-i18n="CAPSULE">${L.get('CAPSULE', 'Capsule')}</option>
                            </select>
                        </div>
                    </div>
                    ${dimensionsHTML}
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_COLOR">${L.get('PROP_COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="TextureRender" data-prop="color" value="${ley.color || '#ffffff'}" style="width: 30px; padding: 0; border: none; height: 20px;">
                            <input type="text" autocomplete="off" class="prop-input hex-input" data-component="TextureRender" data-prop="color" value="${ley.color || '#ffffff'}" style="flex-grow: 1; font-family: monospace;">
                        </div>
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="PROP_TEXTURE">${L.get('PROP_TEXTURE', 'Texture')}</label>
                        ${renderPropertyDropper('Sprite', ley.texturePath, 'data-component="TextureRender" data-prop="texturePath"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_ORDER_IN_LAYER">${L.get('PROP_ORDER_IN_LAYER', 'Order in Layer')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" data-component="TextureRender" data-prop="orderInLayer" value="${ley.orderInLayer || 0}">
                    </div>
                    <hr>
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="TextureRender" data-prop="billboard" ${ley.billboard ? 'checked' : ''}>
                        <label data-i18n="PROP_BILLBOARD">Billboard (Mirar siempre a cámara)</label>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.VerticalLayoutGroup || ley instanceof Components.HorizontalLayoutGroup) {
            const isVertical = ley instanceof Components.VerticalLayoutGroup;
            const compName = isVertical ? 'VerticalLayoutGroup' : 'HorizontalLayoutGroup';
            const title = isVertical ? L.get('VERTICAL_LAYOUT', "Vertical Layout") : L.get('HORIZONTAL_LAYOUT', "Horizontal Layout");
            componentHTML = `
                ${renderComponentHeader(title, icon, index)}
                <div class="component-content">
                    <div class="inspector-section-header"><span data-i18n="PADDING">${L.get('PADDING', 'Padding')}</span></div>
                    <div class="prop-row-multi">
                        <span>L</span><input type="number" autocomplete="off" class="prop-input" data-component="${compName}" data-prop="padding.left" value="${ley.padding.left}">
                        <span>R</span><input type="number" autocomplete="off" class="prop-input" data-component="${compName}" data-prop="padding.right" value="${ley.padding.right}">
                    </div>
                    <div class="prop-row-multi">
                        <span>T</span><input type="number" autocomplete="off" class="prop-input" data-component="${compName}" data-prop="padding.top" value="${ley.padding.top}">
                        <span>B</span><input type="number" autocomplete="off" class="prop-input" data-component="${compName}" data-prop="padding.bottom" value="${ley.padding.bottom}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SPACING">${L.get('SPACING', 'Espaciado')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="${compName}" data-prop="spacing" value="${ley.spacing}">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.GridLayoutGroup) {
            componentHTML = `
                ${renderComponentHeader(L.get('GRID_LAYOUT', "Grid Layout"), icon, index)}
                <div class="component-content">
                    <div class="inspector-section-header"><span data-i18n="PADDING">${L.get('PADDING', 'Padding')}</span></div>
                    <div class="prop-row-multi">
                        <span>L</span><input type="number" autocomplete="off" class="prop-input" data-component="GridLayoutGroup" data-prop="padding.left" value="${ley.padding.left}">
                        <span>R</span><input type="number" autocomplete="off" class="prop-input" data-component="GridLayoutGroup" data-prop="padding.right" value="${ley.padding.right}">
                    </div>
                    <div class="prop-row-multi">
                        <span>T</span><input type="number" autocomplete="off" class="prop-input" data-component="GridLayoutGroup" data-prop="padding.top" value="${ley.padding.top}">
                        <span>B</span><input type="number" autocomplete="off" class="prop-input" data-component="GridLayoutGroup" data-prop="padding.bottom" value="${ley.padding.bottom}">
                    </div>
                    <div class="inspector-section-header"><span data-i18n="CELL_SIZE">${L.get('CELL_SIZE', 'Cell Size')}</span></div>
                    <div class="prop-row-multi">
                        <span>W</span><input type="number" autocomplete="off" class="prop-input" data-component="GridLayoutGroup" data-prop="cellSize.width" value="${ley.cellSize.width}">
                        <span>H</span><input type="number" autocomplete="off" class="prop-input" data-component="GridLayoutGroup" data-prop="cellSize.height" value="${ley.cellSize.height}">
                    </div>
                    <div class="inspector-section-header"><span data-i18n="SPACING">${L.get('SPACING', 'Espaciado')}</span></div>
                    <div class="prop-row-multi">
                        <span>X</span><input type="number" autocomplete="off" class="prop-input" data-component="GridLayoutGroup" data-prop="spacing.x" value="${ley.spacing.x}">
                        <span>Y</span><input type="number" autocomplete="off" class="prop-input" data-component="GridLayoutGroup" data-prop="spacing.y" value="${ley.spacing.y}">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.ContentSizeFitter) {
             componentHTML = `
                ${renderComponentHeader(L.get('SIZE_FITTER', "Size Fitter"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="HORIZONTAL_FIT">${L.get('HORIZONTAL_FIT', 'Horizontal Fit')}</label>
                        <select class="prop-input" data-component="ContentSizeFitter" data-prop="horizontalFit">
                            <option value="Unconstrained" ${ley.horizontalFit === 'Unconstrained' ? 'selected' : ''} data-i18n="UNCONSTRAINED">${L.get('UNCONSTRAINED', 'Unconstrained')}</option>
                            <option value="Preferred Size" ${ley.horizontalFit === 'Preferred Size' ? 'selected' : ''} data-i18n="PREFERRED_SIZE">${L.get('PREFERRED_SIZE', 'Preferred Size')}</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="VERTICAL_FIT">${L.get('VERTICAL_FIT', 'Vertical Fit')}</label>
                        <select class="prop-input" data-component="ContentSizeFitter" data-prop="verticalFit">
                            <option value="Unconstrained" ${ley.verticalFit === 'Unconstrained' ? 'selected' : ''} data-i18n="UNCONSTRAINED">${L.get('UNCONSTRAINED', 'Unconstrained')}</option>
                            <option value="Preferred Size" ${ley.verticalFit === 'Preferred Size' ? 'selected' : ''} data-i18n="PREFERRED_SIZE">${L.get('PREFERRED_SIZE', 'Preferred Size')}</option>
                        </select>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.VideoPlayer) {
            componentHTML = `
                ${renderComponentHeader(L.get('VIDEO_PLAYER', "Video Player"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="VIDEO_SOURCE">${L.get('VIDEO_SOURCE', 'Video Source')}</label>
                        ${renderPropertyDropper('Video', ley.source, 'data-component="VideoPlayer" data-prop="source"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="VOLUMEN">${L.get('VOLUMEN', 'Volumen')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" data-component="VideoPlayer" data-prop="volume" value="${ley.volume}" min="0" max="1" step="0.01" style="flex-grow: 1;">
                            <span style="min-width: 30px; text-align: right;">${Math.round(ley.volume * 100)}%</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                         <label data-i18n="PLAYBACK_RATE">${L.get('PLAYBACK_RATE', 'Velocidad')}</label>
                         <input type="number" autocomplete="off" class="prop-input" data-component="VideoPlayer" data-prop="playbackRate" value="${ley.playbackRate}" step="0.1" min="0.1">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="VideoPlayer" data-prop="loop" ${ley.loop ? 'checked' : ''}>
                        <label data-i18n="BUCLE_LOOP">${L.get('BUCLE_LOOP', 'Bucle (Loop)')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="VideoPlayer" data-prop="playOnAwake" ${ley.playOnAwake ? 'checked' : ''}>
                        <label data-i18n="REPRODUCIR_AL_EMPEZAR">${L.get('REPRODUCIR_AL_EMPEZAR', 'Reproducir al Empezar')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="VideoPlayer" data-prop="muted" ${ley.muted ? 'checked' : ''}>
                        <label data-i18n="SILENCIAR">${L.get('SILENCIAR', 'Silenciado')}</label>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PRELOAD">${L.get('PRELOAD', 'Precarga')}</label>
                        <select class="prop-input" data-component="VideoPlayer" data-prop="preload">
                            <option value="auto" ${ley.preload === 'auto' ? 'selected' : ''} data-i18n="AUTO">Auto</option>
                            <option value="metadata" ${ley.preload === 'metadata' ? 'selected' : ''} data-i18n="METADATA">Metadata</option>
                            <option value="none" ${ley.preload === 'none' ? 'selected' : ''} data-i18n="NONE">None</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SCALING_MODE">${L.get('SCALING_MODE', 'Escalado')}</label>
                        <select class="prop-input" data-component="VideoPlayer" data-prop="scalingMode">
                            <option value="Fit" ${ley.scalingMode === 'Fit' ? 'selected' : ''} data-i18n="FIT">Fit</option>
                            <option value="Stretch" ${ley.scalingMode === 'Stretch' ? 'selected' : ''} data-i18n="STRETCH">Stretch</option>
                            <option value="Fill" ${ley.scalingMode === 'Fill' ? 'selected' : ''} data-i18n="FILL">Fill</option>
                        </select>
                    </div>
                    <button class="primary-btn inspector-action-btn" data-action="sync-video-size" data-ley-index="${index}" style="width: 100%; margin-top: 10px; font-weight: bold; border-radius: 4px;" title="${L.get('AJUSTAR_TAMANO_VIDEO_DESC', 'Ajusta el tamaño del objeto UI para que coincida con la resolución nativa del video.')}">${L.get('AJUSTAR_TAMANO_AL_VIDEO', 'Ajustar Tamaño al Video')}</button>
                </div>
            `;
        } else if (ley instanceof Components.Health) {
            let warningHTML = '';
            if (ley.deathAnimation && !selectedMateria.getComponentByName('Animator')) {
                warningHTML = renderDependencyWarning('Health', 'Animator');
            }

            componentHTML = `
                ${renderComponentHeader(L.get('HEALTH_COMPONENT', "Vida (Health)"), icon, index)}
                <div class="component-content">
                    ${warningHTML}
                    <div class="prop-row-multi">
                        <label data-i18n="MAX_HEALTH">${L.get('MAX_HEALTH', 'Vida Máxima')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" min="1" data-component="Health" data-prop="maxHealth" value="${ley.maxHealth}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="CURRENT_HEALTH">${L.get('CURRENT_HEALTH', 'Vida Actual')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" min="0" data-component="Health" data-prop="currentHealth" value="${ley.currentHealth}">
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="DEATH_ANIMATION">${L.get('DEATH_ANIMATION', 'Animación Muerte')}</label>
                        ${renderPropertyDropper('Animation', ley.deathAnimation, 'data-component="Health" data-prop="deathAnimation"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="FREEZE_FRAME">${L.get('FREEZE_FRAME', 'Fotograma Congelado')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" min="-1" data-component="Health" data-prop="freezeFrame" value="${ley.freezeFrame}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="DESTRUCTION_DELAY">${L.get('DESTRUCTION_DELAY', 'Tiempo Desaparición')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="0.1" min="-1" data-component="Health" data-prop="destructionDelay" value="${ley.destructionDelay}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Health" data-prop="disableMovementOnDeath" ${ley.disableMovementOnDeath ? 'checked' : ''}>
                        <label data-i18n="DISABLE_MOVEMENT">${L.get('DISABLE_MOVEMENT', 'Desactivar Movimiento')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Health" data-prop="destroyOnDeath" ${ley.destroyOnDeath ? 'checked' : ''}>
                        <label data-i18n="DESTROY_ON_DEATH">${L.get('DESTROY_ON_DEATH', 'Destruir al morir')}</label>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.Attack) {
            let warningHTML = '';
            if (ley.attacks.some(atk => atk.sound) && !selectedMateria.getComponentByName('AudioSource')) {
                warningHTML = renderDependencyWarning('Attack', 'AudioSource');
            }

            componentHTML = `
                ${renderComponentHeader(L.get('ATTACK_COMPONENT', "Ataque (Attack)"), icon, index)}
                <div class="component-content">
                    ${warningHTML}
                    <div class="inspector-row">
                        <label data-i18n="COLLIDER_MATERIA">${L.get('COLLIDER_MATERIA', 'Materia Colisionador')}</label>
                        ${renderPropertyDropper('Materia', ley.colliderMateria, 'data-component="Attack" data-prop="colliderMateria"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="COOLDOWN">${L.get('COOLDOWN', 'Enfriamiento')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="0.1" min="0" data-component="Attack" data-prop="cooldown" value="${ley.cooldown}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="CYCLE_KEY">${L.get('CYCLE_KEY', 'Tecla Ciclo')}</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="Attack" data-prop="cycleKey" value="${ley.cycleKey || ''}">
                    </div>
                    <div class="inspector-section-header">
                        <span data-i18n="ATTACKS">${L.get('ATTACKS', 'Ataques')}</span>
                    </div>
                    <div class="layer-list">
                        ${ley.attacks.map((atk, aIdx) => `
                            <div class="layer-item" style="flex-direction: column; align-items: stretch; gap: 5px; padding: 10px;">
                                <div style="display: flex; justify-content: space-between;">
                                    <strong>${L.get('ATTACK', 'Ataque')} ${aIdx}</strong>
                                    <button class="layer-btn remove" onclick="const atk = window.SceneManager.currentScene.findMateriaById(${selectedMateria.id}).getComponent(window.Components.Attack); atk.attacks.splice(${aIdx}, 1); window.updateInspector();">-</button>
                                </div>
                                <div class="prop-row-multi">
                                    <label>Key</label>
                                    <input type="text" autocomplete="off" class="prop-input" data-component="Attack" data-prop="attacks.${aIdx}.key" value="${atk.key || ''}">
                                </div>
                                <div class="inspector-row">
                                    <label>Anim</label>
                                    ${renderPropertyDropper('Animation', atk.animation, `data-component="Attack" data-prop="attacks.${aIdx}.animation"`)}
                                </div>
                                <div class="inspector-row">
                                    <label>Sound</label>
                                    ${renderPropertyDropper('Audio', atk.sound, `data-component="Attack" data-prop="attacks.${aIdx}.sound"`)}
                                </div>
                                <div class="prop-row-multi">
                                    <label>${L.get('DAMAGE', 'Daño')}</label>
                                    <input type="number" autocomplete="off" class="prop-input" data-component="Attack" data-prop="attacks.${aIdx}.damage" value="${atk.damage}">
                                </div>
                                <div class="prop-row-multi">
                                    <label>${L.get('PUSH_FORCE', 'Empuje')}</label>
                                    <input type="number" autocomplete="off" class="prop-input" data-component="Attack" data-prop="attacks.${aIdx}.pushForce" value="${atk.pushForce}">
                                </div>
                                <div class="prop-row-multi">
                                    <label>${L.get('DURATION', 'Duración')}</label>
                                    <input type="number" autocomplete="off" class="prop-input" step="0.05" data-component="Attack" data-prop="attacks.${aIdx}.duration" value="${atk.duration}">
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <button class="add-event-btn" onclick="const atk = window.SceneManager.currentScene.findMateriaById(${selectedMateria.id}).getComponent(window.Components.Attack); atk.attacks.push({key: 'j', animation: '', damage: 10, pushForce: 5, duration: 0.2}); window.updateInspector();">+</button>
                </div>
            `;
        } else if (ley instanceof Components.ProgressBar) {
            componentHTML = `
                ${renderComponentHeader(L.get('PROGRESS_BAR', "Barra de Progreso"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="TARGET_MATERIA">${L.get('TARGET_MATERIA', 'Materia Objetivo')}</label>
                        ${renderPropertyDropper('Materia', ley.targetMateria, 'data-component="ProgressBar" data-prop="targetMateria"')}
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="FILL_MATERIA">${L.get('FILL_MATERIA', 'Materia Relleno')}</label>
                        ${renderPropertyDropper('Materia', ley.fillMateria, 'data-component="ProgressBar" data-prop="fillMateria"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="FULL_SIZE">${L.get('FULL_SIZE', 'Tamaño Total')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="ProgressBar" data-prop="fullSize" value="${ley.fullSize}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="ORIENTATION">${L.get('ORIENTATION', 'Orientación')}</label>
                        <select class="prop-input" data-component="ProgressBar" data-prop="orientation">
                            <option value="Horizontal" ${ley.orientation === 'Horizontal' ? 'selected' : ''} data-i18n="HORIZONTAL">${L.get('HORIZONTAL', 'Horizontal')}</option>
                            <option value="Vertical" ${ley.orientation === 'Vertical' ? 'selected' : ''} data-i18n="VERTICAL">${L.get('VERTICAL', 'Vertical')}</option>
                        </select>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="ProgressBar" data-prop="isSceneLoading" ${ley.isSceneLoading ? 'checked' : ''}>
                        <label data-i18n="USE_AS_LOADING_BAR">${L.get('USE_AS_LOADING_BAR', 'Usar como Barra de Carga')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="ProgressBar" data-prop="interactable" ${ley.interactable ? 'checked' : ''}>
                        <label data-i18n="INTERACTABLE">${L.get('INTERACTABLE', 'Interactuable (Slider)')}</label>
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label data-i18n="VALUE">${L.get('VALUE', 'Valor')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="ProgressBar" data-prop="value" value="${ley.value}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="MAX_VALUE">${L.get('MAX_VALUE', 'Valor Máximo')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="ProgressBar" data-prop="maxValue" value="${ley.maxValue}">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.UIScrollRect) {
            componentHTML = `
                ${renderComponentHeader(L.get('SCROLL_RECT', "Rect de Desplazamiento"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="CONTENT_MATERIA">${L.get('CONTENT_MATERIA', 'Materia de Contenido')}</label>
                        ${renderPropertyDropper('Materia', ley.contentMateria, 'data-component="UIScrollRect" data-prop="contentMateria"')}
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="UIScrollRect" data-prop="horizontal" ${ley.horizontal ? 'checked' : ''}>
                        <label data-i18n="HORIZONTAL">${L.get('HORIZONTAL', 'Horizontal')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="UIScrollRect" data-prop="vertical" ${ley.vertical ? 'checked' : ''}>
                        <label data-i18n="VERTICAL">${L.get('VERTICAL', 'Vertical')}</label>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SCROLL_SENSITIVITY">${L.get('SCROLL_SENSITIVITY', 'Sensibilidad')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="UIScrollRect" data-prop="scrollSensitivity" value="${ley.scrollSensitivity}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="INERTIA">${L.get('INERTIA', 'Inercia')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="0.01" min="0" max="1" data-component="UIScrollRect" data-prop="inertia" value="${ley.inertia}">
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="V_SCROLLBAR">${L.get('V_SCROLLBAR', 'Barra Vertical')}</label>
                        ${renderPropertyDropper('Materia', ley.verticalScrollbar, 'data-component="UIScrollRect" data-prop="verticalScrollbar"')}
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="H_SCROLLBAR">${L.get('H_SCROLLBAR', 'Barra Horizontal')}</label>
                        ${renderPropertyDropper('Materia', ley.horizontalScrollbar, 'data-component="UIScrollRect" data-prop="horizontalScrollbar"')}
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.UIMask) {
            componentHTML = `
                ${renderComponentHeader(L.get('UI_MASK', "Máscara UI"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="UIMask" data-prop="showGizmo" ${ley.showGizmo ? 'checked' : ''}>
                        <label data-i18n="SHOW_GIZMO">${L.get('SHOW_GIZMO', 'Mostrar Gizmo')}</label>
                    </div>
                    <p class="info-text">${L.get('MASK_INFO', 'Recorta los elementos hijos dentro del área de este objeto.')}</p>
                </div>
            `;
        } else if (ley instanceof Components.UICollider) {
            componentHTML = `
                ${renderComponentHeader(L.get('UI_COLLIDER', "Colisionador UI"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="UICollider" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label data-i18n="IS_TRIGGER">${L.get('IS_TRIGGER', 'Es Gatillo (Trigger)')}</label>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.Patrol) {
            componentHTML = `
                ${renderComponentHeader(L.get('PATROL_COMPONENT', "Patrulla (Patrol)"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="VELOCIDAD">${L.get('VELOCIDAD', 'Velocidad')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" data-component="Patrol" data-prop="speed" value="${ley.speed}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="DISTANCE">${L.get('DISTANCE', 'Distancia')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" data-component="Patrol" data-prop="distance" value="${ley.distance}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PAUSE_TIME">${L.get('PAUSE_TIME', 'Tiempo Pausa (s)')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="0.1" min="0" data-component="Patrol" data-prop="pauseTime" value="${ley.pauseTime}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Patrol" data-prop="horizontal" ${ley.horizontal ? 'checked' : ''}>
                        <label data-i18n="HORIZONTAL">${L.get('HORIZONTAL', 'Horizontal')}</label>
                    </div>
                    <hr>
                    <div class="inspector-section-header"><span>${L.get('ANIMATIONS', 'Animaciones')}</span></div>
                    <div class="prop-row-multi">
                        <label>Idle</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="Patrol" data-prop="idleAnim" value="${ley.idleAnim || ''}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Move</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="Patrol" data-prop="moveAnim" value="${ley.moveAnim || ''}">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.Transform) {
            if (selectedMateria.getComponent(Components.UITransform)) {
                return;
            }
            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('TRANSFORM', "Posición (Transform)"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_POSITION">${L.get('PROP_POSITION', 'Position')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="Transform" data-prop="localPosition.x" value="${ley.localPosition.x}" title="X">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="Transform" data-prop="localPosition.y" value="${ley.localPosition.y}" title="Y">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="Transform" data-prop="localPosition.z" value="${ley.localPosition.z || 0}" title="Z">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_ROTATION">${L.get('PROP_ROTATION', 'Rotation')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="Transform" data-prop="localRotation.x" value="${ley.localRotation?.x || 0}" title="X">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="Transform" data-prop="localRotation.y" value="${ley.localRotation?.y || 0}" title="Y">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="Transform" data-prop="localRotation.z" value="${(typeof ley.localRotation === 'number' ? ley.localRotation : ley.localRotation?.z) || 0}" title="Z">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_SCALE">${L.get('PROP_SCALE', 'Scale')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="Transform" data-prop="localScale.x" value="${ley.localScale.x}" title="X">
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="Transform" data-prop="localScale.y" value="${ley.localScale.y}" title="Y">
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="Transform" data-prop="localScale.z" value="${ley.localScale.z || 1}" title="Z">
                        </div>
                    </div>
                    <div class="inspector-section-header"><span>${L.get('ORIENTATION', 'Orientación')}</span></div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Transform" data-prop="flipX" ${ley.flipX ? 'checked' : ''}>
                        <label data-i18n="PROP_FLIP_X">${L.get('PROP_FLIP_X', 'Voltear Horizontal')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Transform" data-prop="flipY" ${ley.flipY ? 'checked' : ''}>
                        <label data-i18n="PROP_FLIP_Y">${L.get('PROP_FLIP_Y', 'Voltear Vertical')}</label>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.PolygonCollider2D) {
            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('POLYGON_COLLIDER_2D', "Polygon Collider 2D"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="PolygonCollider2D" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label data-i18n="IS_TRIGGER">${L.get('IS_TRIGGER', 'Is Trigger')}</label>
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label data-i18n="OFFSET">${L.get('OFFSET', 'Offset')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="PolygonCollider2D" data-prop="offset.x" value="${ley.offset.x}" title="${L.get('OFFSET_X', 'Offset X')}">
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="PolygonCollider2D" data-prop="offset.y" value="${ley.offset.y}" title="${L.get('OFFSET_Y', 'Offset Y')}">
                        </div>
                    </div>
                    <div class="inspector-field-group">
                        <label data-i18n="VERTICES">${L.get('VERTICES', 'Vértices')} (${ley.vertices?.length || 0})</label>
                        <p class="field-description" data-i18n="VERTICES_DESC">${L.get('VERTICES_DESC', 'La edición manual de vértices se habilitará próximamente. Actualmente se genera automáticamente para terrenos.')}</p>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.UITransform) {
            let anchorGridHTML = '';
            const anchorTitles = [
                L.get('TOP_LEFT', 'Top Left'), L.get('TOP_CENTER', 'Top Center'), L.get('TOP_RIGHT', 'Top Right'),
                L.get('MIDDLE_LEFT', 'Middle Left'), L.get('MIDDLE_CENTER', 'Middle Center'), L.get('MIDDLE_RIGHT', 'Middle Right'),
                L.get('BOTTOM_LEFT', 'Bottom Left'), L.get('BOTTOM_CENTER', 'Bottom Center'), L.get('BOTTOM_RIGHT', 'Bottom Right')
            ];
            for (let i = 0; i < 9; i++) {
                anchorGridHTML += `
                    <button
                        class="anchor-grid-button ${ley.anchorPoint === i ? 'active' : ''}"
                        data-anchor="${i}"
                        title="${anchorTitles[i]}">
                    </button>
                `;
            }

            componentHTML = `
            ${renderComponentHeader(L.get('UI_TRANSFORM', "UI Transform"), icon, index)}
            <div class="component-content">
                 <div class="inspector-row">
                    <label data-i18n="ANCHOR_POINT">${L.get('ANCHOR_POINT', 'Punto de Anclaje')}</label>
                    <div class="anchor-grid-container">
                        ${anchorGridHTML}
                    </div>
                </div>
                <div class="prop-row-multi">
                    <label data-i18n="POSICION">${L.get('POSICION', 'Position')}</label>
                    <div class="prop-inputs">
                        <input type="number" autocomplete="off" class="prop-input" step="1" data-component="UITransform" data-prop="position.x" value="${ley.position.x}" title="${L.get('POSITION_X_OFFSET', 'Position X Offset')}">
                        <input type="number" autocomplete="off" class="prop-input" step="1" data-component="UITransform" data-prop="position.y" value="${ley.position.y}" title="${L.get('POSITION_Y_OFFSET', 'Position Y Offset')}">
                    </div>
                </div>
                <div class="prop-row-multi">
                    <label data-i18n="PROP_DIMENSIONS">${L.get('PROP_DIMENSIONS', 'Size')}</label>
                    <div class="prop-inputs">
                        <input type="number" autocomplete="off" class="prop-input" step="1" data-component="UITransform" data-prop="size.width" value="${ley.size.width}" title="${L.get('WIDTH', 'Width')}">
                        <input type="number" autocomplete="off" class="prop-input" step="1" data-component="UITransform" data-prop="size.height" value="${ley.size.height}" title="${L.get('HEIGHT', 'Height')}">
                    </div>
                </div>
                <div class="prop-row-multi">
                    <label data-i18n="PROP_PIVOT">${L.get('PROP_PIVOT', 'Pivot')}</label>
                    <div class="prop-inputs">
                        <input type="number" autocomplete="off" class="prop-input" step="0.01" data-component="UITransform" data-prop="pivot.x" value="${ley.pivot?.x ?? 0.5}" title="${L.get('PIVOT_X', 'Pivot X')}">
                        <input type="number" autocomplete="off" class="prop-input" step="0.01" data-component="UITransform" data-prop="pivot.y" value="${ley.pivot?.y ?? 0.5}" title="${L.get('PIVOT_Y', 'Pivot Y')}">
                        <button class="small-btn" data-action="auto-pivot-ui" title="${L.get('AUTO_PIVOT_DESC', 'Ajustar al Contenido (Auto-Pivot)')}" style="font-size: 10px; padding: 2px 4px;">AUTO</button>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.UIImage) {
            componentHTML = `${renderComponentHeader(L.get('UI_IMAGE', "UI Image"), icon, index)}
            <div class="component-content">
                <div class="inspector-row">
                    <label data-i18n="SOURCE">${L.get('SOURCE', 'Source')}</label>
                    ${renderPropertyDropper('Sprite', ley.source, 'data-component="UIImage" data-prop="source"')}
                </div>
                <div class="prop-row-multi">
                    <label data-i18n="COLOR">${L.get('COLOR', 'Color')}</label>
                    <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="UIImage" data-prop="color" value="${ley.color && ley.color.startsWith('#') ? ley.color : '#ffffff'}" style="width: 30px; padding: 0; border: none; height: 20px;">
                        <input type="text" autocomplete="off" class="prop-input hex-input" data-component="UIImage" data-prop="color" value="${ley.color || '#ffffff'}" style="flex-grow: 1; font-family: monospace;">
                    </div>
                </div>
                    <div class="prop-row-multi">
                        <label data-i18n="OPACITY">${L.get('OPACITY', 'Opacidad')}</label>
                        <input type="range" class="prop-input" min="0" max="1" step="0.01" data-component="UIImage" data-prop="opacity" value="${ley.opacity !== undefined ? ley.opacity : 1.0}">
                    </div>
            </div>`;
        } else if (ley instanceof Components.UIText) {
            const fontName = ley.fontAssetPath ? ley.fontAssetPath.split('/').pop() : L.get('DEFAULT', 'Default');
            componentHTML = `
                ${renderComponentHeader(L.get('UI_TEXT', "UI Text"), "type", index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="TEXTO">${L.get('TEXTO', 'Text')}</label>
                        <textarea class="prop-input" data-component="UIText" data-prop="text" rows="3">${ley.text}</textarea>
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="FONT">${L.get('FONT', 'Font')}</label>
                        ${renderPropertyDropper('Font', ley.fontAssetPath, 'data-component="UIText" data-prop="fontAssetPath"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="FONT_SIZE">${L.get('FONT_SIZE', 'Font Size')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="UIText" data-prop="fontSize" value="${ley.fontSize}" min="1">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_COLOR">${L.get('PROP_COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="UIText" data-prop="color" value="${ley.color || '#ffffff'}" style="width: 30px; padding: 0; border: none; height: 20px;">
                            <input type="text" autocomplete="off" class="prop-input hex-input" data-component="UIText" data-prop="color" value="${ley.color || '#ffffff'}" style="flex-grow: 1; font-family: monospace;">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="ALIGNMENT">${L.get('ALIGNMENT', 'Alignment')}</label>
                        <select class="prop-input" data-component="UIText" data-prop="horizontalAlign">
                            <option value="left" ${ley.horizontalAlign === 'left' ? 'selected' : ''}>${L.get('LEFT', 'Left')}</option>
                            <option value="center" ${ley.horizontalAlign === 'center' ? 'selected' : ''}>${L.get('CENTER', 'Center')}</option>
                            <option value="right" ${ley.horizontalAlign === 'right' ? 'selected' : ''}>${L.get('RIGHT', 'Right')}</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="TRANSFORM">${L.get('TRANSFORM', 'Transform')}</label>
                        <select class="prop-input" data-component="UIText" data-prop="textTransform">
                            <option value="none" ${ley.textTransform === 'none' ? 'selected' : ''}>${L.get('NONE', 'None')}</option>
                            <option value="uppercase" ${ley.textTransform === 'uppercase' ? 'selected' : ''}>${L.get('UPPERCASE', 'UPPERCASE')}</option>
                            <option value="lowercase" ${ley.textTransform === 'lowercase' ? 'selected' : ''}>${L.get('LOWERCASE', 'lowercase')}</option>
                        </select>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.Canvas) {
            const isWorldSpace = ley.renderMode === 'World Space';
            const ssResolution = ley.referenceResolution || { width: 800, height: 600 };

            componentHTML = `
                ${renderComponentHeader(L.get('CANVAS', "Canvas"), "image", index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="RENDER_MODE">${L.get('RENDER_MODE', 'Render Mode')}</label>
                        <select class="prop-input inspector-re-render" data-component="Canvas" data-prop="renderMode">
                            <option value="Screen Space" ${!isWorldSpace ? 'selected' : ''} data-i18n="SCREEN_SPACE">${L.get('SCREEN_SPACE', 'Screen Space')}</option>
                            <option value="World Space" ${isWorldSpace ? 'selected' : ''} data-i18n="WORLD_SPACE">${L.get('WORLD_SPACE', 'World Space')}</option>
                        </select>
                    </div>

                    <!-- World Space Properties -->
                    <div class="prop-row-multi" data-canvas-props="world" style="display: ${isWorldSpace ? 'flex' : 'none'};">
                        <label data-i18n="PROP_DIMENSIONS">${L.get('PROP_DIMENSIONS', 'Size')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" data-component="Canvas" data-prop="size.x" value="${ley.size.x}">
                            <input type="number" autocomplete="off" class="prop-input" data-component="Canvas" data-prop="size.y" value="${ley.size.y}">
                        </div>
                    </div>

                    <!-- Screen Space Properties -->
                    <div class="prop-row-multi" data-canvas-props="screen" style="display: ${!isWorldSpace ? 'flex' : 'none'};">
                        <label data-i18n="REFERENCE_RES">${L.get('REFERENCE_RES', 'Reference Res')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" data-component="Canvas" data-prop="referenceResolution.width" value="${ssResolution.width}">
                            <input type="number" autocomplete="off" class="prop-input" data-component="Canvas" data-prop="referenceResolution.height" value="${ssResolution.height}">
                        </div>
                    </div>
                     <div class="prop-row-multi" data-canvas-props="screen" style="display: ${!isWorldSpace ? 'flex' : 'none'};">
                        <label data-i18n="SCREEN_MATCH">${L.get('SCREEN_MATCH', 'Screen Match')}</label>
                         <select class="prop-input" data-component="Canvas" data-prop="screenMatchMode">
                            <option value="Match Width Or Height" ${ley.screenMatchMode === 'Match Width Or Height' ? 'selected' : ''} data-i18n="MATCH_WIDTH_HEIGHT">${L.get('MATCH_WIDTH_HEIGHT', 'Match Width Or Height')}</option>
                        </select>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Canvas" data-prop="showGrid" ${ley.showGrid ? 'checked' : ''}>
                        <label data-i18n="SHOW_GRID_GIZMO">${L.get('SHOW_GRID_GIZMO', 'Show Grid Gizmo')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Canvas" data-prop="scaleChildren" ${ley.scaleChildren ? 'checked' : ''}>
                        <label data-i18n="SCALE_CHILDREN">${L.get('SCALE_CHILDREN', 'Scale Children')}</label>
                    </div>
                </div>`;
        } else if (ley instanceof Components.Button) {
            const isColorTint = ley.transition === 'Color Tint';
            const isSpriteSwap = ley.transition === 'Sprite Swap';
            const isAnimation = ley.transition === 'Animation';
            componentHTML = `
                ${renderComponentHeader(L.get('BUTTON', "Button"), "mouse-pointer", index)}
                <div class="component-content">
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Button" data-prop="interactable" ${ley.interactable ? 'checked' : ''}>
                        <label data-i18n="INTERACTABLE">${L.get('INTERACTABLE', 'Interactable')}</label>
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label data-i18n="TRANSITION">${L.get('TRANSITION', 'Transition')}</label>
                        <select class="prop-input inspector-re-render" data-component="Button" data-prop="transition">
                            <option value="None" ${ley.transition === 'None' ? 'selected' : ''} data-i18n="NONE">${L.get('NONE', 'None')}</option>
                            <option value="Color Tint" ${isColorTint ? 'selected' : ''} data-i18n="COLOR_TINT">${L.get('COLOR_TINT', 'Color Tint')}</option>
                            <option value="Sprite Swap" ${isSpriteSwap ? 'selected' : ''} data-i18n="SPRITE_SWAP">${L.get('SPRITE_SWAP', 'Sprite Swap')}</option>
                            <option value="Animation" ${isAnimation ? 'selected' : ''} data-i18n="ANIMATION">${L.get('ANIMATION', 'Animation')}</option>
                        </select>
                    </div>
                    <div id="color-tint-settings" style="display: ${isColorTint ? 'block' : 'none'};">
                        <div class="prop-row-multi">
                            <label data-i18n="NORMAL_COLOR">${L.get('NORMAL_COLOR', 'Normal Color')}</label>
                            <input type="color" class="prop-input" data-component="Button" data-prop="colors.normalColor" value="${ley.colors.normalColor}">
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="PRESSED_COLOR">${L.get('PRESSED_COLOR', 'Pressed Color')}</label>
                            <input type="color" class="prop-input" data-component="Button" data-prop="colors.pressedColor" value="${ley.colors.pressedColor}">
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="DISABLED_COLOR">${L.get('DISABLED_COLOR', 'Disabled Color')}</label>
                            <input type="color" class="prop-input" data-component="Button" data-prop="colors.disabledColor" value="${ley.colors.disabledColor}">
                        </div>
                    </div>
                    <div id="sprite-swap-settings" style="display: ${isSpriteSwap ? 'block' : 'none'};">
                        <div class="inspector-row">
                            <label data-i18n="HIGHLIGHTED_SPRITE">${L.get('HIGHLIGHTED_SPRITE', 'Highlighted Sprite')}</label>
                            ${renderPropertyDropper('Sprite', ley.spriteSwap.highlightedSprite, 'data-component="Button" data-prop="spriteSwap.highlightedSprite"')}
                        </div>
                        <div class="inspector-row">
                            <label data-i18n="PRESSED_SPRITE">${L.get('PRESSED_SPRITE', 'Pressed Sprite')}</label>
                            ${renderPropertyDropper('Sprite', ley.spriteSwap.pressedSprite, 'data-component="Button" data-prop="spriteSwap.pressedSprite"')}
                        </div>
                        <div class="inspector-row">
                            <label data-i18n="DISABLED_SPRITE">${L.get('DISABLED_SPRITE', 'Disabled Sprite')}</label>
                            ${renderPropertyDropper('Sprite', ley.spriteSwap.disabledSprite, 'data-component="Button" data-prop="spriteSwap.disabledSprite"')}
                        </div>
                    </div>
                    <div id="animation-settings" style="display: ${isAnimation ? 'block' : 'none'};">
                        <div class="prop-row-multi">
                            <label data-i18n="HIGHLIGHTED_TRIGGER">${L.get('HIGHLIGHTED_TRIGGER', 'Highlighted Trigger')}</label>
                            <input type="text" autocomplete="off" class="prop-input" data-component="Button" data-prop="animationTriggers.highlightedTrigger" value="${ley.animationTriggers.highlightedTrigger}">
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="PRESSED_TRIGGER">${L.get('PRESSED_TRIGGER', 'Pressed Trigger')}</label>
                            <input type="text" autocomplete="off" class="prop-input" data-component="Button" data-prop="animationTriggers.pressedTrigger" value="${ley.animationTriggers.pressedTrigger}">
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="DISABLED_TRIGGER">${L.get('DISABLED_TRIGGER', 'Disabled Trigger')}</label>
                            <input type="text" autocomplete="off" class="prop-input" data-component="Button" data-prop="animationTriggers.disabledTrigger" value="${ley.animationTriggers.disabledTrigger}">
                        </div>
                    </div>
                     <div class="inspector-section-header">
                        <span data-i18n="ON_CLICK">${L.get('ON_CLICK', 'On Click ()')}</span>
                    </div>
                    <div class="onclick-event-list">
                        ${ley.onClick.map((event, index) => {
                            let functionsDropdown = `<option value="">${L.get('SIN_FUNCION', 'No Function')}</option>`;

                            if (event.targetMateriaId !== null && event.targetMateriaId !== undefined) {
                                const targetMateria = window.SceneManager.currentScene.findMateriaById(event.targetMateriaId);
                                if (targetMateria) {
                                    functionsDropdown = getFunctionOptionsHTML(targetMateria, event.functionName);
                                }
                            }

                            return `
                            <div class="onclick-event-item" data-event-index="${index}">
                                ${renderPropertyDropper('Materia', event.targetMateriaId, `data-prop="onClick.${index}.targetMateriaId"`)}
                                <select class="prop-input" data-component="Button" data-prop="onClick.${index}.functionName">
                                    ${functionsDropdown}
                                </select>
                                <button class="remove-event-btn" data-action="remove-onclick-event" data-index="${index}">-</button>
                            </div>
                            `;
                        }).join('')}
                    </div>
                    <button class="add-event-btn" data-action="add-onclick-event">+</button>
                </div>
            `;
        }
        else if (ley instanceof Components.CircleCollider2D) {
            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('CIRCLE_COLLIDER_2D', "Circle Collider 2D"), 'disc', index)}
                <div class="component-content">
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="CircleCollider2D" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label data-i18n="IS_TRIGGER">${L.get('IS_TRIGGER', 'Is Trigger')}</label>
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label data-i18n="OFFSET">${L.get('OFFSET', 'Offset')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="CircleCollider2D" data-prop="offset.x" value="${ley.offset.x}" title="${L.get('OFFSET_X', 'Offset X')}">
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="CircleCollider2D" data-prop="offset.y" value="${ley.offset.y}" title="${L.get('OFFSET_Y', 'Offset Y')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="RADIUS">${L.get('RADIUS', 'Radius')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="CircleCollider2D" data-prop="radius" value="${ley.radius}" title="${L.get('RADIUS', 'Radius')}">
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.SpriteRenderer) {
            let spriteSelectorHTML = '';
            // If a .ceSprite asset is loaded, show the dropdown to select a specific sprite
            if (ley.spriteSheet && ley.spriteSheet.sprites && Object.keys(ley.spriteSheet.sprites).length > 0) {
                const options = Object.keys(ley.spriteSheet.sprites)
                    .map(spriteName => `<option value="${spriteName}" ${ley.spriteName === spriteName ? 'selected' : ''}>${spriteName}</option>`)
                    .join('');

                spriteSelectorHTML = `
                    <div class="inspector-row">
                        <label for="sprite-name-select" data-i18n="SPRITE">${L.get('SPRITE', 'Sprite')}</label>
                        <select id="sprite-name-select" class="prop-input inspector-re-render" data-component="SpriteRenderer" data-prop="spriteName">
                            ${options}
                        </select>
                    </div>
                `;
            }

            componentHTML = `
                ${renderComponentHeader(L.get('SPRITE_RENDERER', "Sprite Renderer"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="PROP_SOURCE">${L.get('PROP_SOURCE', 'Source')}</label>
                        ${renderPropertyDropper('Sprite', ley.spriteAssetPath || ley.source, 'data-component="SpriteRenderer" data-prop="source"')}
                    </div>
                    ${spriteSelectorHTML}
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_COLOR">${L.get('PROP_COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="SpriteRenderer" data-prop="color" value="${ley.color || '#ffffff'}" style="width: 30px; padding: 0; border: none; height: 20px;">
                            <input type="text" autocomplete="off" class="prop-input hex-input" data-component="SpriteRenderer" data-prop="color" value="${ley.color || '#ffffff'}" style="flex-grow: 1; font-family: monospace;">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_OPACITY">${L.get('PROP_OPACITY', 'Opacity')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" data-component="SpriteRenderer" data-prop="opacity" value="${ley.opacity ?? 1}" min="0" max="1" step="0.01" style="flex-grow: 1;" oninput="this.nextElementSibling.innerText = Math.round(this.value * 100) + '%'">
                            <span style="min-width: 30px; text-align: right;">${Math.round((ley.opacity ?? 1) * 100)}%</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_PIVOT">${L.get('PROP_PIVOT', 'Pivot')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="0.01" data-component="SpriteRenderer" data-prop="pivot.x" value="${ley.pivot?.x ?? 0.5}" title="Pivot X">
                            <input type="number" autocomplete="off" class="prop-input" step="0.01" data-component="SpriteRenderer" data-prop="pivot.y" value="${ley.pivot?.y ?? 0.5}" title="Pivot Y">
                            <button class="small-btn" data-action="center-sprite-pivot" title="Centrar Pivot (0.5, 0.5)">${getIconHTML('target')}</button>
                            <button class="small-btn" data-action="auto-pivot-sprite" title="Ajustar al Contenido (Auto-Pivot)" style="font-size: 10px; padding: 2px 4px;">AUTO</button>
                        </div>
                    </div>
                    <div class="inspector-row">
                        <label></label>
                        <button class="inspector-btn" data-action="reset-sprite-scale" style="width: 100%; margin-top: 4px;" data-i18n="PROP_RESET_SCALE">${L.get('PROP_RESET_SCALE', 'Restablecer Escala (1:1)')}</button>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_ORDER_IN_LAYER">${L.get('PROP_ORDER_IN_LAYER', 'Order in Layer')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" data-component="SpriteRenderer" data-prop="orderInLayer" value="${ley.orderInLayer || 0}">
                    </div>
                    <hr>
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="SpriteRenderer" data-prop="billboard" ${ley.billboard ? 'checked' : ''}>
                        <label data-i18n="PROP_BILLBOARD">Billboard (Mirar siempre a cámara)</label>
                    </div>
                </div>`;
        }
        else if (ley instanceof Components.CreativeScript) {
            let publicVarsHTML = '';
            const metadata = CES_Transpiler.getScriptMetadata(ley.scriptName);

            if (metadata && metadata.publicVars) {
                for (const pv of metadata.publicVars) {
                    const currentValue = ley.publicVars[pv.name] ?? pv.defaultValue;
                    publicVarsHTML += `
                        <div class="prop-row-multi">
                            <label>${pv.name}</label>
                            ${renderPublicVarInput(pv, currentValue, 'CreativeScript', ley.scriptName)}
                        </div>
                    `;
                }
            }

            componentHTML = `
                ${renderComponentHeader(`<a href="#">${ley.scriptName}</a>`, icon, index)}
                <div class="component-content">
                    ${publicVarsHTML || '<p class="field-description">Este script no tiene variables públicas.</p>'}
                </div>
            `;
        } else if (ley instanceof Components.Animator) {
            componentHTML = `
                ${renderComponentHeader(L.get('ANIMATOR', "Animator"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="ANIMATION_CLIP">${L.get('ANIMATION_CLIP', 'Animation Clip')}</label>
                        ${renderPropertyDropper('Animation', ley.animationClipPath, 'data-component="Animator" data-prop="animationClipPath"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SPEED">${L.get('SPEED', 'Speed')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" min="0" data-component="Animator" data-prop="speed" value="${ley.speed}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Animator" data-prop="loop" ${ley.loop ? 'checked' : ''}>
                        <label data-i18n="LOOP">${L.get('LOOP', 'Loop')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Animator" data-prop="playOnAwake" ${ley.playOnAwake ? 'checked' : ''}>
                        <label data-i18n="REPRODUCIR_AL_EMPEZAR">${L.get('REPRODUCIR_AL_EMPEZAR', 'Play On Awake')}</label>
                    </div>
                </div>`;
        } else if (ley instanceof Components.AnimatorController) {
            let statesListHTML = `<p class="field-description">${L.get('HINT_ASIGNAR_CONTROLADOR', 'Asigna un Controller para ver sus estados.')}</p>`;
            if (ley.controller && ley.states.size > 0) {
                statesListHTML = '<ul>';
                for (const stateName of ley.states.keys()) {
                    statesListHTML += `<li>${stateName}</li>`;
                }
                statesListHTML += '</ul>';
            }
            componentHTML = `
                ${renderComponentHeader(L.get('ANIMATOR_CONTROLLER', "Animator Controller"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="CONTROLLER">${L.get('CONTROLLER', 'Controller')}</label>
                        ${renderPropertyDropper('AnimatorController', ley.controllerPath, 'data-component="AnimatorController" data-prop="controllerPath"')}
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="AnimatorController" data-prop="smartMode" ${ley.smartMode ? 'checked' : ''}>
                        <label data-i18n="SMART_MODE_DIRECTIONS">${L.get('SMART_MODE_DIRECTIONS', 'Modo Inteligente (Direcciones)')}</label>
                    </div>

                    <div class="inspector-section-header"><span data-i18n="RESPONSE_CONFIG">${L.get('RESPONSE_CONFIG', 'Configuración de Respuesta')}</span></div>
                    <div class="prop-row-multi">
                        <label title="${L.get('DEADZONE_DESC', 'Movimiento mínimo para activar dirección')}" data-i18n="DEADZONE">${L.get('DEADZONE', 'Sensibilidad (Deadzone)')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="0.01" min="0" max="1" data-component="AnimatorController" data-prop="deadZone" value="${ley.deadZone ?? 0.1}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="${L.get('START_DELAY_DESC', 'Tiempo de espera para empezar animación')}" data-i18n="START_DELAY">${L.get('START_DELAY', 'Retraso Inicio (s)')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="0.01" min="0" data-component="AnimatorController" data-prop="startDelay" value="${ley.startDelay ?? 0.02}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="${L.get('STOP_DELAY_DESC', 'Tiempo de espera para volver a parado')}" data-i18n="STOP_DELAY">${L.get('STOP_DELAY', 'Retraso Parada (s)')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="0.01" min="0" data-component="AnimatorController" data-prop="stopDelay" value="${ley.stopDelay ?? 0.02}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="${L.get('DIRECTION_DELAY_DESC', 'Tiempo de espera para cambiar dirección')}" data-i18n="DIRECTION_DELAY">${L.get('DIRECTION_DELAY', 'Retraso Giro (s)')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="0.01" min="0" data-component="AnimatorController" data-prop="directionDelay" value="${ley.directionDelay ?? 0.05}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="${L.get('STOP_BUFFER_DESC', 'Tiempo que la animación sigue activa tras soltar')}" data-i18n="STOP_BUFFER">${L.get('STOP_BUFFER', 'Buffer Inercia (s)')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="0.01" min="0" data-component="AnimatorController" data-prop="stopBuffer" value="${ley.stopBuffer ?? 0.05}">
                    </div>

                    <div class="inspector-field-group">
                        <label data-i18n="STATES">${L.get('STATES', 'States')}</label>
                        ${statesListHTML}
                    </div>
                </div>`;
        } else if (ley instanceof Components.Camera) {
            const projection = ley.projection || 'Perspective';
            const clearFlags = ley.clearFlags || 'SolidColor';

            componentHTML = `
                ${renderComponentHeader(L.get('CAMERA', "Camera"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="DEPTH">${L.get('DEPTH', 'Depth')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" data-component="Camera" data-prop="depth" value="${ley.depth || 0}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="CLEAR_FLAGS">${L.get('CLEAR_FLAGS', 'Clear Flags')}</label>
                        <div class="prop-inputs">
                            <select class="prop-input inspector-re-render" data-component="Camera" data-prop="clearFlags">
                                <option value="SolidColor" ${clearFlags === 'SolidColor' ? 'selected' : ''} data-i18n="SOLID_COLOR">${L.get('SOLID_COLOR', 'Solid Color')}</option>
                                <option value="Skybox" ${clearFlags === 'Skybox' ? 'selected' : ''} data-i18n="SKYBOX">${L.get('SKYBOX', 'Skybox')}</option>
                                <option value="DontClear" ${clearFlags === 'DontClear' ? 'selected' : ''} data-i18n="DONT_CLEAR">${L.get('DONT_CLEAR', "Don't Clear")}</option>
                            </select>
                        </div>
                    </div>

                    <div class="prop-row-multi" style="display: ${clearFlags === 'SolidColor' ? 'flex' : 'none'};">
                        <label data-i18n="BACKGROUND">${L.get('BACKGROUND', 'Background')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="Camera" data-prop="backgroundColor" value="${ley.backgroundColor || '#1e293b'}">
                        </div>
                    </div>

                    <div class="prop-row-multi">
                        <label data-i18n="CULLING_MASK">${L.get('CULLING_MASK', 'Culling Mask')}</label>
                        <div class="prop-inputs">
                            <button id="culling-mask-btn" class="prop-input-button">${getCullingMaskText(ley.cullingMask)}</button>
                        </div>
                    </div>

                    <div class="prop-row-multi">
                        <label data-i18n="PROJECTION">Proyección</label>
                        <div class="prop-inputs">
                            <select class="prop-input inspector-re-render" data-component="Camera" data-prop="projection">
                                <option value="Orthographic" ${projection === 'Orthographic' ? 'selected' : ''}>2D (Ortográfica)</option>
                                <option value="Perspective" ${projection === 'Perspective' ? 'selected' : ''}>3D (Perspectiva)</option>
                            </select>
                        </div>
                    </div>

                    <div class="prop-row-multi" style="display: ${projection === 'Perspective' ? 'flex' : 'none'};">
                        <label data-i18n="FOV">Campo de Visión (FOV)</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" data-component="Camera" data-prop="fov" value="${ley.fov || 60}" min="1" max="179">
                        </div>
                    </div>

                     <div class="prop-row-multi" style="display: ${projection === 'Orthographic' ? 'flex' : 'none'};">
                        <label data-i18n="SIZE_ZOOM">${L.get('SIZE_ZOOM', 'Size (Zoom)')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" data-component="Camera" data-prop="orthographicSize" value="${ley.orthographicSize || 5}" min="0.1">
                        </div>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.PointLight2D) {
            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('POINT_LIGHT_2D', "Point Light 2D"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_COLOR">${L.get('PROP_COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="PointLight2D" data-prop="color" value="${ley.color || '#ffffff'}" style="width: 30px; padding: 0; border: none; height: 20px;">
                            <input type="text" autocomplete="off" class="prop-input hex-input" data-component="PointLight2D" data-prop="color" value="${ley.color || '#ffffff'}" style="flex-grow: 1; font-family: monospace;">
                        </div>
                    </div>
                    ${renderLightColorPresets("PointLight2D")}
                    <div class="prop-row-multi">
                        <label data-i18n="INTENSITY">${L.get('INTENSITY', 'Intensidad')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.1" min="0" max="10" data-component="PointLight2D" data-prop="intensity" value="${ley.intensity}">
                            <span style="min-width: 30px; text-align: right;">${ley.intensity}</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="LIGHT_FILTER">${L.get('LIGHT_FILTER', 'Filtro Luz')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.01" min="0" max="1" data-component="PointLight2D" data-prop="filtroOpacidad" value="${ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0}">
                            <span style="min-width: 30px; text-align: right;">${Math.round((ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0) * 100)}%</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="RADIUS">${L.get('RADIUS', 'Radius')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="10" min="0" data-component="PointLight2D" data-prop="radius" value="${ley.radius}">
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.SpotLight2D) {
            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('SPOT_LIGHT_2D', "Spot Light 2D"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_COLOR">${L.get('PROP_COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="SpotLight2D" data-prop="color" value="${ley.color || '#ffffff'}" style="width: 30px; padding: 0; border: none; height: 20px;">
                            <input type="text" autocomplete="off" class="prop-input hex-input" data-component="SpotLight2D" data-prop="color" value="${ley.color || '#ffffff'}" style="flex-grow: 1; font-family: monospace;">
                        </div>
                    </div>
                    ${renderLightColorPresets("SpotLight2D")}
                    <div class="prop-row-multi">
                        <label data-i18n="INTENSITY">${L.get('INTENSITY', 'Intensidad')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.1" min="0" max="10" data-component="SpotLight2D" data-prop="intensity" value="${ley.intensity}">
                            <span style="min-width: 30px; text-align: right;">${ley.intensity}</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="LIGHT_FILTER">${L.get('LIGHT_FILTER', 'Filtro Luz')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.01" min="0" max="1" data-component="SpotLight2D" data-prop="filtroOpacidad" value="${ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0}">
                            <span style="min-width: 30px; text-align: right;">${Math.round((ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0) * 100)}%</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="RADIUS">${L.get('RADIUS', 'Radius')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="10" min="0" data-component="SpotLight2D" data-prop="radius" value="${ley.radius}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="ANGLE">${L.get('ANGLE', 'Angle')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="1" min="1" max="180" data-component="SpotLight2D" data-prop="angle" value="${ley.angle}">
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.FreeformLight2D) {
            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('FREEFORM_LIGHT_2D', "Freeform Light 2D"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_COLOR">${L.get('PROP_COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="FreeformLight2D" data-prop="color" value="${ley.color}">
                        </div>
                    </div>
                    ${renderLightColorPresets("FreeformLight2D")}
                    <div class="prop-row-multi">
                        <label data-i18n="INTENSITY">${L.get('INTENSITY', 'Intensidad')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.1" min="0" max="10" data-component="FreeformLight2D" data-prop="intensity" value="${ley.intensity}">
                            <span style="min-width: 30px; text-align: right;">${ley.intensity}</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="LIGHT_FILTER">${L.get('LIGHT_FILTER', 'Filtro Luz')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.01" min="0" max="1" data-component="FreeformLight2D" data-prop="filtroOpacidad" value="${ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0}">
                            <span style="min-width: 30px; text-align: right;">${Math.round((ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0) * 100)}%</span>
                        </div>
                    </div>
                    <hr>
                    <p class="field-description" data-i18n="VERTICES_EDIT_FUTURE">${L.get('VERTICES_EDIT_FUTURE', 'La edición de vértices se implementará en una futura actualización.')}</p>
                </div>
            </div>`;
        } else if (ley instanceof Components.Tilemap) {
            // Safeguard against corrupted layer data from old scene files
            if (!ley.layers || !Array.isArray(ley.layers)) {
                componentHTML = `
                    ${renderComponentHeader('Tilemap', 'map', index)}
                    <div class="component-content">
                        <p class="error-message">Los datos de las capas del Tilemap están corruptos. Vuelva a guardar la escena para intentar repararlos.</p>
                    </div>
                `;
            } else {
                let sizeInputHTML = '';
                if (ley.manualSize) {
                    sizeInputHTML = `
                        <div class="prop-row-multi">
                            <label data-i18n="PROP_DIMENSIONS">${L.get('PROP_DIMENSIONS', 'Size')}</label>
                            <div class="prop-inputs">
                                <input type="number" autocomplete="off" class="prop-input" step="1" min="1" data-component="Tilemap" data-prop="width" value="${ley.width}" title="Width">
                                <input type="number" autocomplete="off" class="prop-input" step="1" min="1" data-component="Tilemap" data-prop="height" value="${ley.height}" title="Height">
                            </div>
                        </div>
                    `;
                } else {
                    sizeInputHTML = `
                        <div class="prop-row-multi">
                            <label data-i18n="PROP_DIMENSIONS">${L.get('PROP_DIMENSIONS', 'Size')}</label>
                            <div class="prop-inputs">
                                <input type="number" autocomplete="off" class="prop-input" value="${ley.width}" readonly title="Width">
                                <input type="number" autocomplete="off" class="prop-input" value="${ley.height}" readonly title="Height">
                            </div>
                        </div>
                    `;
                }

                componentHTML = `
                    ${renderComponentHeader(L.get('TILEMAP', 'Tilemap'), 'map', index)}
                    <div class="component-content">
                        <div class="checkbox-field">
                            <input type="checkbox" id="tilemap-manual-size-toggle" data-component="Tilemap" ${ley.manualSize ? 'checked' : ''}>
                            <label for="tilemap-manual-size-toggle" data-i18n="MANUAL_SIZE">${L.get('MANUAL_SIZE', 'Tamaño Manual')}</label>
                        </div>
                        ${sizeInputHTML}
                        <hr>
                        <div class="layer-manager-ui">
                            <div class="layer-list-header">
                                <h5 data-i18n="LAYERS">${L.get('LAYERS', 'Capas')}</h5>
                                <div class="layer-controls">
                                    <button class="layer-btn add" data-action="add-layer" title="${L.get('ADD_LAYER', 'Añadir Capa')}">+</button>
                                    <button class="layer-btn remove" data-action="remove-layer" title="${L.get('REMOVE_SELECTED_LAYER', 'Eliminar Capa Seleccionada')}">-</button>
                                </div>
                            </div>
                            <div class="layer-list">
                                ${ley.layers.map((layer, index) => `
                                    <div class="layer-item ${index === ley.activeLayerIndex ? 'active' : ''}" data-action="select-layer" data-index="${index}">
                                        <div class="layer-item-main">
                                            <span>${L.get('LAYER', 'Capa')} ${index}</span>
                                            ${index === ley.activeLayerIndex ? `
                                                <div class="layer-pos-inputs">
                                                    <input type="number" autocomplete="off" class="prop-input small" step="1" data-component="Tilemap" data-prop="layers.${index}.position.x" value="${layer.position.x}" title="${L.get('LAYER_OFFSET_X', 'Layer Offset X')}">
                                                    <input type="number" autocomplete="off" class="prop-input small" step="1" data-component="Tilemap" data-prop="layers.${index}.position.y" value="${layer.position.y}" title="${L.get('LAYER_OFFSET_Y', 'Layer Offset Y')}">
                                                </div>
                                            ` : `
                                                <span class="layer-info">(X: ${layer.position.x}, Y: ${layer.position.y})</span>
                                            `}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
            }
        } else if (ley instanceof Components.TilemapRenderer) {
            componentHTML = `
                ${renderComponentHeader(L.get('TILEMAP_RENDERER', 'Tilemap Renderer'), 'brush', index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_ORDER_IN_LAYER">${L.get('PROP_ORDER_IN_LAYER', 'Order in Layer')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" data-component="TilemapRenderer" data-prop="orderInLayer" value="${ley.orderInLayer || 0}">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.TilemapCollider2D) {
            const tilemap = selectedMateria.getComponent(Components.Tilemap);
            let layerOptions = `<option value="-1">${L.get('NINGUNA', 'Ninguna')}</option>`;
            if (tilemap) {
                layerOptions = tilemap.layers.map((layer, index) =>
                    `<option value="${index}" ${ley.sourceLayerIndex === index ? 'selected' : ''}>${index}: ${layer.name}</option>`
                ).join('');
            }

            componentHTML = `
                ${renderComponentHeader(L.get('TILEMAP_COLLIDER_2D', 'Tilemap Collider 2D'), 'grid', index)}
                <div class="component-content">
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input inspector-re-render" data-component="TilemapCollider2D" data-prop="usarTodasLasCapas" ${ley.usarTodasLasCapas ? 'checked' : ''}>
                        <label data-i18n="USE_ALL_LAYERS">${L.get('USE_ALL_LAYERS', 'Usar todas las capas')}</label>
                    </div>
                    <div class="prop-row-multi" style="display: ${ley.usarTodasLasCapas ? 'none' : 'flex'};">
                        <label for="collider-source-layer" data-i18n="SOURCE_LAYER">${L.get('SOURCE_LAYER', 'Capa de Origen')}</label>
                        <select id="collider-source-layer" class="prop-input" data-component="TilemapCollider2D" data-prop="sourceLayerIndex">
                            ${layerOptions}
                        </select>
                    </div>
                    <hr>
                    <button class="primary-btn" data-action="generate-colliders" style="width: 100%;" data-i18n="GENERATE_COLLIDERS">${L.get('GENERATE_COLLIDERS', 'Generar Colisionadores')}</button>
                    <p class="field-description" style="margin-top: 8px;">${L.get('COLLIDERS_GENERATED', 'Colisionadores generados')}: ${ley.generatedColliders.length}</p>
                </div>
            `;
        } else if (ley instanceof Components.Grid) {
            // Ensure cellSize exists before trying to access its properties
            const cellSize = ley.cellSize || { x: 32, y: 32 };

            // Add a temporary, UI-only property to the component instance for the toggle state
            if (ley.isSimplified === undefined) {
                ley.isSimplified = (cellSize.x === cellSize.y);
            }

            let sizeInputHTML = '';
            if (ley.isSimplified) {
                sizeInputHTML = `
                    <div class="prop-row-multi">
                        <label data-i18n="CELL_SIZE">${L.get('CELL_SIZE', 'Cell Size')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="1" min="1" data-component="Grid" data-prop="simplifiedSize" value="${cellSize.x}">
                        </div>
                    </div>
                `;
            } else {
                sizeInputHTML = `
                    <div class="prop-row-multi">
                        <label data-i18n="CELL_SIZE">${L.get('CELL_SIZE', 'Cell Size')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="1" min="1" data-component="Grid" data-prop="cellSize.x" value="${cellSize.x}" title="X">
                            <input type="number" autocomplete="off" class="prop-input" step="1" min="1" data-component="Grid" data-prop="cellSize.y" value="${cellSize.y}" title="Y">
                        </div>
                    </div>
                `;
            }

            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('GRID', "Grid"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field">
                        <input type="checkbox" id="grid-simplified-toggle" data-component="Grid" ${ley.isSimplified ? 'checked' : ''}>
                        <label for="grid-simplified-toggle" data-i18n="SIMPLIFIED">${L.get('SIMPLIFIED', 'Simplificado')}</label>
                    </div>
                    ${sizeInputHTML}
                </div>
            </div>`;
        } else if (ley instanceof Components.CapsuleCollider2D) {
            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('CAPSULE_COLLIDER_2D', "Capsule Collider 2D"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="CapsuleCollider2D" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label data-i18n="IS_TRIGGER">${L.get('IS_TRIGGER', 'Is Trigger')}</label>
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label data-i18n="OFFSET">${L.get('OFFSET', 'Offset')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="CapsuleCollider2D" data-prop="offset.x" value="${ley.offset.x}" title="${L.get('OFFSET_X', 'Offset X')}">
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="CapsuleCollider2D" data-prop="offset.y" value="${ley.offset.y}" title="${L.get('OFFSET_Y', 'Offset Y')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_DIMENSIONS">${L.get('PROP_DIMENSIONS', 'Size')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="CapsuleCollider2D" data-prop="size.x" value="${ley.size.x}" title="${L.get('SIZE_X', 'Size X')}">
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="CapsuleCollider2D" data-prop="size.y" value="${ley.size.y}" title="${L.get('SIZE_Y', 'Size Y')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="DIRECTION">${L.get('DIRECTION', 'Direction')}</label>
                        <div class="prop-inputs">
                            <select class="prop-input inspector-re-render" data-component="CapsuleCollider2D" data-prop="direction">
                                <option value="Vertical" ${ley.direction === 'Vertical' ? 'selected' : ''} data-i18n="VERTICAL">${L.get('VERTICAL', 'Vertical')}</option>
                                <option value="Horizontal" ${ley.direction === 'Horizontal' ? 'selected' : ''} data-i18n="HORIZONTAL">${L.get('HORIZONTAL', 'Horizontal')}</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.SpriteLight2D) {
            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('SPRITE_LIGHT_2D', "Sprite Light 2D"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="SPRITE">${L.get('SPRITE', 'Sprite')}</label>
                        ${renderPropertyDropper('Sprite', ley.source, 'data-component="SpriteLight2D" data-prop="source"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_COLOR">${L.get('PROP_COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="SpriteLight2D" data-prop="color" value="${ley.color}">
                        </div>
                    </div>
                    ${renderLightColorPresets("SpriteLight2D")}
                    <div class="prop-row-multi">
                        <label data-i18n="INTENSITY">${L.get('INTENSITY', 'Intensidad')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.1" min="0" max="10" data-component="SpriteLight2D" data-prop="intensity" value="${ley.intensity}">
                            <span style="min-width: 30px; text-align: right;">${ley.intensity}</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="LIGHT_FILTER">${L.get('LIGHT_FILTER', 'Filtro Luz')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.01" min="0" max="1" data-component="SpriteLight2D" data-prop="filtroOpacidad" value="${ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0}">
                            <span style="min-width: 30px; text-align: right;">${Math.round((ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0) * 100)}%</span>
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.Rigidbody2D) {
            let warningHTML = '';
            if (ley.bodyType !== 'Static' && !selectedMateria.leyes.some(l => l.constructor.name.includes('Collider2D'))) {
                warningHTML = `
                    <div class="inspector-warning-box">
                        <div class="warning-header">${getIconHTML('alert-circle')} <span>${L.get('AVISO', 'Aviso')}</span></div>
                        <div class="warning-text">${L.get('RIGIDBODY_COLLIDER_WARNING', 'El Rigidbody necesita un Colisionador para interactuar físicamente.')}</div>
                        <button class="warning-btn" onclick="const mtr = window.getSelectedMateria(); if(mtr) { mtr.addComponent(new window.Components.BoxCollider2D(mtr)); window.updateInspector(); window.updateScene(); }">
                            + BoxCollider2D
                        </button>
                    </div>
                `;
            }

            const rigidbody = ley; // Rename for clarity as suggested in review
            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('RIGIDBODY_2D', "Rigidbody 2D"), icon, index)}
                <div class="component-content" style="padding-top:0;">${warningHTML}</div>
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="BODY_TYPE">${L.get('BODY_TYPE', 'Body Type')}</label>
                        <select class="prop-input" data-component="Rigidbody2D" data-prop="bodyType">
                            <option value="Dynamic" ${rigidbody.bodyType === 'Dynamic' ? 'selected' : ''} data-i18n="DYNAMIC">Dynamic</option>
                            <option value="Kinematic" ${rigidbody.bodyType === 'Kinematic' ? 'selected' : ''} data-i18n="KINEMATIC">Kinematic</option>
                            <option value="Static" ${rigidbody.bodyType === 'Static' ? 'selected' : ''} data-i18n="STATIC">Static</option>
                        </select>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Rigidbody2D" data-prop="simulated" ${rigidbody.simulated ? 'checked' : ''}>
                        <label data-i18n="ACTIVO">${L.get('ACTIVO', 'Simulated')}</label>
                    </div>
                    <div class="inspector-field-group">
                        <div class="prop-row-multi">
                            <label data-i18n="MASS">${L.get('MASS', 'Mass')}</label>
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="Rigidbody2D" data-prop="mass" value="${rigidbody.mass}">
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="GRAVITY_SCALE">${L.get('GRAVITY_SCALE', 'Gravity Scale')}</label>
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="Rigidbody2D" data-prop="gravityScale" value="${rigidbody.gravityScale}">
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="BOUNCINESS">${L.get('BOUNCINESS', 'Rebote (Bounciness)')}</label>
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" min="0" max="1" data-component="Rigidbody2D" data-prop="rebote" value="${rigidbody.rebote || 0}">
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="DAMPING">${L.get('DAMPING', 'Angular Drag')}</label>
                            <input type="number" autocomplete="off" class="prop-input" step="0.01" min="0" data-component="Rigidbody2D" data-prop="angularDrag" value="${rigidbody.angularDrag || 0}">
                        </div>
                    </div>
                    <div class="inspector-field-group">
                        <label data-i18n="CONSTRAINTS">${L.get('CONSTRAINTS', 'Constraints')}</label>
                        <div class="checkbox-field" style="padding-left: 10px;">
                            <input type="checkbox" class="prop-input" data-component="Rigidbody2D" data-prop="constraints.freezeRotation" ${rigidbody.constraints.freezeRotation ? 'checked' : ''}>
                            <label data-i18n="FREEZE_ROTATION">${L.get('FREEZE_ROTATION', 'Freeze Rotation Z')}</label>
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.CustomComponent) {
            let publicVarsHTML = '';
            if (ley.definition && ley.definition.metadata && ley.definition.metadata.publicVars) {
                for (const pv of ley.definition.metadata.publicVars) {
                    const currentValue = ley.publicVars[pv.name] ?? pv.defaultValue;
                     publicVarsHTML += `
                        <div class="prop-row-multi">
                            <label>${pv.name}</label>
                            ${renderPublicVarInput(pv, currentValue, 'CustomComponent', ley.id)}
                        </div>
                    `;
                }
            }
            componentHTML = `
                ${renderComponentHeader(ley.definition.nombre, 'settings', index)}
                <div class="component-content">
                    ${publicVarsHTML || '<p class="field-description">Este componente no tiene propiedades públicas.</p>'}
                </div>
            `;
        } else if (ley instanceof Components.DrawingOrder) {
            componentHTML = `
                ${renderComponentHeader(L.get('DRAWING_ORDER_COMPONENT', "Orden de Dibujo"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="ORDER">${L.get('ORDER', 'Orden')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" data-component="DrawingOrder" data-prop="order" value="${ley.order || 0}">
                    </div>
                    <p class="field-description" data-i18n="DRAWING_ORDER_DESC">${L.get('DRAWING_ORDER_DESC', 'Valores altos delante, bajos detrás. Sobrescribe el orden por defecto.')}</p>
                </div>
            `;
        } else if (ley instanceof Components.BoxCollider2D) {
            let warningHTML = '';
            if (!selectedMateria.getComponentByName('Rigidbody2D')) {
                warningHTML = renderDependencyWarning('BoxCollider2D', 'Rigidbody2D');
            }

            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('BOX_COLLIDER_2D', "Box Collider 2D"), icon, index)}
                <div class="component-content" style="padding-top:0;">${warningHTML}</div>
                <div class="component-content">
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="BoxCollider2D" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label data-i18n="IS_TRIGGER">${L.get('IS_TRIGGER', 'Is Trigger')}</label>
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label data-i18n="OFFSET">${L.get('OFFSET', 'Offset')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="BoxCollider2D" data-prop="offset.x" value="${ley.offset.x}" title="${L.get('OFFSET_X', 'Offset X')}">
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="BoxCollider2D" data-prop="offset.y" value="${ley.offset.y}" title="${L.get('OFFSET_Y', 'Offset Y')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_DIMENSIONS">${L.get('PROP_DIMENSIONS', 'Size')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="BoxCollider2D" data-prop="size.x" value="${ley.size.x}" title="${L.get('SIZE_X', 'Size X')}">
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="BoxCollider2D" data-prop="size.y" value="${ley.size.y}" title="${L.get('SIZE_Y', 'Size Y')}">
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.Movement) {
            let warningHTML = '';
            if (ley.useRigidbody && !selectedMateria.getComponentByName('Rigidbody2D')) {
                warningHTML = renderDependencyWarning('Movement', 'Rigidbody2D');
            }

            componentHTML = `
                ${renderComponentHeader(L.get('MOVEMENT_BASIC', "Movimiento (Básico)"), icon, index)}
                <div class="component-content">
                    ${warningHTML}
                    <div class="inspector-section-header"><span>${L.get('CONTROLS', 'Controles')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="KEYS_UP_DOWN">${L.get('KEYS_UP_DOWN', 'Teclas (Arriba/Abajo)')}</label>
                        <div class="prop-inputs">
                            <input type="text" autocomplete="off" class="prop-input" data-component="Movement" data-prop="upKey" value="${ley.upKey}" title="${L.get('UP', 'Arriba')}">
                            <input type="text" autocomplete="off" class="prop-input" data-component="Movement" data-prop="downKey" value="${ley.downKey}" title="${L.get('DOWN', 'Abajo')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="KEYS_LEFT_RIGHT">${L.get('KEYS_LEFT_RIGHT', 'Teclas (Izq/Der)')}</label>
                        <div class="prop-inputs">
                            <input type="text" autocomplete="off" class="prop-input" data-component="Movement" data-prop="leftKey" value="${ley.leftKey}" title="${L.get('LEFT', 'Izquierda')}">
                            <input type="text" autocomplete="off" class="prop-input" data-component="Movement" data-prop="rightKey" value="${ley.rightKey}" title="${L.get('RIGHT', 'Derecha')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="JUMP_KEY">${L.get('JUMP_KEY', 'Tecla Salto')}</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="Movement" data-prop="jumpKey" value="${ley.jumpKey}">
                    </div>
                    <hr>
                    <div class="inspector-section-header"><span>${L.get('SETTINGS', 'Configuración')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="SPEED">${L.get('SPEED', 'Velocidad')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="Movement" data-prop="speed" value="${ley.speed}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="JUMP_FORCE">${L.get('JUMP_FORCE', 'Fuerza Salto')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="Movement" data-prop="jumpForce" value="${ley.jumpForce}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Movement" data-prop="useRigidbody" ${ley.useRigidbody ? 'checked' : ''}>
                        <label data-i18n="USE_RIGIDBODY">${L.get('USE_RIGIDBODY', 'Usar Rigidbody')}</label>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="GROUND_TAG">${L.get('GROUND_TAG', 'Tag del Suelo')}</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="Movement" data-prop="groundTag" value="${ley.groundTag || 'Ground'}">
                    </div>
                    <hr>
                    <div class="inspector-section-header"><span>${L.get('SOUNDS', 'Sonidos')}</span></div>
                    <div class="inspector-row">
                        <label>Sonido Mov</label>
                        ${renderPropertyDropper('Audio', ley.moveSound, 'data-component="Movement" data-prop="moveSound"')}
                    </div>
                    <div class="inspector-row">
                        <label>Sonido Salto</label>
                        ${renderPropertyDropper('Audio', ley.jumpSound, 'data-component="Movement" data-prop="jumpSound"')}
                    </div>
                    <hr>
                    <div class="inspector-section-header"><span>${L.get('ANIMATIONS', 'Animaciones')}</span></div>
                    <div class="prop-row-multi">
                        <label>Idle</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="Movement" data-prop="idleAnim" value="${ley.idleAnim || ''}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Run</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="Movement" data-prop="runAnim" value="${ley.runAnim || ''}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Jump</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="Movement" data-prop="jumpAnim" value="${ley.jumpAnim || ''}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Fall</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="Movement" data-prop="fallAnim" value="${ley.fallAnim || ''}">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.ProjectileLauncher) {
            let warningHTML = '';
            if (ley.fireSound && !selectedMateria.getComponentByName('AudioSource')) {
                warningHTML = renderDependencyWarning('ProjectileLauncher', 'AudioSource');
            }

            componentHTML = `
                ${renderComponentHeader(L.get('PROJECTILE_LAUNCHER_COMPONENT', "Lanzador de Proyectiles"), icon, index)}
                <div class="component-content">
                    ${warningHTML}
                    <div class="inspector-row">
                        <label data-i18n="PROJECTILE_PREFAB">${L.get('PROJECTILE_PREFAB', 'Prefab Proyectil')}</label>
                        <div class="file-picker">
                            <input type="text" autocomplete="off" class="prop-input" data-component="ProjectileLauncher" data-prop="projectilePrefab" value="${ley.projectilePrefab}" placeholder="${L.get('HINT_ARRIASTRA_PREFAB', 'Arrastra un .ceprefab aquí')}">
                            <button class="panel-tool-btn" onclick="window.openAssetSelector((h, p) => { const input = this.previousElementSibling; input.value = p; input.dispatchEvent(new Event('change', { bubbles: true })); }, '.ceprefab')">...</button>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="FIRE_KEY">${L.get('FIRE_KEY', 'Tecla Disparo')}</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="ProjectileLauncher" data-prop="fireKey" value="${ley.fireKey}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="FIRE_RATE">${L.get('FIRE_RATE', 'Cadencia (segs)')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="0.1" min="0" data-component="ProjectileLauncher" data-prop="fireRate" value="${ley.fireRate}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SPEED">${L.get('SPEED', 'Velocidad')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" data-component="ProjectileLauncher" data-prop="projectileSpeed" value="${ley.projectileSpeed}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="OFFSET">${L.get('OFFSET', 'Offset')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="ProjectileLauncher" data-prop="offset.x" value="${ley.offset.x}" title="X">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="ProjectileLauncher" data-prop="offset.y" value="${ley.offset.y}" title="Y">
                        </div>
                    </div>
                     <div class="prop-row-multi">
                        <label data-i18n="DIRECTION">${L.get('DIRECTION', 'Dirección')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="ProjectileLauncher" data-prop="direction.x" value="${ley.direction.x}" title="X">
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="ProjectileLauncher" data-prop="direction.y" value="${ley.direction.y}" title="Y">
                        </div>
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="FIRE_SOUND">${L.get('FIRE_SOUND', 'Sonido Disparo')}</label>
                        ${renderPropertyDropper('Audio', ley.fireSound, 'data-component="ProjectileLauncher" data-prop="fireSound"')}
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.AutoDestroy) {
            componentHTML = `
                ${renderComponentHeader(L.get('AUTO_DESTROY_COMPONENT', "Destrucción Automática"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="DELAY_SECS">${L.get('DELAY_SECS', 'Retraso (segs)')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="0.1" min="0" data-component="AutoDestroy" data-prop="delay" value="${ley.delay}">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.CameraFollow) {
             componentHTML = `
                ${renderComponentHeader(L.get('CAMERA_FOLLOW_COMPONENT', "Seguimiento Cámara"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="TARGET">${L.get('TARGET', 'Objetivo')}</label>
                        ${renderPropertyDropper('Materia', ley.target, 'data-component="CameraFollow" data-prop="target"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SMOOTHNESS">${L.get('SMOOTHNESS', 'Suavidad')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="0.01" min="0" max="1" data-component="CameraFollow" data-prop="smoothness" value="${ley.smoothness}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="OFFSET">${L.get('OFFSET', 'Offset')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="CameraFollow" data-prop="offset.x" value="${ley.offset.x}" title="X">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="CameraFollow" data-prop="offset.y" value="${ley.offset.y}" title="Y">
                        </div>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="CameraFollow" data-prop="followX" ${ley.followX ? 'checked' : ''}>
                        <label data-i18n="FOLLOW_X">${L.get('FOLLOW_X', 'Seguir X')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="CameraFollow" data-prop="followY" ${ley.followY ? 'checked' : ''}>
                        <label data-i18n="FOLLOW_Y">${L.get('FOLLOW_Y', 'Seguir Y')}</label>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.ParticleSystem) {
            componentHTML = `
                ${renderComponentHeader(L.get('PARTICLE_SYSTEM', "Sistema de Partículas"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="PARTICLE_PREFAB">${L.get('PARTICLE_PREFAB', 'Prefab Partícula')}</label>
                        ${renderPropertyDropper('Prefab', ley.prefabPath, 'data-component="ParticleSystem" data-prop="prefabPath"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="MAX_PARTICLES">${L.get('MAX_PARTICLES', 'Max Partículas')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" min="1" data-component="ParticleSystem" data-prop="maxParticles" value="${ley.maxParticles}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="EMISSION_RATE">${L.get('EMISSION_RATE', 'Emisión (part/seg)')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" min="0" data-component="ParticleSystem" data-prop="emissionRate" value="${ley.emissionRate}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="LIFETIME">${L.get('LIFETIME', 'Vida (seg)')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="0.1" min="0" data-component="ParticleSystem" data-prop="lifetime" value="${ley.lifetime}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SPEED">${L.get('SPEED', 'Velocidad')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" data-component="ParticleSystem" data-prop="speed" value="${ley.speed}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SPREAD">${L.get('SPREAD', 'Dispersión (spread)')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" min="0" max="360" data-component="ParticleSystem" data-prop="spread" value="${ley.spread}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="ParticleSystem" data-prop="loop" ${ley.loop ? 'checked' : ''}>
                        <label data-i18n="LOOP">${L.get('LOOP', 'Loop')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="ParticleSystem" data-prop="playOnAwake" ${ley.playOnAwake ? 'checked' : ''}>
                        <label data-i18n="REPRODUCIR_AL_EMPEZAR">${L.get('REPRODUCIR_AL_EMPEZAR', 'Play On Awake')}</label>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.Parallax) {
            componentHTML = `
                ${renderComponentHeader(L.get('PARALLAX_COMPONENT', "Parallax (Avanzado)"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="SCROLL_FACTOR">${L.get('SCROLL_FACTOR', 'Scroll Factor X/Y')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="0.01" data-component="Parallax" data-prop="scrollFactor.x" value="${ley.scrollFactor.x}" title="X">
                            <input type="number" autocomplete="off" class="prop-input" step="0.01" data-component="Parallax" data-prop="scrollFactor.y" value="${ley.scrollFactor.y}" title="Y">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="REPEAT_INFINITE">${L.get('REPEAT_INFINITE', 'Repetir (Infinito)')}</label>
                        <div class="prop-inputs" style="display: flex; align-items: center; gap: 10px; justify-content: flex-start;">
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <input type="checkbox" class="prop-input" data-component="Parallax" data-prop="repeatX" ${ley.repeatX ? 'checked' : ''} id="parallax-repeat-x-${index}">
                                <label for="parallax-repeat-x-${index}" style="font-size: 10px; margin: 0;" data-i18n="HORIZONTAL">${L.get('HORIZONTAL', 'Horizontal')}</label>
                            </div>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <input type="checkbox" class="prop-input" data-component="Parallax" data-prop="repeatY" ${ley.repeatY ? 'checked' : ''} id="parallax-repeat-y-${index}">
                                <label for="parallax-repeat-y-${index}" style="font-size: 10px; margin: 0;" data-i18n="VERTICAL">${L.get('VERTICAL', 'Vertical')}</label>
                            </div>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="MIRRORING_XY">${L.get('MIRRORING_XY', 'Mirroring X/Y')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="Parallax" data-prop="mirroring.x" value="${ley.mirroring.x}" title="X">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="Parallax" data-prop="mirroring.y" value="${ley.mirroring.y}" title="Y">
                        </div>
                    </div>
                    <button class="panel-tool-btn" style="width:100%; margin-bottom: 8px;" data-action="parallax-match-sprite" data-ley-index="${index}" data-i18n="MATCH_MIRRORING_SPRITE">${L.get('MATCH_MIRRORING_SPRITE', 'Ajustar Mirroring al Sprite')}</button>
                    <div class="prop-row-multi">
                        <label data-i18n="OFFSET_XY">${L.get('OFFSET_XY', 'Offset X/Y')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="Parallax" data-prop="offset.x" value="${ley.offset.x}" title="X">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="Parallax" data-prop="offset.y" value="${ley.offset.y}" title="Y">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="AUTOSCROLL_XY">${L.get('AUTOSCROLL_XY', 'Autoscroll X/Y')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="Parallax" data-prop="autoscroll.x" value="${ley.autoscroll.x}" title="X">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="Parallax" data-prop="autoscroll.y" value="${ley.autoscroll.y}" title="Y">
                        </div>
                    </div>
                    <p class="field-description">${L.get('PARALLAX_DESC', 'Scroll Factor: 0 = Pegado a cámara. 1 = Mundo real.<br>Mirroring: Tamaño de repetición (0 = no repite).')}</p>
                </div>
            `;
        } else if (ley instanceof Components.Terreno2D) {
            const settings = TerrenoEditorWindow.settings;
            componentHTML = `
                ${renderComponentHeader(L.get('TERRAIN_2D_COMPONENT', "Terreno 2D (Píxeles)"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="CANVAS_SIZE">${L.get('CANVAS_SIZE', 'Canvas Size')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" data-component="Terreno2D" data-prop="width" value="${ley.width}" title="${L.get('WIDTH', 'Width')}">
                            <input type="number" autocomplete="off" class="prop-input" data-component="Terreno2D" data-prop="height" value="${ley.height}" title="${L.get('HEIGHT', 'Height')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="BASE_COLOR">${L.get('BASE_COLOR', 'Color Base')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="Terreno2D" data-prop="baseColor" value="${ley.baseColor || '#4a4a4a'}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_ORDER_IN_LAYER">${L.get('PROP_ORDER_IN_LAYER', 'Order in Layer')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" data-component="Terreno2D" data-prop="orderInLayer" value="${ley.orderInLayer || 0}">
                    </div>
                    <button class="panel-tool-btn" style="width:100%; margin-bottom: 8px;" onclick="const t = window.SceneManager.currentScene.findMateriaById(${selectedMateria.id}).getComponent(window.Components.Terreno2D); t.maskCtx.clearRect(0,0,t.width,t.height); window.updateScene();" data-i18n="BORRAR_TODO">${L.get('BORRAR_TODO', 'Limpiar Todo')}</button>
                    <hr>
                    <h5 data-i18n="TERRAIN_BRUSH">${L.get('TERRAIN_BRUSH', 'Pincel de Terreno')}</h5>
                    <div class="prop-row-multi">
                        <label data-i18n="MODE">${L.get('MODE', 'Modo')}</label>
                        <select class="terrain-tool-input" onchange="window.TerrenoEditorWindow.setMode(this.value)">
                            <option value="draw" ${settings.mode === 'draw' ? 'selected' : ''} data-i18n="DRAW_TERRAIN">${L.get('DRAW_TERRAIN', 'Dibujar Terreno')}</option>
                            <option value="erase" ${settings.mode === 'erase' ? 'selected' : ''} data-i18n="ERASE_TERRAIN">${L.get('ERASE_TERRAIN', 'Borrar Terreno')}</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SIZE">${L.get('SIZE', 'Tamaño')}</label>
                        <input type="range" min="1" max="200" value="${settings.brushSize}" oninput="window.TerrenoEditorWindow.setBrushSize(this.value); this.nextElementSibling.innerText = this.value;">
                        <span style="min-width: 30px; text-align: right;">${settings.brushSize}</span>
                    </div>
                    <hr>
                    <div class="layer-manager-ui">
                        <div class="layer-list-header">
                            <h5 data-i18n="FILL_TEXTURES">${L.get('FILL_TEXTURES', 'Texturas de Relleno')}</h5>
                            <button class="layer-btn add" data-action="terrain-add-layer" title="${L.get('ADD_LAYER', 'Añadir Capa')}">+</button>
                        </div>
                        <div class="layer-list">
                            ${ley.layers.map((layer, lIdx) => `
                            <div class="layer-item ${lIdx === settings.selectedLayer ? 'active' : ''}" onclick="window.TerrenoEditorWindow.setSelectedLayer(${lIdx}); window.updateInspector();">
                                    <div style="flex-grow:1;">
                                        ${renderPropertyDropper('Sprite', layer.texturePath, `data-action="terrain-layer-texture" data-layer-index="${lIdx}"`)}
                                    </div>
                                    <button class="layer-btn remove" data-action="terrain-remove-layer" data-index="${lIdx}">-</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <p class="field-description">${L.get('TERRAIN_BRUSH_DESC', 'Dibuja libremente en la escena con la herramienta de pincel de terreno activada. Las texturas rellenarán las zonas pintadas.')}</p>
                </div>
            `;
        } else if (ley instanceof Components.TerrenoCollider2D) {
            const isPolygon = ley.mode === 'Polygon';
            componentHTML = `
                ${renderComponentHeader(L.get('TERRAIN_COLLIDER_2D', "Terreno Collider 2D"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="MODE">${L.get('MODE', 'Modo')}</label>
                        <select class="prop-input inspector-re-render" data-component="TerrenoCollider2D" data-prop="mode">
                            <option value="Rectangles" ${ley.mode === 'Rectangles' ? 'selected' : ''}>${L.get('RECTANGLES_GRID', 'Rectángulos (Grilla)')}</option>
                            <option value="Polygon" ${ley.mode === 'Polygon' ? 'selected' : ''}>${L.get('POLYGON_EXACT', 'Polígono (Exacto)')}</option>
                        </select>
                    </div>
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="TerrenoCollider2D" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label data-i18n="IS_TRIGGER">${L.get('IS_TRIGGER', 'Is Trigger')}</label>
                    </div>
                    <div class="prop-row-multi" style="display: ${isPolygon ? 'none' : 'flex'};">
                        <label data-i18n="RESOLUTION">${L.get('RESOLUTION', 'Resolución')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" min="4" max="64" data-component="TerrenoCollider2D" data-prop="resolution" value="${ley.resolution || 16}">
                    </div>
                    <div class="prop-row-multi" style="display: ${isPolygon ? 'flex' : 'none'};">
                        <label data-i18n="SIMPLICITY">${L.get('SIMPLICITY', 'Simplicidad')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="0.5" min="0" data-component="TerrenoCollider2D" data-prop="simplifyTolerance" value="${ley.simplifyTolerance || 2.0}">
                    </div>
                    <p class="field-description" data-i18n="${isPolygon ? 'POLYGON_SIMPLICITY_DESC' : 'GRID_RESOLUTION_DESC'}">${isPolygon ? L.get('POLYGON_SIMPLICITY_DESC', 'Mayor simplicidad = menos puntos en el polígono.') : L.get('GRID_RESOLUTION_DESC', 'Cuanto menor sea la resolución, más precisos serán los rectángulos.')}</p>
                    <hr>
                    <button class="primary-btn" data-action="generate-colliders" style="width: 100%;" data-i18n="REGENERATE_COLLISIONS">${L.get('REGENERATE_COLLISIONS', 'Regenerar Colisiones')}</button>
                    <p class="field-description" style="margin-top: 8px;">
                        ${isPolygon ? `${L.get('ISLANDS_POLYGONS', 'Islas (Polígonos)')}: ${ley.generatedPolygons?.length || 0}` : `${L.get('RECTANGLES', 'Rectángulos')}: ${ley.generatedColliders?.length || 0}`}
                    </p>
                </div>
            `;
        } else if (ley instanceof Components.Gyzmo) {
            componentHTML = `
                ${renderComponentHeader(L.get('GYZMO_AREAS', "Gyzmo (Áreas)"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Gyzmo" data-prop="showInGame" ${ley.showInGame ? 'checked' : ''}>
                        <label data-i18n="SHOW_IN_GAME_GLOBAL">${L.get('SHOW_IN_GAME_GLOBAL', 'Mostrar en Juego (Global)')}</label>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_ORDER_IN_LAYER">${L.get('PROP_ORDER_IN_LAYER', 'Order in Layer')}</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" data-component="Gyzmo" data-prop="orderInLayer" value="${ley.orderInLayer || 0}">
                    </div>
                    <hr>
                    <div class="layer-manager-ui">
                        <div class="layer-list-header">
                            <h5>${L.get('RECTANGLES', 'Rectángulos')}</h5>
                            <button class="layer-btn add" data-action="gyzmo-add-layer" title="${L.get('ADD_RECTANGLE', 'Añadir Rectángulo')}">+</button>
                        </div>
                        <div class="layer-list">
                            ${ley.layers.map((layer, lIdx) => `
                                <div class="layer-item" style="flex-direction: column; align-items: stretch; gap: 5px; padding: 10px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <input type="text" autocomplete="off" class="prop-input" data-component="Gyzmo" data-prop="layers.${lIdx}.name" value="${layer.name || ''}" style="flex-grow: 1; margin-right: 5px;" placeholder="${L.get('NAME', 'Nombre')}">
                                        <button class="layer-btn remove" data-action="gyzmo-remove-layer" data-index="${lIdx}">-</button>
                                    </div>
                                    <div class="prop-row-multi">
                                        <label data-i18n="POS_XY">${L.get('POS_XY', 'Pos (X/Y)')}</label>
                                        <div class="prop-inputs">
                                            <input type="number" autocomplete="off" class="prop-input" data-component="Gyzmo" data-prop="layers.${lIdx}.x" value="${layer.x}" title="X">
                                            <input type="number" autocomplete="off" class="prop-input" data-component="Gyzmo" data-prop="layers.${lIdx}.y" value="${layer.y}" title="Y">
                                        </div>
                                    </div>
                                    <div class="prop-row-multi">
                                        <label data-i18n="SIZE_WH">${L.get('SIZE_WH', 'Size (W/H)')}</label>
                                        <div class="prop-inputs">
                                            <input type="number" autocomplete="off" class="prop-input" data-component="Gyzmo" data-prop="layers.${lIdx}.width" value="${layer.width}" title="${L.get('WIDTH', 'Width')}">
                                            <input type="number" autocomplete="off" class="prop-input" data-component="Gyzmo" data-prop="layers.${lIdx}.height" value="${layer.height}" title="${L.get('HEIGHT', 'Height')}">
                                        </div>
                                    </div>
                                    <div class="prop-row-multi">
                                        <label data-i18n="COLOR">${L.get('COLOR', 'Color')}</label>
                                        <div class="prop-inputs">
                                            <input type="color" class="prop-input" data-component="Gyzmo" data-prop="layers.${lIdx}.color" value="${layer.color || '#00ff00'}">
                                        </div>
                                    </div>
                                    <div class="checkbox-field">
                                        <input type="checkbox" class="prop-input" data-component="Gyzmo" data-prop="layers.${lIdx}.showInGame" ${layer.showInGame ? 'checked' : ''}>
                                        <label data-i18n="VISIBLE_IN_GAME">${L.get('VISIBLE_IN_GAME', 'Visible en Juego')}</label>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.RaycastSource) {
            componentHTML = `
                ${renderComponentHeader(L.get('RAYCAST_SOURCE', "Raycast Source (Rallo)"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="RaycastSource" data-prop="showGizmo" ${ley.showGizmo ? 'checked' : ''}>
                        <label data-i18n="SHOW_RAYS">${L.get('SHOW_RAYS', 'Mostrar Rayos')}</label>
                    </div>
                    <div class="inspector-section-header">
                        <span data-i18n="RAYS">${L.get('RAYS', 'Rayos')}</span>
                        <button class="layer-btn add" data-action="rallo-add-ray">+</button>
                    </div>
                    <div class="layer-list">
                        ${ley.rays.map((ray, rIdx) => `
                            <div class="layer-item" style="flex-direction: column; align-items: stretch; gap: 5px; padding: 10px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span>${L.get('RAY', 'Rayo')} ${rIdx}</span>
                                    <button class="layer-btn remove" data-action="rallo-remove-ray" data-index="${rIdx}">-</button>
                                </div>
                                <div class="prop-row-multi">
                                    <label data-i18n="ANGLE">${L.get('ANGLE', 'Ángulo')}</label>
                                    <input type="number" autocomplete="off" class="prop-input" data-component="RaycastSource" data-prop="rays.${rIdx}.angle" value="${ray.angle}">
                                </div>
                                <div class="prop-row-multi">
                                    <label data-i18n="LENGTH">${L.get('LENGTH', 'Longitud')}</label>
                                    <input type="number" autocomplete="off" class="prop-input" data-component="RaycastSource" data-prop="rays.${rIdx}.length" value="${ray.length}">
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.Water) {
            componentHTML = `
                ${renderComponentHeader(L.get('WATER', "Water (Agua)"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_DIMENSIONS">${L.get('PROP_DIMENSIONS', 'Dimensions')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" data-component="Water" data-prop="width" value="${ley.width}" title="${L.get('PROP_WIDTH', 'Width')}">
                            <input type="number" autocomplete="off" class="prop-input" data-component="Water" data-prop="height" value="${ley.height}" title="${L.get('PROP_HEIGHT', 'Height')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_COLOR">${L.get('PROP_COLOR', 'Color')}</label>
                        <input type="color" class="prop-input" data-component="Water" data-prop="color" value="${ley.color}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_WATER_DENSITY">${L.get('PROP_WATER_DENSITY', 'Density')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="Water" data-prop="density" value="${ley.density}" step="0.1">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_VISCOSITY">${L.get('PROP_VISCOSITY', 'Viscosity')}</label>
                        <input type="range" class="prop-input" data-component="Water" data-prop="viscosity" value="${ley.viscosity}" min="0" max="1" step="0.01">
                    </div>
                    <hr>
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Water" data-prop="showTides" ${ley.showTides ? 'checked' : ''}>
                        <label data-i18n="PROP_SHOW_MAREAS">${L.get('PROP_SHOW_MAREAS', 'Simular Mareas')}</label>
                    </div>
                    <div class="prop-row-multi" style="display: ${ley.showTides ? 'flex' : 'none'};">
                        <label data-i18n="PROP_TIDE_AMPLITUDE">${L.get('PROP_TIDE_AMPLITUDE', 'Amplitud')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="Water" data-prop="tideAmplitude" value="${ley.tideAmplitude}">
                    </div>
                    <button class="primary-btn" onclick="const w = window.SceneManager.currentScene.findMateriaById(${selectedMateria.id}).getComponent(window.Components.Water); w.generateParticles(); window.updateScene();" style="width: 100%; margin-top: 10px;" data-i18n="REGENERAR_PARTICULAS">${L.get('REGENERAR_PARTICULAS', 'Regenerar Partículas')}</button>
                </div>
            `;
        } else if (ley instanceof Components.LineCollider2D) {
            componentHTML = `
                ${renderComponentHeader(L.get('LINE_COLLIDER', "Line Collider 2D"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="LineCollider2D" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label data-i18n="PROP_IS_TRIGGER">${L.get('PROP_IS_TRIGGER', 'Is Trigger')}</label>
                    </div>
                    <div class="inspector-section-header">
                        <span data-i18n="PROP_POINTS">${L.get('PROP_POINTS', 'Puntos')}</span>
                        <button class="layer-btn add" data-action="line-add-point" data-i18n="PROP_ADD_POINT" title="${L.get('PROP_ADD_POINT', 'Añadir Punto')}">+</button>
                    </div>
                    <div class="layer-list" style="max-height: 200px; overflow-y: auto;">
                        ${ley.points.map((p, pIdx) => `
                            <div class="layer-item" style="gap: 5px; padding: 5px;">
                                <span style="min-width: 20px;">${pIdx}:</span>
                                <div class="prop-inputs">
                                    <input type="number" autocomplete="off" class="prop-input" data-component="LineCollider2D" data-prop="points.${pIdx}.x" value="${p.x}" title="X">
                                    <input type="number" autocomplete="off" class="prop-input" data-component="LineCollider2D" data-prop="points.${pIdx}.y" value="${p.y}" title="Y">
                                </div>
                                <button class="layer-btn remove" data-action="line-remove-point" data-index="${pIdx}" title="${L.get('BORRAR_PUNTO', 'Borrar punto')}">&times;</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.PlatformEffector2D) {
            componentHTML = `
                ${renderComponentHeader(L.get('PLATFORM_EFFECTOR', "Platform Effector 2D"), 'square', index)}
                <div class="component-content">
                    <div class="effector-ui-container" style="display: flex; flex-direction: column; align-items: center; gap: 15px; padding: 10px;">
                        <div class="effector-square-preview" style="position: relative; width: 100px; height: 100px; background: rgba(255,255,255,0.05); border: 2px dashed rgba(255,255,255,0.1);">
                            <!-- Top Edge -->
                            <div class="effector-edge top ${ley.blockUp ? 'blocked' : 'passable'}"
                                 data-action="toggle-effector-edge" data-edge="blockUp" data-ley-index="${index}"
                                 style="position: absolute; top: -4px; left: 0; width: 100%; height: 8px; cursor: pointer; transition: background 0.2s;"></div>
                            <!-- Bottom Edge -->
                            <div class="effector-edge bottom ${ley.blockDown ? 'blocked' : 'passable'}"
                                 data-action="toggle-effector-edge" data-edge="blockDown" data-ley-index="${index}"
                                 style="position: absolute; bottom: -4px; left: 0; width: 100%; height: 8px; cursor: pointer; transition: background 0.2s;"></div>
                            <!-- Left Edge -->
                            <div class="effector-edge left ${ley.blockLeft ? 'blocked' : 'passable'}"
                                 data-action="toggle-effector-edge" data-edge="blockLeft" data-ley-index="${index}"
                                 style="position: absolute; top: 0; left: -4px; width: 8px; height: 100%; cursor: pointer; transition: background 0.2s;"></div>
                            <!-- Right Edge -->
                            <div class="effector-edge right ${ley.blockRight ? 'blocked' : 'passable'}"
                                 data-action="toggle-effector-edge" data-edge="blockRight" data-ley-index="${index}"
                                 style="position: absolute; top: 0; right: -4px; width: 8px; height: 100%; cursor: pointer; transition: background 0.2s;"></div>

                            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 0.7em; opacity: 0.5; text-align: center; pointer-events: none;">
                                ${L.get('CLICK_EDGES', 'Click edges to toggle')}
                            </div>
                        </div>

                        <div style="width: 100%;">
                            <div class="checkbox-field">
                                <input type="checkbox" class="prop-input" data-component="PlatformEffector2D" data-prop="useOneWay" ${ley.useOneWay ? 'checked' : ''}>
                                <label data-i18n="USE_ONE_WAY">${L.get('USE_ONE_WAY', 'Use One Way')}</label>
                            </div>
                            <div class="prop-row-multi">
                                <label data-i18n="SURFACE_ARC">${L.get('SURFACE_ARC', 'Surface Arc')}</label>
                                <input type="number" autocomplete="off" class="prop-input" data-component="PlatformEffector2D" data-prop="surfaceArc" value="${ley.surfaceArc}" min="0" max="360">
                            </div>
                        </div>
                    </div>
                </div>
                <style>
                    .effector-edge.blocked { background: #ff4444; box-shadow: 0 0 5px #ff4444; z-index: 2; }
                    .effector-edge.passable { background: #44ff44; opacity: 0.3; z-index: 1; }
                    .effector-edge:hover { opacity: 1 !important; filter: brightness(1.2); }
                </style>
            `;
        } else if (ley instanceof Components.AudioSource) {
            componentHTML = `
                ${renderComponentHeader(L.get('AUDIO_SOURCE', "Audio Source"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="AUDIO_CLIP">${L.get('AUDIO_CLIP', 'Audio Clip')}</label>
                        ${renderPropertyDropper('Audio', ley.source, 'data-component="AudioSource" data-prop="source"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="VOLUMEN">${L.get('VOLUMEN', 'Volumen')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" data-component="AudioSource" data-prop="volume" value="${ley.volume}" min="0" max="1" step="0.01" style="flex-grow: 1;">
                            <span style="min-width: 30px; text-align: right;">${Math.round(ley.volume * 100)}%</span>
                        </div>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="AudioSource" data-prop="loop" ${ley.loop ? 'checked' : ''}>
                        <label data-i18n="BUCLE_LOOP">${L.get('BUCLE_LOOP', 'Bucle (Loop)')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="AudioSource" data-prop="playOnAwake" ${ley.playOnAwake ? 'checked' : ''}>
                        <label data-i18n="REPRODUCIR_AL_EMPEZAR">${L.get('REPRODUCIR_AL_EMPEZAR', 'Reproducir al Empezar')}</label>
                    </div>

                    <div class="inspector-section-header"><span data-i18n="AUDIO_ESPACIAL">${L.get('AUDIO_ESPACIAL', 'Audio Espacial')}</span></div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="AudioSource" data-prop="spatial" ${ley.spatial ? 'checked' : ''}>
                        <label data-i18n="ACTIVAR_AUDIO_ESPACIAL">${L.get('ACTIVAR_AUDIO_ESPACIAL', 'Activar Audio Espacial')}</label>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="DISTANCIA_MINIMA">${L.get('DISTANCIA_MINIMA', 'Distancia Mínima')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="AudioSource" data-prop="minDistance" value="${ley.minDistance}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="DISTANCIA_MAXIMA">${L.get('DISTANCIA_MAXIMA', 'Distancia Máxima')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="AudioSource" data-prop="maxDistance" value="${ley.maxDistance}">
                    </div>

                    <div class="inspector-section-header"><span data-i18n="RANGO_REPRODUCCION">${L.get('RANGO_REPRODUCCION', 'Rango de Reproducción')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="INICIO_SEG">${L.get('INICIO_SEG', 'Inicio (seg)')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="AudioSource" data-prop="playbackStart" value="${ley.playbackStart}" step="0.1" min="0">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="FIN_SEG">${L.get('FIN_SEG', 'Fin (seg, 0=fin)')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="AudioSource" data-prop="playbackEnd" value="${ley.playbackEnd}" step="0.1" min="0">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.Suspension) {
            componentHTML = `
                ${renderComponentHeader(L.get('SUSPENSION', "Suspensión"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="CHASSIS">${L.get('CHASSIS', 'Chasis')}</label>
                        ${renderPropertyDropper('Materia', ley.chasis, 'data-component="Suspension" data-prop="chasis"')}
                    </div>
                    <div class="inspector-section-header"><span data-i18n="SPRING_SETTINGS">${L.get('SPRING_SETTINGS', 'Configuración de Muelle')}</span></div>
                    <div class="prop-row-multi">
                        <label title="K" data-i18n="STIFFNESS">${L.get('STIFFNESS', 'Dureza')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="Suspension" data-prop="dureza" value="${ley.dureza}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="D" data-i18n="DAMPING">${L.get('DAMPING', 'Amortiguación')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="Suspension" data-prop="amortiguacion" value="${ley.amortiguacion}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="REST_LENGTH">${L.get('REST_LENGTH', 'Largo Reposo')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="Suspension" data-prop="longitudReposo" value="${ley.longitudReposo}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="CONSTRAINT_AXIS">${L.get('CONSTRAINT_AXIS', 'Eje (Local)')}</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" data-component="Suspension" data-prop="eje.x" value="${ley.eje.x}" title="X">
                            <input type="number" autocomplete="off" class="prop-input" data-component="Suspension" data-prop="eje.y" value="${ley.eje.y}" title="Y">
                        </div>
                    </div>
                    <div class="inspector-row">
                        <label>Sonido Susp</label>
                        ${renderPropertyDropper('Audio', ley.suspensionSound, 'data-component="Suspension" data-prop="suspensionSound"')}
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.VehicleSideView2D) {
            componentHTML = `
                ${renderComponentHeader(L.get('VEHICLE_SIDE_VIEW_2D', "Vehículo Lateral 2D"), icon, index)}
                <div class="component-content">
                    <div class="inspector-section-header"><span data-i18n="WHEELS">${L.get('WHEELS', 'Ruedas')}</span></div>
                    <div class="inspector-row">
                        <p class="field-description" style="font-size: 0.8em; opacity: 0.7;">Si la lista está vacía, se detectarán automáticamente los hijos con el componente 'Suspensión'.</p>
                    </div>
                    <div class="inspector-section-header"><span data-i18n="ENGINE_SETTINGS">${L.get('ENGINE_SETTINGS', 'Configuración de Motor')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="POWER">${L.get('POWER', 'Potencia')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="VehicleSideView2D" data-prop="potenciaMotor" value="${ley.potenciaMotor}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="MAX_SPEED">${L.get('MAX_SPEED', 'Velocidad Máx')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="VehicleSideView2D" data-prop="velocidadMaxima" value="${ley.velocidadMaxima}">
                    </div>
                    <div class="prop-row">
                        <label title="Resistencia al rodamiento o freno motor (0-1)" data-i18n="MOTOR_BRAKE">${L.get('MOTOR_BRAKE', 'Freno Motor')}</label>
                        <input type="number" autocomplete="off" step="0.01" min="0" max="1" class="prop-input" data-component="VehicleSideView2D" data-prop="frenadoMotor" value="${ley.frenadoMotor}">
                    </div>
                    <div class="prop-row">
                        <label title="Controla cuánto se inclina el chasis al acelerar" data-i18n="PITCH_STRENGTH">${L.get('PITCH_STRENGTH', 'Inclinación')}</label>
                        <input type="number" autocomplete="off" step="0.1" class="prop-input" data-component="VehicleSideView2D" data-prop="fuerzaInclinacion" value="${ley.fuerzaInclinacion}">
                    </div>
                    <div class="prop-row">
                        <label title="Control manual de giro en el aire" data-i18n="AIR_TURN">${L.get('AIR_TURN', 'Giro Aire')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="VehicleSideView2D" data-prop="controlAire" value="${ley.controlAire}">
                    </div>
                    <div class="prop-row">
                        <label title="Estabilización automática en el aire (0-1)" data-i18n="AUTO_STABILIZE">${L.get('AUTO_STABILIZE', 'Auto-Estabilizar')}</label>
                        <input type="number" autocomplete="off" step="0.1" min="0" max="1" class="prop-input" data-component="VehicleSideView2D" data-prop="estabilidadAire" value="${ley.estabilidadAire}">
                    </div>
                    <div class="prop-row">
                        <label title="Recuperación de posición horizontal en suelo (0-1)" data-i18n="GROUND_CENTERING">${L.get('GROUND_CENTERING', 'Centrado Suelo')}</label>
                        <input type="number" autocomplete="off" step="0.1" min="0" max="1" class="prop-input" data-component="VehicleSideView2D" data-prop="recuperacionGiro" value="${ley.recuperacionGiro}">
                    </div>

                    <div class="inspector-section-header"><span data-i18n="CONTROLS">${L.get('CONTROLS', 'Controles')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="ACCELERATE_KEY">${L.get('ACCELERATE_KEY', 'Tecla Acelerar')}</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="VehicleSideView2D" data-prop="teclaAcelerar" value="${ley.teclaAcelerar}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="BRAKE_KEY">${L.get('BRAKE_KEY', 'Tecla Frenar')}</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="VehicleSideView2D" data-prop="teclaFrenar" value="${ley.teclaFrenar}">
                    </div>
                    <div class="inspector-row">
                        <label>Sonido Motor</label>
                        ${renderPropertyDropper('Audio', ley.motorSound, 'data-component="VehicleSideView2D" data-prop="motorSound"')}
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.VehicleTopDown) {
            let warningHTML = '';
            if ((ley.engineSound || ley.brakeSound) && !selectedMateria.getComponentByName('AudioSource')) {
                warningHTML = renderDependencyWarning('VehicleTopDown', 'AudioSource');
            }
            if (!selectedMateria.getComponentByName('Rigidbody2D')) {
                warningHTML += renderDependencyWarning('VehicleTopDown', 'Rigidbody2D');
            }

            componentHTML = `
                ${renderComponentHeader(L.get('VEHICLE_TOPDOWN', "Vehicle TopDown"), icon, index)}
                <div class="component-content">
                    ${warningHTML}
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="VehicleTopDown" data-prop="autoAcelerar" ${ley.autoAcelerar ? 'checked' : ''}>
                        <label data-i18n="AUTO_ACCELERATE">${L.get('AUTO_ACCELERATE', 'Auto-Acelerar')}</label>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="POWER">${L.get('POWER', 'Potencia')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="VehicleTopDown" data-prop="potencia" value="${ley.potencia}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="MAX_SPEED">${L.get('MAX_SPEED', 'Velocidad Máx')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="VehicleTopDown" data-prop="velocidadMaxima" value="${ley.velocidadMaxima}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="TURN_SPEED">${L.get('TURN_SPEED', 'Velocidad Giro')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="VehicleTopDown" data-prop="velocidadGiro" value="${ley.velocidadGiro}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="0: Agarre total, 1: Hielo" data-i18n="DRIFT_INTENSITY">${L.get('DRIFT_INTENSITY', 'Intensidad Derrape')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" data-component="VehicleTopDown" data-prop="intensidadDerrape" value="${ley.intensidadDerrape}" min="0" max="1" step="0.01" style="flex-grow: 1;">
                            <span style="min-width: 30px; text-align: right;">${Math.round(ley.intensidadDerrape * 100)}%</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="MOTOR_BRAKE">${L.get('MOTOR_BRAKE', 'Freno Motor')}</label>
                        <input type="number" autocomplete="off" step="0.01" min="0" max="1" class="prop-input" data-component="VehicleTopDown" data-prop="frenadoMotor" value="${ley.frenadoMotor}">
                    </div>
                    <div class="inspector-row">
                        <label>Sonido Motor</label>
                        ${renderPropertyDropper('Audio', ley.engineSound, 'data-component="VehicleTopDown" data-prop="engineSound"')}
                    </div>
                    <div class="inspector-row">
                        <label>Sonido Freno</label>
                        ${renderPropertyDropper('Audio', ley.brakeSound, 'data-component="VehicleTopDown" data-prop="brakeSound"')}
                    </div>

                    <div class="inspector-section-header"><span>${L.get('ANIMATIONS', 'Animaciones')}</span></div>
                    <div class="prop-row-multi">
                        <label>Idle</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="VehicleTopDown" data-prop="idleAnim" value="${ley.idleAnim || ''}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Drive</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="VehicleTopDown" data-prop="driveAnim" value="${ley.driveAnim || ''}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Reverse</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="VehicleTopDown" data-prop="reverseAnim" value="${ley.reverseAnim || ''}">
                    </div>

                    <div class="inspector-section-header"><span data-i18n="CONTROLS">${L.get('CONTROLS', 'Controles')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="KEYS_LEFT_RIGHT">${L.get('KEYS_LEFT_RIGHT', 'Giro (Izq/Der)')}</label>
                        <div class="prop-inputs">
                            <input type="text" autocomplete="off" class="prop-input" data-component="VehicleTopDown" data-prop="teclaIzquierda" value="${ley.teclaIzquierda}" title="Izquierda">
                            <input type="text" autocomplete="off" class="prop-input" data-component="VehicleTopDown" data-prop="teclaDerecha" value="${ley.teclaDerecha}" title="Derecha">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="KEYS_ACCEL_BRAKE">${L.get('KEYS_ACCEL_BRAKE', 'Acel/Freno')}</label>
                        <div class="prop-inputs">
                            <input type="text" autocomplete="off" class="prop-input" data-component="VehicleTopDown" data-prop="teclaAcelerar" value="${ley.teclaAcelerar}" title="Acelerar">
                            <input type="text" autocomplete="off" class="prop-input" data-component="VehicleTopDown" data-prop="teclaFrenar" value="${ley.teclaFrenar}" title="Frenar">
                        </div>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.PlaneController) {
            let warningHTML = '';
            if ((ley.engineSound || ley.takeoffSound) && !selectedMateria.getComponentByName('AudioSource')) {
                warningHTML = renderDependencyWarning('PlaneController', 'AudioSource');
            }
            if (!selectedMateria.getComponentByName('Rigidbody2D')) {
                warningHTML += renderDependencyWarning('PlaneController', 'Rigidbody2D');
            }

            componentHTML = `
                ${renderComponentHeader(L.get('PLANE_CONTROLLER', "Plane Controller"), icon, index)}
                <div class="component-content">
                    ${warningHTML}
                    <div class="inspector-section-header"><span data-i18n="FLIGHT_SETTINGS">${L.get('FLIGHT_SETTINGS', 'Configuración de Vuelo')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="THRUST">${L.get('THRUST', 'Potencia Motor')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="PlaneController" data-prop="potenciaMotor" value="${ley.potenciaMotor}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="MAX_SPEED">${L.get('MAX_SPEED', 'Velocidad Máx')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="PlaneController" data-prop="velocidadMaxima" value="${ley.velocidadMaxima}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="Velocidad necesaria para empezar a subir" data-i18n="TAKEOFF_SPEED">${L.get('TAKEOFF_SPEED', 'Velocidad Despegue')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="PlaneController" data-prop="velocidadDespegue" value="${ley.velocidadDespegue}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="Multiplicador de fuerza ascendente" data-i18n="LIFT_FORCE">${L.get('LIFT_FORCE', 'Sustentación')}</label>
                        <input type="number" autocomplete="off" step="0.1" class="prop-input" data-component="PlaneController" data-prop="fuerzaSustentacion" value="${ley.fuerzaSustentacion}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="TURN_AGILITY">${L.get('TURN_AGILITY', 'Agilidad Giro')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="PlaneController" data-prop="agilidadGiro" value="${ley.agilidadGiro}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="Resistencia al aire (0-1)" data-i18n="AIR_DRAG">${L.get('AIR_DRAG', 'Arrastre Aire')}</label>
                        <input type="number" autocomplete="off" step="0.01" min="0" max="1" class="prop-input" data-component="PlaneController" data-prop="arrastreAire" value="${ley.arrastreAire}">
                    </div>
                    <div class="inspector-row">
                        <label>Sonido Motor</label>
                        ${renderPropertyDropper('Audio', ley.engineSound, 'data-component="PlaneController" data-prop="engineSound"')}
                    </div>
                    <div class="inspector-row">
                        <label>Sonido Despegue</label>
                        ${renderPropertyDropper('Audio', ley.takeoffSound, 'data-component="PlaneController" data-prop="takeoffSound"')}
                    </div>

                    <div class="inspector-section-header"><span>${L.get('ANIMATIONS', 'Animaciones')}</span></div>
                    <div class="prop-row-multi">
                        <label>Idle</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="PlaneController" data-prop="idleAnim" value="${ley.idleAnim || ''}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Fly</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="PlaneController" data-prop="flyAnim" value="${ley.flyAnim || ''}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Ground</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="PlaneController" data-prop="groundAnim" value="${ley.groundAnim || ''}">
                    </div>

                    <div class="inspector-section-header"><span data-i18n="CONTROLS">${L.get('CONTROLS', 'Controles')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="KEYS_POWER_BRAKE">${L.get('KEYS_POWER_BRAKE', 'Potencia/Freno')}</label>
                        <div class="prop-inputs">
                            <input type="text" autocomplete="off" class="prop-input" data-component="PlaneController" data-prop="teclaPotencia" value="${ley.teclaPotencia}" title="Potencia">
                            <input type="text" autocomplete="off" class="prop-input" data-component="PlaneController" data-prop="teclaFreno" value="${ley.teclaFreno}" title="Freno">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="KEY_BRAKE_SPACE">${L.get('KEY_BRAKE_SPACE', 'Freno (Espacio)')}</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="PlaneController" data-prop="teclaBotonFreno" value="${ley.teclaBotonFreno}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="KEYS_PITCH">${L.get('KEYS_PITCH', 'Inclinación (Nariz)')}</label>
                        <div class="prop-inputs">
                            <input type="text" autocomplete="off" class="prop-input" data-component="PlaneController" data-prop="teclaNarizArriba" value="${ley.teclaNarizArriba}" title="Arriba">
                            <input type="text" autocomplete="off" class="prop-input" data-component="PlaneController" data-prop="teclaNarizAbajo" value="${ley.teclaNarizAbajo}" title="Abajo">
                        </div>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.HelicopterController) {
            let warningHTML = '';
            if (ley.engineSound && !selectedMateria.getComponentByName('AudioSource')) {
                warningHTML = renderDependencyWarning('HelicopterController', 'AudioSource');
            }
            if (!selectedMateria.getComponentByName('Rigidbody2D')) {
                warningHTML += renderDependencyWarning('HelicopterController', 'Rigidbody2D');
            }

            componentHTML = `
                ${renderComponentHeader(L.get('HELICOPTER_CONTROLLER', "Helicopter Controller"), icon, index)}
                <div class="component-content">
                    ${warningHTML}
                    <div class="inspector-section-header"><span data-i18n="HELICOPTER_SETTINGS">${L.get('HELICOPTER_SETTINGS', 'Configuración de Helicóptero')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="MOTOR_POWER">${L.get('MOTOR_POWER', 'Potencia Motor')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="HelicopterController" data-prop="potenciaMotor" value="${ley.potenciaMotor}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="Fuerza base de sustentación" data-i18n="TAKEOFF_POWER">${L.get('TAKEOFF_POWER', 'Potencia Despegue')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="HelicopterController" data-prop="potenciaDespegue" value="${ley.potenciaDespegue}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="MAX_SPEED">${L.get('MAX_SPEED', 'Velocidad Máx')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="HelicopterController" data-prop="velocidadMaxima" value="${ley.velocidadMaxima}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="TURN_AGILITY">${L.get('TURN_AGILITY', 'Agilidad Giro')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="HelicopterController" data-prop="agilidadGiro" value="${ley.agilidadGiro}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input inspector-re-render" data-component="HelicopterController" data-prop="autoEstabilizar" ${ley.autoEstabilizar ? 'checked' : ''}>
                        <label data-i18n="AUTO_STABILIZE">${L.get('AUTO_STABILIZE', 'Auto-Estabilizar')}</label>
                    </div>
                    <div class="prop-row-multi" style="display: ${ley.autoEstabilizar ? 'flex' : 'none'};">
                        <label title="Fuerza de auto-nivelación" data-i18n="STABILITY">${L.get('STABILITY', 'Estabilidad')}</label>
                        <input type="number" autocomplete="off" step="0.1" class="prop-input" data-component="HelicopterController" data-prop="estabilidad" value="${ley.estabilidad}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="Resistencia al aire (0-1)" data-i18n="AIR_DRAG">${L.get('AIR_DRAG', 'Arrastre Aire')}</label>
                        <input type="number" autocomplete="off" step="0.01" min="0" max="1" class="prop-input" data-component="HelicopterController" data-prop="arrastreAire" value="${ley.arrastreAire}">
                    </div>
                    <div class="inspector-row">
                        <label>Sonido Motor</label>
                        ${renderPropertyDropper('Audio', ley.engineSound, 'data-component="HelicopterController" data-prop="engineSound"')}
                    </div>

                    <div class="inspector-section-header"><span>${L.get('ANIMATIONS', 'Animaciones')}</span></div>
                    <div class="prop-row-multi">
                        <label>Idle</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="HelicopterController" data-prop="idleAnim" value="${ley.idleAnim || ''}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Fly</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="HelicopterController" data-prop="flyAnim" value="${ley.flyAnim || ''}">
                    </div>

                    <div class="inspector-section-header"><span data-i18n="CONTROLS">${L.get('CONTROLS', 'Controles')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="KEYS_THRUST_DESCEND">${L.get('KEYS_THRUST_DESCEND', 'Subir/Bajar')}</label>
                        <div class="prop-inputs">
                            <input type="text" autocomplete="off" class="prop-input" data-component="HelicopterController" data-prop="teclaPotencia" value="${ley.teclaPotencia}" title="Subir">
                            <input type="text" autocomplete="off" class="prop-input" data-component="HelicopterController" data-prop="teclaDescenso" value="${ley.teclaDescenso}" title="Bajar">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="KEYS_TURN">${L.get('KEYS_TURN', 'Girar (A/D)')}</label>
                        <div class="prop-inputs">
                            <input type="text" autocomplete="off" class="prop-input" data-component="HelicopterController" data-prop="teclaGiroIzquierda" value="${ley.teclaGiroIzquierda}" title="Izquierda">
                            <input type="text" autocomplete="off" class="prop-input" data-component="HelicopterController" data-prop="teclaGiroDerecha" value="${ley.teclaGiroDerecha}" title="Derecha">
                        </div>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.Bone) {
            componentHTML = `
                ${renderComponentHeader(L.get('BONE', "Hueso"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="LONGITUD">${L.get('LONGITUD', 'Longitud')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="Bone" data-prop="length" value="${ley.length}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="GROSOR">${L.get('GROSOR', 'Grosor')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="Bone" data-prop="thickness" value="${ley.thickness}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_COLOR">${L.get('PROP_COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="Bone" data-prop="color" value="${ley.color || '#00ff00'}">
                            <input type="text" autocomplete="off" class="prop-input hex-input" data-component="Bone" data-prop="color" value="${ley.color || '#00ff00'}" style="flex-grow: 1; font-family: monospace;">
                        </div>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.SkeletonRenderer) {
            componentHTML = `
                ${renderComponentHeader(L.get('SKELETON_RENDERER', "Esqueleto"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="IMAGEN">${L.get('IMAGEN', 'Imagen')}</label>
                        ${renderPropertyDropper('Sprite', ley.source, 'data-component="SkeletonRenderer" data-prop="source"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_OPACITY">${L.get('PROP_OPACITY', 'Opacidad')}</label>
                        <input type="range" class="prop-input" data-component="SkeletonRenderer" data-prop="opacity" value="${ley.opacity}" min="0" max="1" step="0.01">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="VERTICES">${L.get('VERTICES', 'Vértices')}</label>
                        <span class="field-value">${ley.mesh.vertices.length / 2}</span>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="HUESOS_ASIGNADOS">${L.get('HUESOS_ASIGNADOS', 'Huesos Asignados')}</label>
                        <span class="field-value">${ley.bones.length}</span>
                    </div>
                    <button class="panel-tool-btn" style="width:100%; margin-top: 8px;" onclick="const s = window.SceneManager.currentScene.findMateriaById(${selectedMateria.id}).getComponent(window.Components.SkeletonRenderer); s.bones = window.SceneManager.currentScene.getAllMaterias().filter(m => m.getComponentByName('Bone')).map(m => m.name || m.id); window.updateInspector();" data-i18n="AUTO_ASIGNAR_HUESOS">${L.get('AUTO_ASIGNAR_HUESOS', 'Auto-Asignar Huesos')}</button>
                    <p class="field-description" data-i18n="AUTO_ASIGNAR_HUESOS_DESC">${L.get('AUTO_ASIGNAR_HUESOS_DESC', 'Asigna automáticamente todos los objetos con componente \'Bone\' de la escena a este renderizador.')}</p>
                    <hr>
                    <button class="primary-btn" style="width:100%;" onclick="const s = window.SceneManager.currentScene.findMateriaById(${selectedMateria.id}).getComponent(window.Components.SkeletonRenderer); const scene = window.SceneManager.currentScene; s.bindPoses = s.bones.map(key => { let b; if(typeof key === 'number') b = scene.findMateriaById(key); else b = s.materia.findChildByName(key, true); if(!b) return null; const t = b.getComponentByName('Transform'); return { x: t.x, y: t.y, rotation: t.rotation, scale: { ...t.scale } }; }); window.Dialogs.showNotification(window.Localization.get('EXITO', 'Éxito'), window.Localization.get('POSE_CAPTURADA', 'Pose base capturada.'));" data-i18n="CAPTURAR_POSE_BASE">${L.get('CAPTURAR_POSE_BASE', 'Capturar Pose Base (Bind Pose)')}</button>
                    <hr>
                    <div class="weight-painter-ui">
                        <button class="panel-tool-btn ${window.SceneView?.getActiveTool() === 'weight-painter' ? 'active' : ''}" style="width: 100%; margin-bottom: 10px;" onclick="const tool = window.SceneView.getActiveTool() === 'weight-painter' ? 'move' : 'weight-painter'; window.SceneView.setActiveTool(tool); window.updateInspector();">
                            ${window.SceneView?.getActiveTool() === 'weight-painter' ? L.get('DETENER_PINTADO', 'Detener Pintado') : L.get('PINTAR_PESOS', 'Pintar Pesos')}
                        </button>
                        <div class="prop-row-multi">
                            <label data-i18n="HUESO">${L.get('HUESO', 'Hueso')}</label>
                            <select class="prop-input" onchange="window.WeightPainter.selectedBone = this.value;">
                                <option value="">-- ${L.get('SELECCIONAR', 'Seleccionar')} --</option>
                                ${ley.bones.map(b => `<option value="${b}" ${window.WeightPainter?.selectedBone === b ? 'selected' : ''}>${b}</option>`).join('')}
                            </select>
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="SIZE">${L.get('SIZE', 'Tamaño')}</label>
                            <input type="range" min="1" max="200" value="${window.WeightPainter?.brushSize || 50}" oninput="window.WeightPainter.brushSize = parseFloat(this.value); this.nextElementSibling.innerText = this.value;">
                            <span style="min-width: 30px; text-align: right;">${window.WeightPainter?.brushSize || 50}</span>
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="FUERZA">${L.get('FUERZA', 'Fuerza')}</label>
                            <input type="range" min="0" max="1" step="0.01" value="${window.WeightPainter?.strength || 0.5}" oninput="window.WeightPainter.strength = parseFloat(this.value); this.nextElementSibling.innerText = Math.round(this.value * 100) + '%';">
                            <span style="min-width: 30px; text-align: right;">${Math.round((window.WeightPainter?.strength || 0.5) * 100)}%</span>
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="MODO">${L.get('MODO', 'Modo')}</label>
                            <select class="prop-input" onchange="window.WeightPainter.mode = this.value;">
                                <option value="add" ${window.WeightPainter?.mode === 'add' ? 'selected' : ''} data-i18n="ANADIR">${L.get('ANADIR', 'Añadir')}</option>
                                <option value="subtract" ${window.WeightPainter?.mode === 'subtract' ? 'selected' : ''} data-i18n="RESTAR">${L.get('RESTAR', 'Restar')}</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.IKManager2D) {
            componentHTML = `
                ${renderComponentHeader(L.get('IK_MANAGER_2D', "IK Manager 2D"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="OBJETIVO_TARGET">${L.get('OBJETIVO_TARGET', 'Objetivo (Target)')}</label>
                        ${renderPropertyDropper('Materia', ley.target, 'data-component="IKManager2D" data-prop="target"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="LARGO_CADENA">${L.get('LARGO_CADENA', 'Largo Cadena')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="IKManager2D" data-prop="chainLength" value="${ley.chainLength}" min="1">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="ITERACIONES">${L.get('ITERACIONES', 'Iteraciones')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="IKManager2D" data-prop="iterations" value="${ley.iterations}" min="1">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="TOLERANCIA">${L.get('TOLERANCIA', 'Tolerancia')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="IKManager2D" data-prop="tolerance" value="${ley.tolerance}" step="0.01" min="0.01">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.SceneLoader) {
            componentHTML = `
                ${renderComponentHeader(L.get('SCENE_LOADER', "Cargar Escena"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="SCENE_PATH">${L.get('SCENE_PATH', 'Ruta de Escena')}</label>
                        ${renderPropertyDropper('Scene', ley.scenePath, 'data-component="SceneLoader" data-prop="scenePath"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="TRIGGER_TAG">${L.get('TRIGGER_TAG', 'Tag Activador')}</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="SceneLoader" data-prop="triggerTag" value="${ley.triggerTag || ''}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="TRIGGER_KEY">${L.get('TRIGGER_KEY', 'Tecla Activadora')}</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="SceneLoader" data-prop="triggerKey" value="${ley.triggerKey || ''}">
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="BUTTON_MATERIA">${L.get('BUTTON_MATERIA', 'Materia Botón')}</label>
                        ${renderPropertyDropper('Materia', ley.buttonMateria, 'data-component="SceneLoader" data-prop="buttonMateria"')}
                    </div>
                    <p class="field-description">${L.get('SCENE_LOADER_DESC', 'Carga una escena cuando el jugador colisiona, se presiona una tecla o se clica en el botón asignado.')}</p>
                </div>
            `;
        } else if (ley instanceof Components.BasicAI) {
            const renderAIFuncInput = (propName, label) => {
                let inputHTML = `<input type="text" autocomplete="off" class="prop-input" data-component="BasicAI" data-prop="${propName}" value="${ley[propName] || ''}" placeholder="${L.get('EXAMPLE_AI_FUNC', 'ej: alDetectarEnemigo')}">`;

                if (ley.scriptTarget) {
                    const targetMateria = window.SceneManager.currentScene.findMateriaById(ley.scriptTarget);
                    if (targetMateria) {
                        const scripts = targetMateria.getComponents(Components.CreativeScript);
                        let allFunctions = [];
                        scripts.forEach(s => {
                            const metadata = CES_Transpiler.getScriptMetadata(s.scriptName);
                            if (metadata && metadata.publicFunctions) {
                                allFunctions = allFunctions.concat(metadata.publicFunctions);
                            }
                        });

                        if (allFunctions.length > 0) {
                            inputHTML = `
                                <select class="prop-input" data-component="BasicAI" data-prop="${propName}">
                                    <option value="">${L.get('SELECT_FUNCTION', '-- Seleccionar Función --')}</option>
                                    ${allFunctions.map(f => `<option value="${f}" ${ley[propName] === f ? 'selected' : ''}>${f}</option>`).join('')}
                                </select>
                            `;
                        }
                    }
                }
                return `
                    <div class="prop-row-multi">
                        <label>${label}</label>
                        ${inputHTML}
                    </div>
                `;
            };

            componentHTML = `
                ${renderComponentHeader(L.get('BASIC_AI', "IA Básica"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="TARGET">${L.get('TARGET', 'Objetivo')}</label>
                        ${renderPropertyDropper('Materia', ley.target, 'data-component="BasicAI" data-prop="target"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="BEHAVIOR">${L.get('BEHAVIOR', 'Comportamiento')}</label>
                        <select class="prop-input" data-component="BasicAI" data-prop="behavior">
                            <option value="Follow" ${ley.behavior === 'Follow' ? 'selected' : ''} data-i18n="FOLLOW">${L.get('FOLLOW', 'Seguir')}</option>
                            <option value="Escape" ${ley.behavior === 'Escape' ? 'selected' : ''} data-i18n="ESCAPE">${L.get('ESCAPE', 'Escapar')}</option>
                            <option value="Wander" ${ley.behavior === 'Wander' ? 'selected' : ''} data-i18n="WANDER">${L.get('WANDER', 'Vagar')}</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="MOVEMENT_TYPE">${L.get('MOVEMENT_TYPE', 'Tipo Movimiento')}</label>
                        <select class="prop-input" data-component="BasicAI" data-prop="movementType">
                            <option value="Top-Down" ${ley.movementType === 'Top-Down' ? 'selected' : ''} data-i18n="TOP_DOWN">Top-Down</option>
                            <option value="Platformer" ${ley.movementType === 'Platformer' ? 'selected' : ''} data-i18n="PLATFORMER">${L.get('PLATFORMER', 'Plataformas')}</option>
                            <option value="Fighter" ${ley.movementType === 'Fighter' ? 'selected' : ''} data-i18n="FIGHTER">${L.get('FIGHTER', 'Fighter (Smash)')}</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="VELOCIDAD">${L.get('VELOCIDAD', 'Velocidad')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="BasicAI" data-prop="speed" value="${ley.speed}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="STOP_DISTANCE">${L.get('STOP_DISTANCE', 'Distancia Parada')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="BasicAI" data-prop="stopDistance" value="${ley.stopDistance}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="ATTACK_DISTANCE">${L.get('ATTACK_DISTANCE', 'Distancia Ataque')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="BasicAI" data-prop="attackDistance" value="${ley.attackDistance}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="JUMP_FORCE">${L.get('JUMP_FORCE', 'Fuerza Salto')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="BasicAI" data-prop="jumpForce" value="${ley.jumpForce}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="BasicAI" data-prop="autoRotate" ${ley.autoRotate ? 'checked' : ''}>
                        <label data-i18n="AUTO_ROTATE">${L.get('AUTO_ROTATE', 'Rotación Automática')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="BasicAI" data-prop="obstacleAvoidance" ${ley.obstacleAvoidance ? 'checked' : ''}>
                        <label data-i18n="OBSTACLE_AVOIDANCE">${L.get('OBSTACLE_AVOIDANCE', 'Esquivar Obstáculos')}</label>
                    </div>
                    <hr>
                    <div class="inspector-section-header"><span data-i18n="STEERING_RAYS">${L.get('STEERING_RAYS', 'Steering (Rayos)')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="RAY_COUNT">${L.get('RAY_COUNT', 'Num Rayos')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="BasicAI" data-prop="rayCount" value="${ley.rayCount}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="RAY_SPREAD">${L.get('RAY_SPREAD', 'Apertura Rayos')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="BasicAI" data-prop="raySpread" value="${ley.raySpread}">
                    </div>
                    <hr>
                    <div class="inspector-section-header"><span data-i18n="DETECTION_AND_FUNCTIONS">${L.get('DETECTION_AND_FUNCTIONS', 'Detección y Funciones')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="DETECTION_DISTANCE">${L.get('DETECTION_DISTANCE', 'Distancia Detección')}</label>
                        <input type="number" autocomplete="off" class="prop-input" data-component="BasicAI" data-prop="detectionDistance" value="${ley.detectionDistance}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="DETECTION_TAGS">${L.get('DETECTION_TAGS', 'Tags de Detección')}</label>
                        <input type="text" autocomplete="off" class="prop-input" data-component="BasicAI" data-prop="detectionTagsString" value="${(ley.detectionTags || []).join(', ')}" placeholder="${L.get('DETECTION_TAGS_HINT', 'Player, Enemy...')}">
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="EXECUTE_ON">${L.get('EXECUTE_ON', 'Ejecutar en')}</label>
                        ${renderPropertyDropper('Materia', ley.scriptTarget, 'data-component="BasicAI" data-prop="scriptTarget"')}
                    </div>
                    ${renderAIFuncInput('onTargetSeen', L.get('ON_TARGET_SEEN', 'Al ver Objetivo'))}
                    ${renderAIFuncInput('onTargetLost', L.get('ON_TARGET_LOST', 'Al perder Objetivo'))}
                    ${renderAIFuncInput('onTargetNear', L.get('ON_TARGET_NEAR', 'Al estar cerca'))}
                    ${renderAIFuncInput('onAttackRange', L.get('ON_ATTACK_RANGE', 'Rango Ataque'))}
                </div>
            `;
        } else if (ley.constructor.name === 'SkinnedMeshRenderer3D') {
            componentHTML = `
                ${renderComponentHeader(L.get('SKINNED_MESH_RENDERER_3D', "Skinned Mesh Renderer 3D"), icon, index)}
                <div class="component-content">
                    <div class="inspector-group">
                        <div class="prop-row-multi">
                            <label data-i18n="MODEL_PATH">Model Path</label>
                            <input type="text" class="prop-input" data-component="SkinnedMeshRenderer3D" data-prop="modelPath" value="${ley.modelPath || ''}" readonly>
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="COLOR">Color</label>
                            <input type="color" class="prop-input" data-component="SkinnedMeshRenderer3D" data-prop="color" value="${ley.color}">
                        </div>
                    </div>
                </div>
            `;
        } else if (ley.constructor.name === 'Animator3D') {
            componentHTML = `
                ${renderComponentHeader(L.get('ANIMATOR_3D', "Animator 3D"), icon, index)}
                <div class="component-content">
                    <div class="inspector-group">
                        <div class="prop-row-multi">
                            <label data-i18n="VELOCIDAD">Speed</label>
                            <input type="number" class="prop-input" data-component="Animator3D" data-prop="speed" value="${ley.speed}" step="0.1">
                        </div>
                        <div class="checkbox-field">
                            <input type="checkbox" class="prop-input" data-component="Animator3D" data-prop="loop" ${ley.loop ? 'checked' : ''}>
                            <label data-i18n="BUCLE">Loop</label>
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="ANIMACIONES">Animations</label>
                            <select class="prop-input" data-component="Animator3D" data-prop="currentAnimation">
                                ${ley.animations.map(a => `<option value="${a.name}" ${ley.currentAnimation?.name === a.name ? 'selected' : ''}>${a.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>
            `;
        } else if (ley.constructor.name === 'MeshRenderer3D') {
            componentHTML = `
                ${renderComponentHeader(L.get('MESH_RENDERER_3D', "Mesh Renderer 3D"), icon, index)}
                <div class="component-content">
                    <div class="inspector-group">
                        <div class="prop-row-multi">
                            <label data-i18n="MESH_TYPE">Tipo de Malla</label>
                            <select class="prop-input inspector-re-render" data-component="MeshRenderer3D" data-prop="meshType">
                                <option value="Cube" ${ley.meshType === 'Cube' ? 'selected' : ''}>Cubo</option>
                                <option value="Sphere" ${ley.meshType === 'Sphere' ? 'selected' : ''}>Esfera</option>
                                <option value="Plane" ${ley.meshType === 'Plane' ? 'selected' : ''}>Plano</option>
                                <option value="Triangle" ${ley.meshType === 'Triangle' ? 'selected' : ''}>Triángulo</option>
                                <option value="Capsule" ${ley.meshType === 'Capsule' ? 'selected' : ''}>Cápsula</option>
                            </select>
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="COLOR">Color</label>
                            <input type="color" class="prop-input" data-component="MeshRenderer3D" data-prop="color" value="${ley.color}">
                        </div>
                    </div>
                    <div class="inspector-group">
                        <div class="checkbox-field padded-checkbox-field">
                            <input type="checkbox" class="prop-input" data-component="MeshRenderer3D" data-prop="isUnlit" ${ley.isUnlit ? 'checked' : ''}>
                            <label data-i18n="UNLIT">Sin Luces (Unlit)</label>
                        </div>
                        <div class="checkbox-field padded-checkbox-field">
                            <input type="checkbox" class="prop-input" data-component="MeshRenderer3D" data-prop="castShadows" ${ley.castShadows ? 'checked' : ''}>
                            <label data-i18n="CAST_SHADOWS">Generar Sombras</label>
                        </div>
                    </div>
                </div>
            `;
        } else if (ley.constructor.name === 'Rigidbody3D') {
            componentHTML = `
                ${renderComponentHeader(L.get('RIGIDBODY_3D', "Rigidbody 3D"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="MASS">Masa</label>
                        <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="Rigidbody3D" data-prop="mass" value="${ley.mass}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Rigidbody3D" data-prop="useGravity" ${ley.useGravity ? 'checked' : ''}>
                        <label data-i18n="USE_GRAVITY">Usar Gravedad</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Rigidbody3D" data-prop="isKinematic" ${ley.isKinematic ? 'checked' : ''}>
                        <label data-i18n="IS_KINEMATIC">Cinemático (Kinematic)</label>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="DRAG">Arrastre (Drag)</label>
                        <input type="number" autocomplete="off" class="prop-input" step="0.01" data-component="Rigidbody3D" data-prop="drag" value="${ley.drag}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="ANGULAR_DRAG">Arrastre Angular</label>
                        <input type="number" autocomplete="off" class="prop-input" step="0.01" data-component="Rigidbody3D" data-prop="angularDrag" value="${ley.angularDrag}">
                    </div>
                </div>
            `;
        } else if (ley.constructor.name === 'BoxCollider3D') {
            componentHTML = `
                ${renderComponentHeader(L.get('BOX_COLLIDER_3D', "Box Collider 3D"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="BoxCollider3D" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label data-i18n="IS_TRIGGER">Es Gatillo (Trigger)</label>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SIZE">Tamaño</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="BoxCollider3D" data-prop="size.x" value="${ley.size.x}" title="X">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="BoxCollider3D" data-prop="size.y" value="${ley.size.y}" title="Y">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="BoxCollider3D" data-prop="size.z" value="${ley.size.z}" title="Z">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="OFFSET">Desplazamiento</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="BoxCollider3D" data-prop="offset.x" value="${ley.offset.x}" title="X">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="BoxCollider3D" data-prop="offset.y" value="${ley.offset.y}" title="Y">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="BoxCollider3D" data-prop="offset.z" value="${ley.offset.z}" title="Z">
                        </div>
                    </div>
                </div>
            `;
        } else if (ley.constructor.name === 'SphereCollider3D') {
            componentHTML = `
                ${renderComponentHeader(L.get('SPHERE_COLLIDER_3D', "Sphere Collider 3D"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="SphereCollider3D" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label data-i18n="IS_TRIGGER">Es Gatillo (Trigger)</label>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="RADIUS">Radio</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" data-component="SphereCollider3D" data-prop="radius" value="${ley.radius}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="OFFSET">Desplazamiento</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="SphereCollider3D" data-prop="offset.x" value="${ley.offset.x}" title="X">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="SphereCollider3D" data-prop="offset.y" value="${ley.offset.y}" title="Y">
                            <input type="number" autocomplete="off" class="prop-input" step="1" data-component="SphereCollider3D" data-prop="offset.z" value="${ley.offset.z}" title="Z">
                        </div>
                    </div>
                </div>
            `;
        } else if (ley.constructor.name === 'CapsuleCollider3D') {
            componentHTML = `
                ${renderComponentHeader(L.get('CAPSULE_COLLIDER_3D', "Capsule Collider 3D"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="CapsuleCollider3D" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label data-i18n="IS_TRIGGER">Es Gatillo (Trigger)</label>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="RADIUS">Radio</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" data-component="CapsuleCollider3D" data-prop="radius" value="${ley.radius}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="HEIGHT">Altura</label>
                        <input type="number" autocomplete="off" class="prop-input" step="1" data-component="CapsuleCollider3D" data-prop="height" value="${ley.height}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="ORIENTATION">Orientación</label>
                        <select class="prop-input" data-component="CapsuleCollider3D" data-prop="direction">
                            <option value="X" ${ley.direction === 'X' ? 'selected' : ''}>X</option>
                            <option value="Y" ${ley.direction === 'Y' ? 'selected' : ''}>Y</option>
                            <option value="Z" ${ley.direction === 'Z' ? 'selected' : ''}>Z</option>
                        </select>
                    </div>
                </div>
            `;
        } else if (ley.constructor.name === 'PlaneCollider3D') {
            componentHTML = `
                ${renderComponentHeader(L.get('PLANE_COLLIDER_3D', "Plane Collider 3D"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="PlaneCollider3D" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label data-i18n="IS_TRIGGER">Es Gatillo (Trigger)</label>
                    </div>
                    <p class="field-description">El colisionador de plano es infinito y se sitúa en el plano XZ local.</p>
                </div>
            `;
        } else if (ley.constructor.name === 'Terreno3D') {
            componentHTML = `
                ${renderComponentHeader(L.get('TERRENO_3D', "Terreno 3D"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="COLOR">Color</label>
                        <input type="color" class="prop-input" data-component="Terreno3D" data-prop="color" value="${ley.color}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SIZE">Tamaño</label>
                        <div class="prop-inputs">
                            <input type="number" autocomplete="off" class="prop-input" step="10" data-component="Terreno3D" data-prop="size.x" value="${ley.size.x}" title="X">
                            <input type="number" autocomplete="off" class="prop-input" step="10" data-component="Terreno3D" data-prop="size.z" value="${ley.size.z}" title="Z">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="RESOLUTION">Resolución</label>
                        <input type="number" autocomplete="off" class="prop-input inspector-re-render" data-component="Terreno3D" data-prop="resolution" value="${ley.resolution}" readonly>
                    </div>
                    <hr>
                    <div id="terreno-editor-container" class="terrain-editor-embedded"></div>
                    <button class="primary-btn" style="width:100%; margin-top:10px;" onclick="window.SceneView.setActiveTool('sculpt')">Activar Pincel 3D (V)</button>
                </div>
            `;
            // Trigger setup after HTML is inserted (will happen after the loop)
            setTimeout(() => TerrenoEditorWindow.setupUI(), 10);
        } else if (ley.constructor.name === 'TerrenoCollider3D') {
            componentHTML = `
                ${renderComponentHeader(L.get('TERRENO_COLLIDER_3D', "Terreno Collider 3D"), icon, index)}
                <div class="component-content">
                    <p class="field-description">Genera colisiones automáticamente basadas en la malla del terreno.</p>
                </div>
            `;
        } else if (ley.constructor.name === 'DirectionalLight3D' || ley.constructor.name === 'PointLight3D' || ley.constructor.name === 'SpotLight3D') {
            const type = ley.constructor.name;
            const isDir = type === 'DirectionalLight3D';
            const isSpot = type === 'SpotLight3D';

            componentHTML = `
                ${renderComponentHeader(L.get(type.toUpperCase(), type), icon, index)}
                <div class="component-content">
                    <div class="inspector-group">
                        <div class="prop-row-multi">
                            <label data-i18n="COLOR">Color</label>
                            <input type="color" class="prop-input" data-component="${type}" data-prop="color" value="${ley.color}">
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="INTENSITY">Intensidad</label>
                            <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="${type}" data-prop="intensity" value="${ley.intensity}">
                        </div>
                    </div>
                    <div class="inspector-group">
                        ${isDir ? `
                        <div class="prop-row-multi">
                            <label data-i18n="DIRECTION">Dirección</label>
                            <div class="prop-inputs">
                                <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="${type}" data-prop="direction.x" value="${ley.direction.x}" title="X">
                                <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="${type}" data-prop="direction.y" value="${ley.direction.y}" title="Y">
                                <input type="number" autocomplete="off" class="prop-input" step="0.1" data-component="${type}" data-prop="direction.z" value="${ley.direction.z}" title="Z">
                            </div>
                        </div>
                        ` : `
                        <div class="prop-row-multi">
                            <label data-i18n="RANGE">Rango</label>
                            <input type="number" autocomplete="off" class="prop-input" data-component="${type}" data-prop="range" value="${ley.range}">
                        </div>
                        `}
                        ${isSpot ? `
                        <div class="prop-row-multi">
                            <label data-i18n="ANGLE">Ángulo</label>
                            <input type="number" autocomplete="off" class="prop-input" data-component="${type}" data-prop="angle" value="${ley.angle}">
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }


        if (componentHTML) {
            const componentWrapper = document.createElement('div');
            componentWrapper.className = 'component-inspector';
            componentWrapper.innerHTML = componentHTML;

            // This is a robust way to append the contents of the wrapper
            while(componentWrapper.firstChild) {
                componentsWrapper.appendChild(componentWrapper.firstChild);
            }
        }
        } catch (e) {
            console.error(`Error rendering component ${index}:`, e);
            const errorWrapper = document.createElement('div');
            errorWrapper.className = 'component-inspector error';
            errorWrapper.innerHTML = `<div class="component-header"><h4>Error: ${ley.constructor.name}</h4></div><div class="component-content"><p>Error rendering this component. Check console for details.</p></div>`;
            componentsWrapper.appendChild(errorWrapper);
        }
    });
    };

    // --- Renderizado Organizado ---

    // 1. Renderizar 3D primero (sueltos por defecto)
    const order = ['basico', 'fisica', 'sonido', 'camara', 'otros'];
    const sectionTitles = {
        basico: L.get('CAT_BASICO_3D', 'Básico 3D'),
        fisica: L.get('CAT_FISICA_3D', 'Física 3D'),
        sonido: L.get('CAT_SONIDO_3D', 'Sonido'),
        camara: L.get('CAT_CAMARA_3D', 'Cámara'),
        otros: L.get('CAT_OTROS_3D', 'Componentes 3D')
