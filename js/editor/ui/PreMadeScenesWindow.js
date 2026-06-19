/**
 * PreMadeScenesWindow.js
 * Gallery of ready-to-use scene templates for the user.
 * (c) 2024 Carley Interactive Studio
 */

import * as SceneManager from '../../engine/SceneManager.js';
import { showNotification } from './DialogWindow.js';

let dom = {};

export function showPreMadeScenesWindow() {
    const L = window.Localization;
    const existing = document.getElementById('pre-made-scenes-window');
    if (existing) {
        existing.style.display = 'block';
        bringToFront(existing);
        return;
    }

    const win = document.createElement('div');
    win.id = 'pre-made-scenes-window';
    win.className = 'floating-panel';
    win.style.width = '600px';
    win.style.height = '500px';
    win.innerHTML = `
        <div class="panel-header">
            <span class="panel-title">${L.get('ESCENAS_PRE_HECHAS', 'Escenas Pre-hechas')}</span>
            <button class="close-btn">&times;</button>
        </div>
        <div class="panel-content">
            <div class="scenes-grid"></div>
        </div>
    `;

    document.body.appendChild(win);
    dom.grid = win.querySelector('.scenes-grid');

    win.querySelector('.close-btn').onclick = () => win.style.display = 'none';

    updateContent();
}

function updateContent() {
    const L = window.Localization;
    const templates = [
        {
            id: 'city-start',
            name: L.get('CIUDAD_INICIAL', 'Ciudad Inicial 3D'),
            description: L.get('CIUDAD_DESC', 'Una pequeña zona urbana con calles, edificios y un auto pro ya configurado para conducir.'),
            thumbnail: 'https://images.pexels.com/photos/1034662/pexels-photo-1034662.jpeg?auto=compress&cs=tinysrgb&w=400',
            type: '3d'
        },
        {
            id: 'race-track',
            name: L.get('PISTA_CARRERAS', 'Circuito de Carreras'),
            description: L.get('PISTA_DESC', 'Pista de alta velocidad con curvas técnicas y terreno 3D optimizado.'),
            thumbnail: 'https://images.pexels.com/photos/35967/pexels-photo-35967.jpg?auto=compress&cs=tinysrgb&w=400',
            type: '3d'
        },
        {
            id: 'character-test',
            name: L.get('PRUEBA_PERSONAJE', 'Campo de Personajes'),
            description: L.get('CHAR_DESC', 'Escena preparada para probar personajes humanoides, ropa y animaciones procedimentales.'),
            thumbnail: 'https://images.pexels.com/photos/163036/mario-luigi-yoshi-figures-163036.jpeg?auto=compress&cs=tinysrgb&w=400',
            type: '3d'
        }
    ];

    dom.grid.innerHTML = '';
    templates.forEach(tpl => {
        const card = document.createElement('div');
        card.className = 'scene-template-card';
        card.innerHTML = `
            <div class="card-thumb" style="background-image: url('${tpl.thumbnail}')"></div>
            <div class="card-info">
                <h3>${tpl.name}</h3>
                <p>${tpl.description}</p>
                <button class="create-btn primary-btn">${L.get('CREAR_ESCENA', 'Crear Escena')}</button>
            </div>
        `;

        card.querySelector('.create-btn').onclick = () => instantiateTemplate(tpl);
        dom.grid.appendChild(card);
    });
}

async function instantiateTemplate(tpl) {
    const L = window.Localization;
    const assetsDir = await (await window.projectsDirHandle.getDirectoryHandle(new URLSearchParams(window.location.search).get('project'))).getDirectoryHandle('Assets');

    const fileName = `${tpl.id}_${Date.now()}.ceScene`;

    // We'll create a structured scene with a terrain and a car
    const materias = [
        {
            id: 100, name: "Suelo", isActive: true,
            leyes: [
                { type: "Transform", position: {x:0, y:0, z:0}, scale: {x:10000, y:1, z:10000} },
                { type: "MeshRenderer3D", meshType: "Plane", color: "#333333" },
                { type: "PlaneCollider3D" }
            ]
        }
    ];

    if (tpl.id === 'city-start' || tpl.id === 'race-track') {
        materias.push({
            id: 101, name: "Auto_Inicial", isActive: true,
            leyes: [
                { type: "Transform", position: {x:0, y:-50, z:0} },
                { type: "Rigidbody3D", mass: 1500, useGravity: true },
                { type: "BoxCollider3D", size: {x:220, y:100, z:450} },
                { type: "VehicleController3D", motorForce: 2500, wheels: [102, 103, 104, 105] }
            ],
            children: [
                { id: 102, name: "Rueda_DI", leyes: [{ type: "Transform", localPosition: {x:-120, y:50, z:-160} }, { type: "WheelCollider3D", radius: 30 }] },
                { id: 103, name: "Rueda_DD", leyes: [{ type: "Transform", localPosition: {x:120, y:50, z:-160} }, { type: "WheelCollider3D", radius: 30 }] },
                { id: 104, name: "Rueda_TI", leyes: [{ type: "Transform", localPosition: {x:-120, y:50, z:160} }, { type: "WheelCollider3D", radius: 30 }] },
                { id: 105, name: "Rueda_TD", leyes: [{ type: "Transform", localPosition: {x:120, y:50, z:160} }, { type: "WheelCollider3D", radius: 30 }] }
            ]
        });
        materias.push({
            id: 106, name: "Camara_Seguimiento", isActive: true,
            leyes: [
                { type: "Transform", position: {x:0, y:-300, z:800}, rotationX: 15 },
                { type: "Camera", projection: "Perspective", fov: 60, clearFlags: "Skybox" },
                { type: "CameraControl3D", target: 101, distance: 700, height: 150 }
            ]
        });
    } else if (tpl.id === 'character-test') {
        // Character test scene logic could be more complex, but for now we'll just add a camera
        // Note: Real character setup usually requires Procedural bones which are easier via Factory
        materias.push({
            id: 200, name: "Camara_Libre", isActive: true,
            leyes: [
                { type: "Transform", position: {x:0, y:-150, z:500}, rotationX: 10 },
                { type: "Camera", projection: "Perspective", fov: 60, clearFlags: "Skybox" }
            ]
        });
        materias.push({
            id: 201, name: "Luz_Escena", leyes: [{ type: "Transform", localRotation: {x:50, y:-30, z:0} }, { type: "DirectionalLight3D" }]
        });
    }

    const sceneData = {
        name: tpl.name,
        version: "0.1.2",
        materias: materias,
        ambiente: {
            skyMode: 'Gradient',
            skyColor: '#87ceeb',
            horizonColor: '#ffffff',
            groundColor: '#222222'
        }
    };

    try {
        const fileHandle = await assetsDir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(sceneData, null, 2));
        await writable.close();

        showNotification(L.get('EXITO', 'Éxito'), L.get('ESCENA_CREADA', 'Escena de plantilla creada en Assets. Ábrela para empezar.'));
        if (window.updateAssetBrowser) window.updateAssetBrowser();
    } catch (e) {
        console.error(e);
        showNotification(L.get('ERROR', 'Error'), L.get('ERROR_CREAR_ESCENA', 'No se pudo crear la escena.'));
    }
}

function bringToFront(el) {
    if (window.bringToFront) window.bringToFront(el);
}
