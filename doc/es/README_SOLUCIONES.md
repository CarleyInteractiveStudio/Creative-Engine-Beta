# 🚀 Guía de Solución Rápida — Creative Engine

Esta guía contiene más de 50 soluciones a errores comunes que puedes encontrar al crear tu juego. ¡Usa `Ctrl + F` para buscar tu problema!

---

## 💻 1. Errores de Scripting (CES)

1.  **"Error de Sintaxis: inesperado 'y'"**
    -   **Causa:** Estás usando `y` fuera de un bloque de condición.
    -   **Solución:** Asegúrate de usarlo para comparar: `si (vida es 10 y energia > 0)`.
2.  **"TypeError: Cannot read properties of undefined (reading 'fisica')"**
    -   **Causa:** Intentas acceder a `fisica` en una Materia que no tiene el componente **Rigidbody2D**.
    -   **Solución:** Haz clic en la Materia > Añadir Ley > Física (Rigidbody2D).
3.  **"Mi variable no aparece en el Inspector"**
    -   **Causa:** Olvidaste la palabra clave `publico`.
    -   **Solución:** Usa `publico numero miVar = 0;`.
4.  **"El objeto no se mueve al cambiar posicion.x"**
    -   **Causa:** Si el objeto tiene `fisica`, las colisiones pueden estar deteniéndolo.
    -   **Solución:** Usa `fisica.velocity.x = 5;` o cambia el Rigidbody a "Kinematic".
5.  **"Error: 've motor;' falta en el archivo"**
    -   **Causa:** Todos los scripts CES deben empezar con esta línea.
    -   **Solución:** Añade `ve motor;` en la primera línea.
6.  **"¿Cómo comparo si algo es igual a otra cosa?"**
    -   **Solución:** Usa `==` o el nuevo alias natural: `si (color es "Rojo")` o `si (puntos igual a 100)`.
7.  **"El evento alChocar no se activa"**
    -   **Causa:** Falta un Rigidbody2D o Collider2D.
    -   **Solución:** Ambos objetos deben tener Colisionadores, y al menos uno debe tener un Rigidbody2D.
8.  **"Variables que cambian solas al darle a Play"**
    -   **Causa:** Tienes el mismo script en varias Materias.
    -   **Solución:** Verifica que estás editando la Materia correcta en el Inspector.
9.  **"esperar(3) no detiene el resto del código"**
    -   **Causa:** `esperar` es asíncrono.
    -   **Solución:** El código debajo se ejecutará después de la espera si está dentro de una secuencia lógica.
10. **"Error de 'materia is not defined'"**
    -   **Solución:** Usa siempre `materia` (en minúsculas) para referirte al objeto actual.
11. **"No puedo leer la vida de otro objeto"**
    -   **Solución:** Usa `otroObjeto.vida.currentHealth`.
12. **"El juego va lento (lag)"**
    -   **Solución:** Evita usar `imprimir()` o `buscar()` dentro de `alActualizar`.
13. **"Mi script se borró accidentalmente"**
    -   **Solución:** Usa el botón **Historial** en el Editor de Código para recuperar versiones anteriores desde el `.meta`.
14. **"Auto Reparador no propone ninguna solución"**
    -   **Solución:** El error puede ser de lógica y no de sintaxis. Revisa los nombres de tus variables.
15. **"No reconoce 'teclaPresionada'"**
    -   **Solución:** Los nombres de las teclas deben ir entre comillas: `"w"`, `"Space"`, `"Enter"`.
16. **"El personaje salta infinitamente"**
    -   **Solución:** Añade `y estaTocandoTag("Suelo")` a tu condición de salto.
17. **"Destruir(materia) da error"**
    -   **Solución:** Verifica si el objeto existe antes: `si (materia) destruir(materia);`.
18. **"instanciar() crea el objeto lejos"**
    -   **Solución:** Usa `posicion.x` y `posicion.y` del objeto actual como base.
19. **"Comunicar dos scripts"**
    -   **Solución:** Usa `difundir("Mensaje")` en uno y `alRecibir("Mensaje", ...)` en el otro.
20. **"Error: 'reproducir' no definido"**
    -   **Solución:** Asegúrate de tener un componente **Animator** en el objeto.

---

## 🌍 2. Físicas y Colisiones

21. **"Atravieso las paredes"** -> Cambia "Collision Detection" a "Continuous" en el Rigidbody2D.
22. **"El objeto rebota demasiado"** -> Reduce la "Restitución" en el material físico.
23. **"No cae con gravedad"** -> Verifica que "Gravity Scale" sea mayor a 0.
24. **"Se queda pegado a las paredes"** -> Usa un Material Físico con fricción 0 en los laterales.
25. **"El trigger no detecta nada"** -> Marca "Is Trigger" en el BoxCollider2D.
26. **"Colisión con retraso"** -> Usa `actualizarFijo(delta)` para lógica física.
27. **"El personaje se cae de lado"** -> Marca "Fixed Rotation" en el Rigidbody2D.
28. **"applyImpulse no funciona"** -> El objeto debe ser "Dynamic", no "Static".
29. **"Raycast no detecta nada"** -> Aumenta la distancia del rayo o revisa el Tag.
30. **"Atravesar objetos sin chocar"** -> Usa `ignoreCollision(materiaA, materiaB)`.

---

## 🎨 3. Interfaz de Usuario (UI)

31. **"Botón no responde"** -> Verifica que tenga el componente `UIEventTrigger`.
32. **"Texto no cambia"** -> Usa `miTexto.uiTexto.contenido = "Nuevo Texto";`.
33. **"Barra de vida no se mueve"** -> Asigna la Materia con el componente `Health` al `ProgressBar`.
34. **"UI se descoloca en otras resoluciones"** -> Usa los **Anchors** (Anclas) en el UITransform.
35. **"ScrollRect no funciona"** -> El contenido debe ser más grande que el marco (viewport).
36. **"Imagen borrosa"** -> Cambia el modo de filtrado a "Point" en Assets.
37. **"No puedo arrastrar elementos UI"** -> Asegúrate de que el `UICollider` esté activo.
38. **"Color de UI no cambia"** -> Usa códigos hexadecimales como `"#FF0000"`.
39. **"La máscara no corta"** -> Los objetos deben ser hijos de la Materia con `UIMask`.
40. **"El mouse mueve la cámara a través de la UI"** -> Usa `bloquearInputUI()` en tu script.

---

## 🎬 4. Audio y Animaciones

41. **"Sonido no se escucha"** -> Verifica el volumen y que el archivo sea `.mp3` o `.wav`.
42. **"Animación parpadea"** -> No llames a `play()` en cada frame, solo cuando cambie el estado.
43. **"Audio no suena al iniciar"** -> El usuario debe hacer click una vez en la pantalla primero.
44. **"Animación invertida"** -> Usa `escala.x = -1`.
45. **"Evento de animación no funciona"** -> El nombre en el editor debe ser igual al de la función en el script.
46. **"Música no repite"** -> Activa la casilla "Loop" en el `AudioSource`.
47. **"Sonido 3D no funciona"** -> La cámara necesita un `AudioListener`.
48. **"Spritesheet mal cortado"** -> Ajusta el ancho y alto del frame en el Sprite Editor.
49. **"Animator no encuentra el clip"** -> Arrastra el `.canim` a la lista de clips del componente.
50. **"Lag de audio"** -> Usa archivos de audio más cortos o de menor bitrate.

---

## 🛠️ 5. Errores del Editor

51. **"Pantalla negra al Play"** -> Revisa la **Consola**; hay un error crítico en el código.
52. **"No puedo arrastrar archivos"** -> Suéltalos directamente en la ventana de "Assets".
53. **"El proyecto no guarda"** -> Verifica los permisos de almacenamiento de tu navegador.
54. **"Carl IA no responde"** -> Recarga el editor o revisa tu conexión a internet.
55. **"Ventanas desaparecidas"** -> Menú > Ventana > Restablecer Diseño.
