# 📘 El Gran Libro de Creative Engine (CES)

Bienvenido a la guía definitiva para crear videojuegos con **Creative Engine**. Este libro está diseñado para llevarte de la mano, desde que escribes tu primera línea de código hasta que construyes sistemas complejos dignos de un profesional.

---

## 📖 Parte 1: El Diccionario del Motor

Para hablar con el motor, usamos un lenguaje llamado **CES** (Creative Engine Script). Aquí tienes las palabras clave que usaremos siempre.

### 1.1 Fundamentos y Control
- `ve motor;`: **Obligatorio**. Debe estar al principio de cada script para activarlo.
- `publico`: Hace que una variable se vea en el **Inspector** del editor.
- `variable`: Define un dato interno que solo ese script puede usar.
- `si (condicion) { ... }`: Ejecuta código solo si se cumple algo.
- `sino { ... }`: Se usa con `si` para hacer algo cuando no se cumple la condición.
- `mientras (condicion) { ... }`: Repite código mientras algo sea verdad.
- `para (inicio; condicion; paso) { ... }`: Un bucle para contar o repetir cosas un número exacto de veces.
- `retornar`: Sale de una función inmediatamente.
- `nulo`: Representa la ausencia de valor (vacío).
- `verdadero` / `falso`: Valores lógicos (booleano).
- `y` / `o` / `no`: Operadores para combinar condiciones (Ej: `si tieneLlave y estaCerca`).

### 1.2 Declaración de Variables (El Inspector)
Para que el editor sepa qué tipo de dato vas a usar en el Inspector, combinamos `publico` con el tipo:
- `publico numero`: Crea un campo para escribir números o usar un deslizador.
- `publico texto`: Crea una caja de texto para escribir nombres o diálogos.
- `publico booleano`: Crea un interruptor (Checkbox) de si/no.
- `publico Materia`: Crea un recuadro donde puedes arrastrar objetos de la escena.
- `publico Prefab`: Crea un recuadro para arrastrar archivos .ceprefab desde tus activos.
- `publico Sprite`: Para arrastrar imágenes.
- `publico Audio`: Para arrastrar archivos de sonido.
- `publico Color`: Abre un selector de colores visual.

### 1.3 Tipos de Datos (Información)
- `numero`: Números con o sin decimales (5, 3.14).
- `texto`: Letras y palabras entre comillas ("Hola").
- `booleano`: Estado binario (`verdadero`/`falso`).
- `Materia`: Un objeto físico o lógico en tu escena.
- `Prefab`: Un objeto guardado que sirve como "molde".
- `Vector2`: Un punto en el espacio con coordenadas `x` e `y`.
- `Color`: Colores para tus sprites o luces.
- `Sprite`: Una imagen 2D.
- `Audio`: Un archivo de sonido o música.

### 1.4 Componentes (Clases de Objetos)
- `posicion` / `transform`: Controla dónde está el objeto, su tamaño y rotación.
- `renderizadorDeSprite`: Controla cómo se ve el objeto (imagen, color, opacidad).
- `fisica` / `rigidbody2D`: Da peso y gravedad al objeto.
- `animador`: Controla los clips de animación.
- `fuenteDeAudio`: Permite que el objeto emita sonidos.
- `colisionadorCaja2D`: Define la forma física del objeto para chocar.
- `textoUI` / `imagenUI`: Elementos especiales para la interfaz de usuario.
- `boton`: Componente para hacer que algo sea clicable en la UI.
- `camara`: El ojo que ve el mundo del juego.
- `luzPuntual2D`: Crea iluminación alrededor de un punto.
- `particulas`: Sistema para crear efectos como fuego o humo.

### 1.5 Eventos de Ciclo de Vida (¿Cuándo sucede?)
- `alEmpezar()`: Ocurre una vez al nacer el objeto. Ideal para configuraciones iniciales.
- `alActualizar(delta)`: Ocurre en cada instante (frame). `delta` es el tiempo real que pasó.
- `actualizarFijo(delta)`: Se usa para cálculos físicos constantes, como gravedad personalizada.
- `alHacerClick()`: Se dispara al clicar el objeto con el ratón o tocarlo con el dedo.
- `alEntrarEnColision(otro)`: Se dispara al chocar físicamente con `otro` objeto.
- `alSalirDeColision(otro)`: Se dispara cuando dejas de tocar a `otro` objeto.
- `alEntrarEnTrigger(otro)`: Se activa cuando algo entra en una zona de sensor invisible.
- `alRecibir(mensaje, funcion)`: Reacciona a una señal enviada por otro script con `difundir`.
- `alBajoRendimiento(nivel)`: Evento especial que se activa si el juego va lento para que puedas desactivar efectos.

### 1.6 API del Motor (Funciones de Programación)
- `imprimir(algo)`: Muestra información en la consola de errores/ayuda.
- `destruir(materia)`: Borra un objeto del juego para siempre.
- `crear(prefab)`: Genera un nuevo objeto a partir de un molde.
- `buscar(nombre)`: Localiza un objeto por su nombre en la jerarquía.
- `buscarTodosConTag(etiqueta)`: Devuelve una lista de todos los objetos con ese tag.
- `distancia(a, b)`: Calcula cuántos píxeles hay entre dos puntos.
- `difundir(mensaje, datos)`: Envía una señal a todos los objetos del juego.
- `esperar(segundos)`: Pausa el código durante un tiempo (Corruntina).
- `cada(segundos) { ... }`: Ejecuta un bloque de código repetidamente.
- `obtenerPosicionMouse()`: Devuelve las coordenadas `x` e `y` del puntero.
- `teclaPresionada(tecla)`: `verdadero` si mantienes pulsada una tecla.
- `teclaRecienPresionada(tecla)`: `verdadero` solo en el instante que pulsas.
- `lanzarRayo(origen, direccion, distancia)`: Detecta qué hay en una línea recta.
- `establecerLuzAmbiental(color)`: Cambia el color general de la oscuridad/día.

---

## 🛠️ Parte 2: Los 100 Códigos Maestros

Cada código incluye comentarios línea por línea para que entiendas el "por qué" de cada instrucción.

### 🌟 Nivel 1: Los Fundamentos (Básico)

#### 1. ¡Hola Mundo! (El primer paso)
```ces
ve motor; // Conectamos con el motor

alEmpezar() { // Esta función ocurre al iniciar el juego
    imprimir("¡Hola Mundo! Mi primer script funciona."); // Escribimos un mensaje en la consola
} // Fin del bloque
```

#### 2. La Variable Pública (El Inspector)
```ces
ve motor; // Conectamos con el motor

publico texto miNombre = "Héroe"; // Creamos una variable que verás en el editor

alEmpezar() { // Al iniciar
    imprimir("Bienvenido al juego, " + miNombre); // Saludamos usando el nombre elegido
} // Fin del bloque
```

#### 3. El Contador de Vida (Números)
```ces
ve motor; // Conectamos con el motor

publico numero vida = 100; // Variable para guardar la salud

quitarVida() { // Creamos nuestra propia acción
    vida = vida - 10; // Restamos 10 puntos a la vida actual
    imprimir("¡Ouch! Vida restante: " + vida); // Informamos al jugador
} // Fin del bloque
```

#### 4. Interruptor de Luz (Booleanos)
```ces
ve motor; // Conectamos con el motor

publico booleano luzEncendida = verdadero; // Guardamos si la luz está on u off

alHacerClick() { // Al tocar el objeto
    luzEncendida = !luzEncendida; // Invertimos el valor (si era verdadero, ahora es falso)
    imprimir("¿Luz encendida?: " + luzEncendida); // Mostramos el estado
} // Fin del bloque
```

#### 5. Movimiento de Derecha a Izquierda (Transform)
```ces
ve motor; // Conectamos con el motor

alActualizar(delta) { // Ocurre 60 veces por segundo
    posicion.x = posicion.x + 2; // Sumamos 2 a la posición X para movernos a la derecha
} // Fin del bloque
```

#### 6. Seguidor de Mouse Simple
```ces
ve motor; // Conectamos con el motor

alActualizar(delta) { // En cada frame
    variable raton = obtenerPosicionMouse(); // Averiguamos dónde está el puntero
    posicion.x = raton.x; // Ponemos nuestra X donde está el ratón
    posicion.y = raton.y; // Ponemos nuestra Y donde está el ratón
} // Fin del bloque
```

#### 7. Cambiador de Color Aleatorio
```ces
ve motor; // Conectamos con el motor

alHacerClick() { // Al tocar el objeto
    renderizadorDeSprite.color = nuevo Color(azar(0,255), azar(0,255), azar(0,255)); // Ponemos un color al azar
} // Fin del bloque
```

#### 8. El Reloj de Espera (Corrutinas)
```ces
ve motor; // Conectamos con el motor

alEmpezar() { // Al inicio
    imprimir("Esperando 3 segundos..."); // Avisamos
    esperar(3); // Pausamos la ejecución por 3 segundos
    imprimir("¡Tiempo cumplido!"); // Continuamos después de la espera
} // Fin del bloque
```

#### 9. El Bucle Repetitivo (Cada)
```ces
ve motor; // Conectamos con el motor

alEmpezar() { // Al iniciar
    cada(1) { // Repite lo que hay dentro cada 1 segundo
        imprimir("Ha pasado otro segundo"); // Mensaje periódico
    } // Fin del bloque
} // Fin del bloque
```

#### 10. Desaparecer al Tocar (Destrucción)
```ces
ve motor; // Conectamos con el motor

alHacerClick() { // Si el jugador me hace clic
    destruir(materia); // Borro este objeto del mundo (me autodestruyo)
} // Fin del bloque
```

#### 11. Escalar con el Tiempo (Efecto Pulso)
```ces
ve motor; // Conectamos con el motor

alActualizar(delta) { // En cada frame
    variable escala = 1 + seno(tiempoJuego * 5) * 0.2; // Calculamos una onda suave
    transform.scale.x = escala; // Aplicamos la escala en ancho
    transform.scale.y = escala; // Aplicamos la escala en alto
} // Fin del bloque
```

#### 12. Rotación Constante (Molino)
```ces
ve motor; // Conectamos con el motor

publico numero velocidadGiro = 100; // Cuánto girar

alActualizar(delta) { // En cada frame
    rotacion = rotacion + velocidadGiro * delta; // Sumamos rotación multiplicada por el tiempo
} // Fin del bloque
```

#### 13. Teletransporte (Posición Directa)
```ces
ve motor; // Conectamos con el motor

alHacerClick() { // Al clicar
    posicion.x = 0; // Movemos al centro horizontal
    posicion.y = 0; // Movemos al centro vertical
} // Fin del bloque
```

#### 14. Mostrar/Ocultar Objeto
```ces
ve motor; // Conectamos con el motor

cambiarVisibilidad() { // Función para ocultar/mostrar
    estaActivado = !estaActivado; // Apaga o enciende el objeto totalmente
} // Fin del bloque
```

#### 15. Saludo Personalizado por Tag
```ces
ve motor; // Conectamos con el motor

alEntrarEnColision(otro) { // Al chocar con algo
    si (otro.tieneTag("Jugador")) { // Preguntamos si el que chocó es el Jugador
        imprimir("¡Hola, valiente guerrero!"); // Saludamos específicamente a él
    } // Fin del bloque
} // Fin del bloque
```

#### 16. La Variable Privada
```ces
ve motor; // Conectamos con el motor

variable secreto = 0; // Esta variable NO sale en el Inspector

alActualizar(delta) { // Cada frame
    secreto = secreto + 1; // Sumamos uno internamente
} // Fin del bloque
```

#### 17. Espejo (Volteo Horizontal)
```ces
ve motor; // Conectamos con el motor

alActualizar(delta) { // Cada frame
    si (teclaPresionada("ArrowLeft")) { // Si presiono izquierda
        voltearH = verdadero; // Miro hacia la izquierda
    } sino si (teclaPresionada("ArrowRight")) { // Si presiono derecha
        voltearH = falso; // Miro hacia la derecha (normal)
    } // Fin del bloque
} // Fin del bloque
```

#### 18. Consola Limpia
```ces
ve motor; // Conectamos con el motor

alEmpezar() { // Al inicio
    imprimir("--- INICIANDO SISTEMA ---"); // Separador visual
} // Fin del bloque
```

#### 19. El Comentario de Código
```ces
ve motor; // Esto es obligatorio
// Este es un comentario de una línea, el motor lo ignora
/* Este es un comentario
   de muchas líneas */ // Ejecutar instrucción
```

#### 20. Cambio de Sprite (Imagen)
```ces
ve motor; // Conectamos con el motor

publico Sprite imagenNueva; // Hueco para arrastrar una imagen en el editor

cambiarImagen() { // Al llamar a esta acción
    renderizadorDeSprite.sprite = imagenNueva; // Cambiamos el dibujo del objeto
} // Fin del bloque
```

#### 21. Detectar Tecla Única
```ces
ve motor; // Conectamos con el motor

alActualizar(delta) { // Cada frame
    si (teclaRecienPresionada("Space")) { // Solo se activa el primer instante que pulsas
        imprimir("¡Saltaste!"); // Mensaje de salto
    } // Fin del bloque
} // Fin del bloque
```

#### 22. Modificar Opacidad (Fantasma)
```ces
ve motor; // Conectamos con el motor

alActualizar(delta) { // Cada frame
    renderizadorDeSprite.opacity = 0.5; // Nos volvemos medio transparentes
} // Fin del bloque
```

#### 23. Verificar Distancia Simple
```ces
ve motor; // Conectamos con el motor

publico Materia objetivo; // El objeto que queremos vigilar

alActualizar(delta) { // Cada frame
    si (objetivo != nulo) { // Si hay algo asignado
        variable d = distancia(posicion, objetivo.posicion); // Medimos distancia
        si (d < 100) imprimir("¡Está muy cerca!"); // Si está a menos de 100 píxeles, avisamos
    } // Fin del bloque
} // Fin del bloque
```

#### 24. Forzar Posición Y (Gravedad Falsa)
```ces
ve motor; // Conectamos con el motor

alActualizar(delta) { // Cada frame
    si (posicion.y < 500) { // Si estamos por encima del "suelo"
        posicion.y = posicion.y + 5; // Caemos poco a poco
    } // Fin del bloque
} // Fin del bloque
```

#### 25. Nombre del Objeto
```ces
ve motor; // Conectamos con el motor

alEmpezar() { // Al empezar
    imprimir("Mi nombre real en la jerarquía es: " + nombre); // Accedemos al nombre del objeto
} // Fin del bloque
```

---

### 🚀 Nivel 2: Mecánicas Intermedias (Desarrollo)

#### 26. Movimiento con Teclado (4 Direcciones)
```ces
ve motor; // Conectamos con el motor

publico numero velocidad = 300; // Velocidad de caminata

alActualizar(delta) { // En cada frame
    si (teclaPresionada("w")) posicion.y -= velocidad * delta; // Mover arriba
    si (teclaPresionada("s")) posicion.y += velocidad * delta; // Mover abajo
    si (teclaPresionada("a")) posicion.x -= velocidad * delta; // Mover izquierda
    si (teclaPresionada("d")) posicion.x += velocidad * delta; // Mover derecha
} // Fin del bloque
```

#### 27. Lanzar un Proyectil (Instanciación)
```ces
ve motor; // Conectamos con el motor

publico Prefab balaPrefab; // La plantilla de la bala

alActualizar(delta) { // Cada frame
    si (teclaRecienPresionada("f")) { // Si presiono 'F'
        variable nuevaBala = crear(balaPrefab); // Creamos la bala en el mundo
        nuevaBala.posicion.x = posicion.x; // La ponemos en nuestra X
        nuevaBala.posicion.y = posicion.y; // La ponemos en nuestra Y
    } // Fin del bloque
} // Fin del bloque
```

#### 28. Rebote Físico (Rigidbody)
```ces
ve motor; // Conectamos con el motor

alEntrarEnColision(otro) { // Al chocar
    fisica.velocity.y = -10; // Le damos una velocidad hacia arriba instantánea
    imprimir("¡Boing!"); // Efecto de rebote
} // Fin del bloque
```

#### 29. Seguir al Jugador (IA Básica)
```ces
ve motor; // Conectamos con el motor

variable jugador; // Variable para guardar al jugador

alActualizar(delta) { // Cada frame
    si (jugador == nulo) { // Si aún no sabemos quién es el jugador
        jugador = buscar("Jugador"); // Lo buscamos por su nombre
    } sino { // Si ya lo encontramos
        posicion.x = lerp(posicion.x, jugador.posicion.x, 0.05); // Nos acercamos suavemente en X
        posicion.y = lerp(posicion.y, jugador.posicion.y, 0.05); // Nos acercamos suavemente en Y
    } // Fin del bloque
} // Fin del bloque
```

#### 30. Recolectar Monedas (Tags y Destrucción)
```ces
ve motor; // Conectamos con el motor

alEntrarEnColision(otro) { // Si choco con algo
    si (otro.tieneTag("Moneda")) { // ¿Es una moneda?
        destruir(otro); // Borramos la moneda
        imprimir("¡Moneda recogida!"); // Avisamos
    } // Fin del bloque
} // Fin del bloque
```

#### 31. Reproducir Sonido al Tocar
```ces
ve motor; // Conectamos con el motor

publico Audio sonidoClick; // El archivo de audio

alHacerClick() { // Al tocar
    fuenteDeAudio.play(sonidoClick); // Reproducimos el sonido
} // Fin del bloque
```

#### 32. Control de Animación por Código
```ces
ve motor; // Conectamos con el motor

alActualizar(delta) { // Cada frame
    si (teclaPresionada("d")) { // Si camina a la derecha
        animador.play("Caminar"); // Ponemos la animación de caminar
    } sino { // Si está quieto
        animador.play("Quieto"); // Ponemos la animación de IDLE
    } // Fin del bloque
} // Fin del bloque
```

#### 33. Área de Daño (Trigger)
```ces
ve motor; // Conectamos con el motor

alEntrarEnTrigger(otro) { // Cuando algo entra en mi zona (sin chocar físicamente)
    si (otro.tieneTag("Enemigo")) { // Si es un enemigo
        imprimir("¡Zona segura violada!"); // Alarma
    } // Fin del bloque
} // Fin del bloque
```

#### 34. Barra de Vida Visual (UI)
```ces
ve motor; // Conectamos con el motor

publico numero vidaMax = 100; // Vida total
variable vidaActual = 100; // Vida ahora mismo

recibirDano(cantidad) { // Acción de recibir daño
    vidaActual -= cantidad; // Bajamos la vida
    textoUI.text = "HP: " + vidaActual; // Actualizamos el texto en pantalla
} // Fin del bloque
```

#### 35. Cambio de Escena (Portal)
```ces
ve motor; // Conectamos con el motor

publico texto nombreNivel = "Nivel2"; // El nombre de la escena a cargar

alEntrarEnColision(otro) { // Al chocar
    si (otro.tieneTag("Jugador")) { // Si es el jugador
        cargarEscena(nombreNivel); // Saltamos al siguiente nivel
    } // Fin del bloque
} // Fin del bloque
```

#### 36. Botón de Menú Simple
```ces
ve motor; // Conectamos con el motor

alHacerClick() { // Al presionar el botón
    imprimir("Abriendo Inventario..."); // Acción del botón
} // Fin del bloque
```

#### 37. Mirar hacia el Mouse (Rotación)
```ces
ve motor; // Conectamos con el motor

alActualizar(delta) { // Cada frame
    variable m = obtenerPosicionMouse(); // Posición del mouse
    variable angulo = atan2(m.y - posicion.y, m.x - posicion.x); // Calculamos ángulo matemático
    rotacion = angulo * 180 / 3.14; // Convertimos a grados para el motor
} // Fin del bloque
```

#### 38. Inventario Básico (Listas)
```ces
ve motor; // Conectamos con el motor

variable items = []; // Una lista vacía

alRecibir("ITEM_RECOGIDO", (datos) => { // Cuando alguien avisa que se recogió algo
    items.empujar(datos.nombre); // Añadimos el nombre del objeto a nuestra mochila
    imprimir("Mochila: " + items.longitud + " objetos"); // Decimos cuántos llevamos
}); // Ejecutar instrucción
```

#### 39. Generador de Enemigos (Spawner)
```ces
ve motor; // Conectamos con el motor

publico Prefab enemigo; // Qué vamos a crear

alEmpezar() { // Al inicio
    cada(5) { // Cada 5 segundos
        variable e = crear(enemigo); // Creamos un enemigo
        e.posicion.x = azar(-500, 500); // En una X aleatoria
        e.posicion.y = -400; // Arriba en la pantalla
    } // Fin del bloque
} // Fin del bloque
```

#### 40. Vibración de Cámara (Shake)
```ces
ve motor; // Conectamos con el motor

sacudir() { // Llamar cuando haya una explosión
    variable posOrig = posicion; // Guardamos donde estaba la cámara
    cada(0.05) { // Muy rápido
        posicion.x = posOrig.x + azar(-5, 5); // Movemos un poquito al azar
        posicion.y = posOrig.y + azar(-5, 5); // Ejecutar instrucción
    } // Fin del bloque
    esperar(0.5); // Durante medio segundo
    posicion = posOrig; // Volvemos a la normalidad
} // Fin del bloque
```

#### 41. Mensaje Global (Difusión)
```ces
ve motor; // Conectamos con el motor

alHacerClick() { // Al tocar un interruptor
    difundir("PUERTA_ABRIR", { codigo: 123 }); // Gritamos a todos que abran la puerta
} // Fin del bloque
```

#### 42. Escuchar Mensaje
```ces
ve motor; // Conectamos con el motor

alEmpezar() { // Al inicio
    alRecibir("PUERTA_ABRIR", (datos) => { // Nos quedamos esperando el grito
        imprimir("Abriendo puerta con código: " + datos.codigo); // Reaccionamos
        destruir(materia); // La puerta desaparece
    }); // Ejecutar instrucción
} // Fin del bloque
```

#### 43. Salto con Físicas Reales
```ces
ve motor; // Conectamos con el motor

publico numero fuerzaSalto = 15; // Potencia del salto

alActualizar(delta) { // Cada frame
    si (teclaRecienPresionada("Space")) { // Si pulsa espacio
        fisica.applyImpulse(nuevo Vector2(0, -fuerzaSalto)); // Empujamos hacia arriba físicamente
    } // Fin del bloque
} // Fin del bloque
```

#### 44. Límites de Pantalla
```ces
ve motor; // Conectamos con el motor

alActualizar(delta) { // Cada frame
    si (posicion.x > 800) posicion.x = 800; // No deja pasar de la derecha
    si (posicion.x < -800) posicion.x = -800; // No deja pasar de la izquierda
} // Fin del bloque
```

#### 45. Plataforma Móvil (Ping-Pong)
```ces
ve motor; // Conectamos con el motor

variable direccion = 1; // 1 derecha, -1 izquierda

alActualizar(delta) { // Cada frame
    posicion.x += 200 * direccion * delta; // Movemos la plataforma
    si (posicion.x > 500) direccion = -1; // Si llega al límite, vuelve
    si (posicion.x < -500) direccion = 1; // Si llega al otro, avanza
} // Fin del bloque
```

#### 46. Destrucción por Tiempo (Bala)
```ces
ve motor; // Conectamos con el motor

alEmpezar() { // Cuando nace la bala
    esperar(2); // Esperamos 2 segundos en el aire
    destruir(materia); // Se borra para no llenar la memoria
} // Fin del bloque
```

#### 47. Cambiar Velocidad de Animación
```ces
ve motor; // Conectamos con el motor

alActualizar(delta) { // Cada frame
    si (teclaPresionada("Shift")) { // Si corre
        animador.speed = 2.0; // Animación al doble de velocidad
    } sino { // Ejecutar instrucción
        animador.speed = 1.0; // Velocidad normal
    } // Fin del bloque
} // Fin del bloque
```

#### 48. Detectar Suelo (Tag Check)
```ces
ve motor; // Conectamos con el motor

variable enSuelo = falso; // ¿Estamos tocando tierra?

alEntrarEnColision(otro) { // Al chocar
    si (otro.tieneTag("Suelo")) enSuelo = verdadero; // Si es suelo, podemos saltar
} // Fin del bloque

alSalirDeColision(otro) { // Al dejar de chocar
    si (otro.tieneTag("Suelo")) enSuelo = falso; // Si saltamos, ya no estamos en el suelo
} // Fin del bloque
```

#### 49. Texto Flotante (Daño)
```ces
ve motor; // Conectamos con el motor

alEmpezar() { // Al nacer el texto
    posicion.y -= 50; // Sube un poco
    renderizadorDeSprite.opacity = 1; // Empieza visible
} // Fin del bloque

alActualizar(delta) { // Cada frame
    posicion.y -= 20 * delta; // Sube flotando
    renderizadorDeSprite.opacity -= 0.5 * delta; // Se desvanece
} // Fin del bloque
```

#### 50. Pausar el Juego (Concepto)
```ces
ve motor; // Conectamos con el motor

alActualizar(delta) { // Cada frame
    si (teclaRecienPresionada("p")) { // Si pulsa 'P'
        imprimir("JUEGO PAUSADO"); // Aviso
        // El motor tiene sistemas internos para detener el tiempo
    } // Fin del bloque
} // Fin del bloque
```

---

### 🧠 Nivel 3: Sistemas Avanzados (Maestría)

#### 51. IA con Visión (Raycast)
```ces
ve motor; // Conectamos con el motor

alActualizar(delta) { // Cada frame
    variable direccion = nuevo Vector2(1, 0); // Miramos a la derecha
    variable impacto = lanzarRayo(posicion, direccion, 500); // Lanzamos un rayo invisible de 500px

    si (impacto != nulo) { // Si el rayo chocó con algo
        si (impacto.materia.tieneTag("Jugador")) { // ¿Es el jugador?
            imprimir("¡TE VEO!"); // Reaccionamos
            animador.play("Atacar"); // Atacamos
        } // Fin del bloque
    } // Fin del bloque
} // Fin del bloque
```

#### 52. Ciclo Día y Noche (Ambiente)
```ces
ve motor; // Conectamos con el motor

variable hora = 12; // Empezamos al mediodía

alActualizar(delta) { // Cada frame
    hora += delta * 0.1; // El tiempo pasa lento
    si (hora > 24) hora = 0; // Reiniciamos el día

    si (hora > 18 o hora < 6) { // Si es de noche
        establecerLuzAmbiental("#111133"); // Color azul oscuro
    } sino { // Si es de día
        establecerLuzAmbiental("#ffffff"); // Luz blanca clara
    } // Fin del bloque
} // Fin del bloque
```

#### 53. Inventario con Datos (Objetos)
```ces
ve motor; // Conectamos con el motor

variable mochila = []; // Lista para guardar objetos

alRecibir("RECOGER", (item) => { // Cuando recibimos un objeto
    mochila.empujar({ // Guardamos un "paquete" con info
        nombre: item.nombre, // Ejecutar instrucción
        poder: item.fuerza, // Ejecutar instrucción
        id: azar(1000, 9999) // Ejecutar instrucción
    }); // Ejecutar instrucción
    imprimir("Guardado: " + item.nombre); // Confirmamos
}); // Ejecutar instrucción
```

#### 54. Máquina de Estados Simple (IA)
```ces
ve motor; // Conectamos con el motor

variable estado = "PATRULLA"; // Estado inicial

alActualizar(delta) { // Cada frame
    variable jugador = buscar("Jugador"); // Buscamos al jugador
    si (estado == "PATRULLA") { // Si patrulla
        posicion.x += 100 * delta; // Camina
        si (jugador != nulo y distancia(posicion, jugador.posicion) < 200) { // Si está cerca
            estado = "PERSEGUIR"; // Cambia a perseguir
        } // Fin del bloque
    } sino si (estado == "PERSEGUIR") { // Si persigue
        posicion.x = lerp(posicion.x, jugador.x, 0.1); // Sigue al jugador
    } // Fin del bloque
} // Fin del bloque
```

#### 55. Sistema de Partículas por Código
```ces
ve motor; // Conectamos con el motor

publico Prefab chispa; // El dibujo de la chispa

explotar() { // Acción de explosión
    para (variable i = 0; i < 20; i = i + 1) { // Repetimos 20 veces
        variable p = crear(chispa); // Creamos una chispa
        p.posicion = posicion; // En nuestra posición
        p.fisica.velocity.x = azar(-10, 10); // Disparamos a X loca
        p.fisica.velocity.y = azar(-10, 10); // Disparamos a Y loca
    } // Fin del bloque
} // Fin del bloque
```

#### 56. Guardar Puntuación (Local Storage)
```ces
ve motor; // Conectamos con el motor

variable puntos = 0; // Ejecutar instrucción

guardarPartida() { // Acción de guardado
    // El motor guarda automáticamente el estado de las variables marcadas
    imprimir("Puntos guardados en la memoria del motor."); // Ejecutar instrucción
} // Fin del bloque
```

#### 57. Cámara que Sigue Suavemente
```ces
ve motor; // Conectamos con el motor

publico Materia objetivo; // A quién seguimos

alActualizar(delta) { // Cada frame
    si (objetivo != nulo) { // Si hay objetivo
        posicion.x = lerp(posicion.x, objetivo.posicion.x, 0.1); // Suavizado en X
        posicion.y = lerp(posicion.y, objetivo.posicion.y, 0.1); // Suavizado en Y
    } // Fin del bloque
} // Fin del bloque
```

#### 58. Daño Progresivo (Veneno)
```ces
ve motor; // Conectamos con el motor

envenenar() { // Acción de veneno
    cada(1) { // Cada 1 segundo
        vida = vida - 5; // Quitamos poca vida
        imprimir("Daño por veneno... HP: " + vida); // Ejecutar instrucción
        si (vida <= 0) destruir(materia); // Si muere, paramos
    } // Fin del bloque
} // Fin del bloque
```

#### 59. Combo de Ataque (Tiempos)
```ces
ve motor; // Conectamos con el motor

variable golpes = 0; // Ejecutar instrucción
variable tiempoUltimoGolpe = 0; // Ejecutar instrucción

alActualizar(delta) { // Cada frame
    si (teclaRecienPresionada("z")) { // Si golpea
        variable ahora = tiempoJuego; // Hora actual del juego
        si (ahora - tiempoUltimoGolpe < 0.5) { // Si fue rápido
            golpes = golpes + 1; // Aumentamos combo
        } sino { // Ejecutar instrucción
            golpes = 1; // Reiniciamos combo
        } // Fin del bloque
        tiempoUltimoGolpe = ahora; // Guardamos tiempo
        imprimir("¡Combo x" + golpes + "!"); // Ejecutar instrucción
    } // Fin del bloque
} // Fin del bloque
```

#### 60. Pantalla de Carga Progresiva
```ces
ve motor; // Conectamos con el motor

alActualizar(delta) { // Cada frame
    variable progreso = progresoCarga; // Obtenemos cuánto falta (0 a 1)
    textoUI.text = "Cargando: " + redondear(progreso * 100) + "%"; // Mostramos %
    barraUI.escala.x = progreso; // Estiramos la barra visualmente
} // Fin del bloque
```

#### 61. Diálogo Secuencial
```ces
ve motor; // Conectamos con el motor

variable lineas = ["Hola", "¿Cómo estás?", "Adiós"]; // Lista de frases
variable indice = 0; // Por qué frase vamos

alHacerClick() { // Al tocar al NPC
    si (indice < lineas.longitud) { // Si quedan frases
        textoUI.text = lineas[indice]; // Ponemos la frase
        indice = indice + 1; // Pasamos a la siguiente
    } sino { // Ejecutar instrucción
        indice = 0; // Reiniciamos el diálogo
    } // Fin del bloque
} // Fin del bloque
```

#### 62. Teletransporte con Fundido (Fade)
```ces
ve motor; // Conectamos con el motor

viajar() { // Acción de viaje
    difundir("FADE_OUT"); // Gritamos que oscurezca la pantalla
    esperar(1); // Esperamos a que esté negra
    posicion.x = 2000; // Movemos al jugador
    difundir("FADE_IN"); // Gritamos que aclare la pantalla
} // Fin del bloque
```

#### 63. Radar de Enemigos
```ces
ve motor; // Conectamos con el motor

alActualizar(delta) { // Cada frame
    variable enemigos = buscarTodosConTag("Enemigo"); // Buscamos a todos
    si (enemigos.longitud > 0) { // Si hay alguno
        imprimir("¡Cuidado! Hay " + enemigos.longitud + " cerca"); // Ejecutar instrucción
    } // Fin del bloque
} // Fin del bloque
```

#### 64. Disparo Parabólico (Granada)
```ces
ve motor; // Conectamos con el motor

publico Prefab granada; // Ejecutar instrucción

lanzar() { // Al lanzar
    variable g = crear(granada); // Creamos el objeto
    g.fisica.applyImpulse(nuevo Vector2(10, -15)); // Impulso diagonal arriba
    // La gravedad del motor hará el resto del arco
} // Fin del bloque
```

#### 65. Cambiar Atributos de Otros (Buffs)
```ces
ve motor; // Conectamos con el motor

alEntrarEnColision(otro) { // Al chocar
    si (otro.tieneTag("Aliado")) { // Si es un aliado
        variable script = otro.obtenerScript("Movimiento"); // Buscamos su script de mover
        script.velocidad = 600; // Le damos super velocidad
        imprimir("¡Aliado potenciado!"); // Ejecutar instrucción
    } // Fin del bloque
} // Fin del bloque
```

#### 66. Destruir Objetos por Tag en Área
```ces
ve motor; // Conectamos con el motor

bombaLimpia() { // Al explotar
    variable cosas = buscarTodosConTag("Basura"); // Buscamos toda la basura
    para (variable i = 0; i < cosas.longitud; i = i + 1) { // Recorremos la lista
        destruir(cosas[i]); // Borramos uno por uno
    } // Fin del bloque
} // Fin del bloque
```

#### 67. Seguimiento de Mirada (LookAt)
```ces
ve motor; // Conectamos con el motor

publico Materia objetivo; // Ejecutar instrucción

alActualizar(delta) { // Cada frame
    si (objetivo != nulo) { // Si hay a quién mirar
        mirarA(objetivo.posicion); // Rotamos automáticamente hacia él
    } // Fin del bloque
} // Fin del bloque
```

#### 68. Generación de Terreno Simple
```ces
ve motor; // Conectamos con el motor

publico Prefab bloque; // Ejecutar instrucción

alEmpezar() { // Al iniciar
    para (variable x = 0; x < 10; x = x + 1) { // Creamos 10 bloques
        variable b = crear(bloque); // Creamos
        b.posicion.x = x * 100; // Separados por 100px
        b.posicion.y = 500; // Todos a la misma altura
    } // Fin del bloque
} // Fin del bloque
```

#### 69. Contador Regresivo (Bomba)
```ces
ve motor; // Conectamos con el motor

variable tiempo = 10; // 10 segundos

alEmpezar() { // Al nacer
    cada(1) { // Cada segundo
        tiempo = tiempo - 1; // Restamos
        imprimir("Detonación en: " + tiempo); // Ejecutar instrucción
        si (tiempo == 0) explotar(); // Si llega a cero, ¡BOOM!
    } // Fin del bloque
} // Fin del bloque
```

#### 70. Rebotar en Paredes (IA Rebotadora)
```ces
ve motor; // Conectamos con el motor

variable velX = 5; // Ejecutar instrucción

alActualizar(delta) { // Cada frame
    posicion.x += velX; // Movemos
} // Fin del bloque

alEntrarEnColision(otro) { // Al chocar
    si (otro.tieneTag("Pared")) { // Si es pared
        velX = velX * -1; // Invertimos dirección
        voltearH = !voltearH; // Giramos el dibujo
    } // Fin del bloque
} // Fin del bloque
```

#### 71. Sistema de "Checkpoint"
```ces
ve motor; // Conectamos con el motor

variable respawnPos; // Guardamos el último checkpoint

alEntrarEnTrigger(otro) { // Al pasar por una bandera
    si (otro.tieneTag("Checkpoint")) { // Ejecutar instrucción
        respawnPos = otro.posicion; // Guardamos su posición
        imprimir("¡Punto de control guardado!"); // Ejecutar instrucción
    } // Fin del bloque
} // Fin del bloque

morir() { // Al morir
    posicion = respawnPos; // Volvemos al punto guardado
} // Fin del bloque
```

#### 72. Abrir Puerta con Llave
```ces
ve motor; // Conectamos con el motor

variable tieneLlave = falso; // Ejecutar instrucción

alEntrarEnColision(otro) { // Al chocar
    si (otro.tieneTag("Llave")) { // Si es la llave
        tieneLlave = verdadero; // La cogemos
        destruir(otro); // Ejecutar instrucción
    } sino si (otro.tieneTag("Puerta") y tieneLlave) { // Si es puerta y tenemos llave
        destruir(otro); // Abrimos
        imprimir("Puerta abierta."); // Ejecutar instrucción
    } // Fin del bloque
} // Fin del bloque
```

#### 73. Movimiento Circular (Orbital)
```ces
ve motor; // Conectamos con el motor

publico Materia centro; // Ejecutar instrucción
publico numero radio = 200; // Ejecutar instrucción

alActualizar(delta) { // Cada frame
    variable angulo = tiempoJuego * 2; // El ángulo aumenta con el tiempo
    posicion.x = centro.x + cos(angulo) * radio; // Calculamos X en el círculo
    posicion.y = centro.y + seno(angulo) * radio; // Calculamos Y en el círculo
} // Fin del bloque
```

#### 74. Detectar Límite de Vida de Otros
```ces
ve motor; // Conectamos con el motor

alActualizar(delta) { // Cada frame
    variable e = buscar("Jefe"); // Buscamos al Boss
    si (e != nulo y e.vida < 50) { // Si su vida baja de la mitad
        imprimir("¡EL JEFE SE HA ENFADADO!"); // Fase 2
        e.renderizadorDeSprite.color = "#FF0000"; // Se pone rojo
    } // Fin del bloque
} // Fin del bloque
```

#### 75. Cambiar Música de Fondo
```ces
ve motor; // Conectamos con el motor

publico Audio musicaCombate; // Ejecutar instrucción

entrarEnCombate() { // Al empezar pelea
    fuenteDeAudio.stop(); // Paramos música tranquila
    fuenteDeAudio.play(musicaCombate); // Ponemos música épica
    fuenteDeAudio.loop = verdadero; // Que se repita
} // Fin del bloque
```

---

### 🏆 Nivel 4: Sistemas Expertos (Proyectos)

#### 76. Disparo con Retroceso (Recoil)
```ces
ve motor; // Conectamos con el motor

alActualizar(delta) { // Cada frame
    si (teclaRecienPresionada("f")) { // Al disparar
        fisica.applyImpulse(nuevo Vector2(-5, 0)); // Nos empuja hacia atrás
        crearBala(); // Función de crear proyectil
    } // Fin del bloque
} // Fin del bloque
```

#### 77. Salud con Regeneración Automática
```ces
ve motor; // Conectamos con el motor

alEmpezar() { // Al iniciar
    cada(2) { // Cada 2 segundos
        si (vida < 100) { // Si no estamos al máximo
            vida = vida + 2; // Curamos un poco
        } // Fin del bloque
    } // Fin del bloque
} // Fin del bloque
```

#### 78. Enemigo que se Aleja si estás Cerca
```ces
ve motor; // Conectamos con el motor

alActualizar(delta) { // Cada frame
    variable j = buscar("Jugador"); // Buscamos jugador
    si (distancia(posicion, j.posicion) < 300) { // Si se acerca mucho
        variable dir = posicion.restar(j.posicion).normalizar(); // Calculamos dirección contraria
        posicion.x += dir.x * 200 * delta; // Corremos lejos
    } // Fin del bloque
} // Fin del bloque
```

#### 79. Sistema de Experiencia y Niveles
```ces
ve motor; // Conectamos con el motor

variable nivel = 1; // Ejecutar instrucción
variable xp = 0; // Ejecutar instrucción

ganarXP(cantidad) { // Al matar enemigo
    xp = xp + cantidad; // Sumamos XP
    si (xp >= 100) { // Si llega al límite
        nivel = nivel + 1; // ¡Subimos de nivel!
        xp = 0; // Reiniciamos barra
        imprimir("¡SUBISTE AL NIVEL " + nivel + "!"); // Ejecutar instrucción
    } // Fin del bloque
} // Fin del bloque
```

#### 80. Sistema de Puntos de Control (Checkpoints)
```ces
ve motor; // Conectamos con el motor

variable posicionRespawn; // Guardamos el lugar seguro

alEmpezar() { // Al nacer el objeto
    posicionRespawn = posicion; // La posición inicial es el primer checkpoint
} // Fin del bloque

alEntrarEnTrigger(otro) { // Al pasar por una zona de control
    si (otro.tieneTag("PuntoDeControl")) { // Si el sensor es un checkpoint
        posicionRespawn = otro.posicion; // Actualizamos el lugar de nacimiento
        imprimir("¡Punto de control guardado!"); // Avisamos
    } // Fin del bloque
} // Fin del bloque

respawnear() { // Función para volver a la vida
    posicion = posicionRespawn; // Teletransportamos al último checkpoint
    vida = 100; // Restauramos la salud
} // Fin del bloque
```

#### 81. Inventario con Objetos Dinámicos
```ces
ve motor; // Conectamos con el motor

variable inventario = []; // Lista de objetos recogidos

alRecibir("OBJETO_COGIDO", (datos) => { // Escuchamos cuando alguien coge algo
    inventario.empujar(datos); // Metemos el objeto en la mochila
    imprimir("Tienes un nuevo objeto: " + datos.nombre); // Informamos
}); // Ejecutar instrucción

usarPrimerObjeto() { // Acción para usar items
    si (inventario.longitud > 0) { // Si hay algo en la mochila
        variable item = inventario[0]; // Cogemos el primero
        imprimir("Usando " + item.nombre); // Lo usamos
        // Aquí iría la lógica de lo que hace el objeto
    } // Fin del bloque
} // Fin del bloque
```

#### 82. IA de Persecución Suave (Lerp)
```ces
ve motor; // Conectamos con el motor

publico Materia objetivo; // El objeto a perseguir (ej: Jugador)
publico numero velocidadIA = 0.02; // Suavidad del movimiento

alActualizar(delta) { // Cada frame
    si (objetivo != nulo) { // Si tenemos a quién seguir
        posicion.x = lerp(posicion.x, objetivo.x, velocidadIA); // Nos acercamos en X
        posicion.y = lerp(posicion.y, objetivo.y, velocidadIA); // Nos acercamos en Y

        si (objetivo.x < posicion.x) voltearH = verdadero; // Miramos hacia donde vamos
        sino voltearH = falso; // Ejecutar instrucción
    } // Fin del bloque
} // Fin del bloque
```

#### 83. Sistema de Diálogos con Múltiples Páginas
```ces
ve motor; // Conectamos con el motor

variable textos = ["¡Bienvenido!", "Tengo una misión para ti.", "Busca la espada dorada."]; // Ejecutar instrucción
variable paginaActual = 0; // Ejecutar instrucción

alHacerClick() { // Al interactuar con el NPC
    si (paginaActual < textos.longitud) { // Si quedan páginas por leer
        textoUI.text = textos[paginaActual]; // Mostramos el texto en la UI
        paginaActual = paginaActual + 1; // Pasamos a la siguiente
    } sino { // Ejecutar instrucción
        textoUI.text = ""; // Limpiamos la pantalla
        paginaActual = 0; // Reiniciamos el diálogo
    } // Fin del bloque
} // Fin del bloque
```

#### 84. Plataforma que Desaparece al Pisar
```ces
ve motor; // Conectamos con el motor

alEntrarEnColision(otro) { // Al chocar con algo
    si (otro.tieneTag("Jugador")) { // Si el que pisa es el jugador
        renderizadorDeSprite.color = "#FF0000"; // Ponemos la plataforma roja de aviso
        esperar(1); // Esperamos 1 segundo
        estaActivado = falso; // Desactivamos la plataforma (cae o desaparece)
        esperar(3); // Esperamos 3 segundos
        estaActivado = verdadero; // La plataforma vuelve a aparecer
        renderizadorDeSprite.color = "#FFFFFF"; // Restauramos el color
    } // Fin del bloque
} // Fin del bloque
```

#### 85. Disparo de Proyectiles con Dirección
```ces
ve motor; // Conectamos con el motor

publico Prefab balaPrefab; // La plantilla de la bala

alActualizar(delta) { // Cada frame
    si (teclaRecienPresionada("f")) { // Si pulsamos la tecla de fuego
        variable b = crear(balaPrefab); // Instanciamos la bala
        b.posicion = posicion; // Sale de nuestra posición

        variable direccion = voltearH ? -1 : 1; // Miramos a dónde apunta el jugador
        b.fisica.velocity.x = 20 * direccion; // Le damos velocidad física
    } // Fin del bloque
} // Fin del bloque
```

#### 86. Generador Aleatorio de Enemigos (Spawner)
```ces
ve motor; // Conectamos con el motor

publico Prefab enemigo; // Molde del enemigo
publico numero tiempoEspera = 5; // Cada cuánto tiempo nace uno

alEmpezar() { // Al iniciar el generador
    cada(tiempoEspera) { // Repetimos cada X segundos
        variable e = crear(enemigo); // Creamos el enemigo
        e.posicion.x = azar(-500, 500); // Aparece en una X aleatoria
        e.posicion.y = -300; // Siempre arriba
        imprimir("¡Un nuevo enemigo ha aparecido!"); // Ejecutar instrucción
    } // Fin del bloque
} // Fin del bloque
```

#### 87. Control de Audio Maestro
```ces
ve motor; // Conectamos con el motor

publico Audio musicaNivel; // Ejecutar instrucción

alEmpezar() { // Al iniciar el nivel
    fuenteDeAudio.play(musicaNivel); // Ponemos la música
    fuenteDeAudio.volume = 0.5; // Ponemos el volumen a la mitad
    fuenteDeAudio.loop = verdadero; // Hacemos que se repita siempre
} // Fin del bloque

ajustarVolumen(nuevoVol) { // Función para cambiar el volumen desde un menú
    fuenteDeAudio.volume = nuevoVol; // Ejecutar instrucción
} // Fin del bloque
```

#### 88. Sistema de Combate: Recibir Daño y Empuje
```ces
ve motor; // Conectamos con el motor

recibirGolpe(cantidad, origenX) { // Función llamada por una bala o espada
    vida = vida - cantidad; // Restamos vida
    renderizadorDeSprite.color = "#FF0000"; // Parpadeo rojo de dolor

    variable direccionEmpuje = (posicion.x > origenX) ? 5 : -5; // Calculamos hacia dónde salir volando
    fisica.applyImpulse(nuevo Vector2(direccionEmpuje, -2)); // Aplicamos fuerza física

    esperar(0.2); // Esperamos un momento
    renderizadorDeSprite.color = "#FFFFFF"; // Volvemos al color normal
} // Fin del bloque
```

#### 89. Cambio de Personaje (Switch)
```ces
ve motor; // Conectamos con el motor

publico Materia personaje1; // Ejecutar instrucción
publico Materia personaje2; // Ejecutar instrucción

alActualizar(delta) { // Cada frame
    si (teclaRecienPresionada("Tab")) { // Si pulsamos Tabulador
        personaje1.estaActivado = !personaje1.estaActivado; // Intercambiamos estados
        personaje2.estaActivado = !personaje2.estaActivado; // Ejecutar instrucción
        imprimir("Cambiando de héroe..."); // Ejecutar instrucción
    } // Fin del bloque
} // Fin del bloque
```

#### 90. Transpilar Lógica Compleja (Matemáticas)
```ces
ve motor; // Conectamos con el motor

alActualizar(delta) { // Cada frame
    // Efecto de flotación suave usando trigonometría
    variable flotacion = seno(tiempoJuego * 2) * 50;  // Ejecutar instrucción
    posicion.y = 0 + flotacion; // El objeto sube y baja suavemente
} // Fin del bloque
```

#### 91. Controlador de Vehículo Top-Down (Coche)
```ces
ve motor; // Conectamos con el motor

publico numero fuerzaMotor = 1000; // Potencia del coche
publico numero giro = 180; // Cuánto gira por segundo

alActualizar(delta) { // Cada frame
    // Usamos el componente especializado del motor
    si (teclaPresionada("w")) controladorVehiculoTopDown.acelerar(); // Llamamos a la API del coche
    si (teclaPresionada("s")) controladorVehiculoTopDown.frenar(); // Ejecutar instrucción

    si (teclaPresionada("a")) rotacion -= giro * delta; // Giramos a la izquierda
    si (teclaPresionada("d")) rotacion += giro * delta; // Giramos a la derecha
} // Fin del bloque
```

#### 92. Sistema de Agua y Flotación Física
```ces
ve motor; // Conectamos con el motor

alEntrarEnTrigger(otro) { // Cuando algo entra en mi zona de agua
    si (otro.tieneLey("Rigidbody2D")) { // Si el objeto tiene físicas
        otro.fisica.gravityScale = 0.2; // Reducimos su gravedad para que flote
        imprimir(otro.nombre + " ha entrado en el agua."); // Ejecutar instrucción
    } // Fin del bloque
} // Fin del bloque

alSalirDeTrigger(otro) { // Al salir del agua
    si (otro.tieneLey("Rigidbody2D")) { // Ejecutar instrucción
        otro.fisica.gravityScale = 1.0; // Restauramos la gravedad normal
    } // Fin del bloque
} // Fin del bloque
```

#### 93. Menú de Pausa Completo (UI)
```ces
ve motor; // Conectamos con el motor

publico Materia panelPausa; // El objeto visual del menú

alActualizar(delta) { // Cada frame
    si (teclaRecienPresionada("Escape")) { // Al pulsar Escape
        panelPausa.estaActivado = !panelPausa.estaActivado; // Mostramos/Ocultamos el menú

        si (panelPausa.estaActivado) { // Ejecutar instrucción
            imprimir("Juego Pausado"); // El motor puede pausar el tiempo internamente
        } // Fin del bloque
    } // Fin del bloque
} // Fin del bloque
```

#### 94. IA Avanzada: Detección por Rayos (Raycast 2D)
```ces
ve motor; // Conectamos con el motor

publico numero rangoVision = 400; // Ejecutar instrucción

alActualizar(delta) { // Cada frame
    variable direccion = voltearH ? nuevo Vector2(-1, 0) : nuevo Vector2(1, 0); // Hacia dónde miramos
    variable hit = lanzarRayo(posicion, direccion, rangoVision); // Lanzamos rayo de detección

    si (hit != nulo y hit.materia.tieneTag("Jugador")) { // Si el rayo choca con el jugador
        imprimir("¡OBJETIVO DETECTADO!"); // Ejecutar instrucción
        animador.play("Atacar"); // Cambiamos a animación de ataque
    } // Fin del bloque
} // Fin del bloque
```

#### 95. Sistema de Cinemática Inversa (IK) para Brazos
```ces
ve motor; // Conectamos con el motor

publico Materia objetivoMano; // Donde queremos que esté la mano

alActualizar(delta) { // Cada frame
    // Usamos el gestor IK del motor para mover una cadena de huesos
    si (objetivoMano != nulo) { // Ejecutar instrucción
        gestorIK2D.target = objetivoMano.id; // Apuntamos al objetivo
        // El motor calculará automáticamente la posición del brazo y antebrazo
    } // Fin del bloque
} // Fin del bloque
```

#### 96. Simulación de Helicóptero (Física de Vuelo)
```ces
ve motor; // Conectamos con el motor

alActualizar(delta) { // Cada frame
    // Controlamos el componente de helicóptero
    si (teclaPresionada("w")) controladorDeHelicoptero.potenciaMotor += 10; // Subimos potencia
    si (teclaPresionada("s")) controladorDeHelicoptero.potenciaMotor -= 10; // Bajamos potencia

    // El motor se encarga de la sustentación y el balanceo
} // Fin del bloque
```

#### 97. Barra de Progreso Dinámica (Salud del Jefe)
```ces
ve motor; // Conectamos con el motor

publico Materia jefe; // Referencia al objeto del Jefe

alActualizar(delta) { // Cada frame
    variable vidaJefe = jefe.obtenerScript("Salud").vidaActual; // Leemos la vida del jefe
    variable vidaMax = jefe.obtenerScript("Salud").vidaMaxima; // Ejecutar instrucción

    uiBarra.valor = vidaJefe; // Actualizamos la barra visualmente
    uiBarra.valorMaximo = vidaMax; // Ejecutar instrucción
} // Fin del bloque
```

#### 98. Optimización Proactiva (alBajoRendimiento)
```ces
ve motor; // Conectamos con el motor

alBajoRendimiento(nivel) { // Se activa si los FPS bajan de 30
    imprimir("Optimizando juego... Nivel: " + nivel); // Ejecutar instrucción

    si (nivel >= 2) { // Si el rendimiento es muy malo
        sistemaDeParticulas.estaActivado = falso; // Apagamos efectos costosos
        renderizadorDeSprite.opacity = 0.8; // Simplificamos visuales
    } // Fin del bloque
} // Fin del bloque
```

#### 99. Sistema de Tienda con Oro
```ces
ve motor; // Conectamos con el motor

variable oroJugador = 100; // Ejecutar instrucción

intentarComprar(precio, itemPrefab) { // Llamada al pulsar un botón de la tienda
    si (oroJugador >= precio) { // ¿Tenemos dinero?
        oroJugador = oroJugador - precio; // Cobramos
        variable nuevoItem = crear(itemPrefab); // Entregamos el objeto
        imprimir("¡Compra realizada! Oro restante: " + oroJugador); // Ejecutar instrucción
    } sino { // Ejecutar instrucción
        imprimir("No tienes suficiente oro..."); // Ejecutar instrucción
    } // Fin del bloque
} // Fin del bloque
```

#### 100. El Corazón del Juego: Gestión de Mensajería Global
```ces
ve motor; // Conectamos con el motor

// Este script centraliza la victoria del juego
alEmpezar() { // Al iniciar
    alRecibir("JEFE_DERROTADO", (datos) => { // Cuando alguien avisa que el jefe murió
        imprimir("¡EL REINO HA SIDO SALVADO!"); // Ejecutar instrucción
        esperar(2); // Pausa dramática
        cargarEscena("Creditos"); // Vamos a la escena final
    }); // Ejecutar instrucción
} // Fin del bloque

// Ejemplo de cómo otro script enviaría este mensaje:
// difundir("JEFE_DERROTADO", { tiempo: tiempoJuego });
```

---

¡Felicidades! Has llegado al final de **El Gran Libro de Creative Engine**. Con estos 100 códigos tienes la base para crear cualquier juego que imagines. ¡A crear! 🚀
