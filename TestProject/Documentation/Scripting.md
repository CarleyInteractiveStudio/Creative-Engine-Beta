# Scripting Examples / Ejemplos de Scripting

## Overview (English)
This document shows the recommended lifecycle hooks and helper properties available to your scripts:

- start() / star() - called once when the game begins (start preferred, star kept for compatibility)
- update(deltaTime) - called every frame
- fixedUpdate(deltaTime) - called at a fixed timestep (50 Hz by default) for deterministic logic
- onEnable() / alHabilitar() - called when the script is enabled
- onDisable() / alDeshabilitar() - called when the script is disabled
- onDestroy() / alDestruir() - called when the script is destroyed

Helpers available on scripts (bilingual):
- transform / transformacion - access the Transform component (use localPosition to change relative position)
- gameObject / objeto - the Materia object
- scene / escena - the scene reference
- log / registrar - quick console logging
- find(nameOrId) / buscar(nameOrId) - find other Materias in the scene

Public variables declared in the script appear in the Inspector and are resolved automatically:
- Materia typed variables accept IDs or names and are resolved at start
- Defaults declared in script metadata are applied when Inspector doesn't override

## Resumen (Español)
Ganchos de ciclo de vida y utilidades disponibles:

- start() / star() - llamado una vez al iniciar el juego (se recomienda usar `start`, `star` es compatibilidad)
- update(deltaTime) - llamado cada fotograma
- fixedUpdate(deltaTime) - llamado a paso fijo (50 Hz por defecto) para lógica determinista
- onEnable() / alHabilitar() - cuando el script se activa
- onDisable() / alDeshabilitar() - cuando el script se desactiva
- onDestroy() / alDestruir() - cuando el script se destruye

Accesos rápidos dentro del script (bilingüe):
- transform / transformacion - Transform del objeto (modificar `localPosition` para mantener relación padre-hijo)
- gameObject / objeto - la Materia
- scene / escena - referencia a la escena
- log / registrar - logging
- find(nameOrId) / buscar(nameOrId) - buscar Materias en la escena

Ejemplo: `ScriptingExamples.ces` en `TestProject/Assets/scripts` muestra las buenas prácticas.

Pruebas manuales rápidas:
1. Abre la escena de prueba en el editor.
2. Añade una Materia nueva y anexa el script `ScriptingTests.ces` a ella.
3. Presiona Play y revisa la consola del navegador: `window.TEST_LOG` debe contener al menos `['onEnable','start','fixedUpdate','update', ...]` según pasen fotogramas.
4. Presiona Stop y revisa que `onDisable` y `onDestroy` hayan sido llamados (aparecerán en `TEST_LOG`).
5. Puedes llamar `dumpTestLog()` desde la consola para ver y limpiar el registro.

