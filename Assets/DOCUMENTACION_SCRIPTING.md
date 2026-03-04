# 📜 Guía Definitiva de Scripting: Creative Engine (CES/CHC)

Bienvenido a la documentación maestra del lenguaje de scripting de **Creative Engine**. Este motor utiliza un sistema transpilado multilingüe único que permite a los desarrolladores escribir lógica en su idioma nativo mientras mantiene la potencia de una arquitectura orientada a objetos moderna.

---

## 🛠️ Fundamentos del Lenguaje

### Archivos y Compilación
- Los scripts se guardan como archivos `.ces` (Creative Engine Script) o `.chc` (H-Code).
- El transpilador convierte automáticamente estos archivos en clases de JavaScript asíncronas.
- No es necesario manejar `import` o `export` para la lógica básica del juego; el motor inyecta las dependencias necesarias.

### Importación de Librerías (`go` / `ve`)
Para acceder a las funciones del motor o a librerías de terceros:
- `ve motor;` o `ve motor.ui;` (Acceso a las APIs internas).
- `go "MiLibreria";` (Importa una librería `.celib` registrada).

---

## 🔑 Palabras Clave por Idioma

El motor detecta y traduce estas estructuras lógicas automáticamente.

| Lógica | Español | English | Português | Русский | 中文 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Condición** | `si` | `if` | `se` | `если` | `如果` |
| **Alternativa** | `sino` | `else` | `senão` | `иначе` | `否则` |
| **Bucle Mientras** | `mientras` | `while` | `enquanto` | `пока` | `当` |
| **Bucle Para** | `para` | `for` | `para` | `для` | `对于` |
| **Retornar Valor** | `retornar` | `return` | - | `вернуть` | `返回` |
| **Instanciar** | `nuevo` | `new` | - | `новый` | `新建` |
| **Declarar Función** | `funcion` | `function` | `função` | `функция` | `函数` |
| **Booleano (Sí)** | `verdadero` | `true` | `verdadeiro` | `истина` | `真` |
| **Booleano (No)** | `falso` | `false` | `falso` | `ложь` | `假` |
| **Variable** | `variable` | `let` | - | - | - |
| **Constante** | `constante` | `const` | - | - | - |

---

## 📦 Tipos de Datos y Declaración

### Sintaxis de Declaración
`[ámbito] [tipo] [nombre] = [valor];`

**Ámbitos:**
- `public` / `publico`: Expone la variable en el **Inspector** del editor.
- `private` / `privado`: La variable solo existe dentro de este script.

| Tipo de Dato | Alias Soportados | Descripción |
| :--- | :--- | :--- |
| `number` | `numero`, `número`, `число`, `数字` | Números decimales o enteros. |
| `text` | `texto`, `текст`, `文本` | Cadenas de caracteres entre comillas `"`. |
| `boolean` | `booleano`, `булево`, `布尔值` | `verdadero` o `falso`. |
| `Materia` | `mtr`, `материя`, `物质` | Referencia a cualquier objeto de la escena. |
| `Sprite` | `спрайт`, `精灵` | Referencia a una imagen o asset de sprite. |
| `Audio` | `sonido`, `áudio`, `аудио`, `音频` | Referencia a un archivo de sonido. |
| `Prefab` | `префаб`, `预制件` | Objeto prefabricado para instanciación masiva. |
| `Scene` | `escena`, `cena`, `сцена`, `场景` | Referencia a un archivo de nivel (.ceScene). |
| `Vector2` | `вектор2`, `向量2` | Coordenadas XY: `nuevo Vector2(x, y)`. |
| `Color` | `cor`, `цвет`, `颜色` | Colores RGBA o Hex: `nuevo Color(r, g, b, a)`. |

---

## ⏳ Ciclo de Vida y Eventos (Hooks)

El motor llama a estos métodos en momentos específicos. Son **asíncronos** por defecto.

### Inicialización y Frame
- `alEmpezar()` / `iniciar()` / `start()`: Se ejecuta una vez al cargar el objeto.
- `alActualizar(delta)` / `actualizar()` / `update()`: Se ejecuta cada frame. `delta` es el tiempo entre cuadros.

### Físicas (50 veces por segundo)
- `actualizarFijo(delta)` / `fixedUpdate()`: Ideal para aplicar fuerzas constantes.
- `alEntrarEnColision(otro)` / `OnCollisionEnter`: Al iniciar el contacto físico.
- `alPermanecerEnColision(otro)`: Mientras el contacto se mantiene.
- `alSalirDeColision(otro)`: Al finalizar el contacto.
- `alEntrarEnTrigger(otro)`: Al entrar en una zona sensor (isTrigger activado).

### Interacción de Usuario (Mouse/Touch)
- `alPresionar()` / `onPointerDown()`: Al hacer clic/tocar.
- `alSoltar()` / `onPointerUp()`: Al levantar el dedo/clic.
- `alEntrar()` / `onPointerEnter()`: Al pasar el cursor por encima.
- `alSalir()` / `onPointerExit()`: Al sacar el cursor.
- `alHacerClick()` / `onPointerClick()`: Clic rápido completo.
- `alDeslizar()` / `onPointerDrag()`: Mientras se arrastra el objeto.
- `alMantener()` / `onPointerHold()`: Mientras se mantiene presionado.

---

## 🕰️ Temporizadores y Control Avanzado

### El Bloque `cada`
Sintaxis simplificada para crear bucles de tiempo infinitos sin usar variables externas.
```ces
// Ejecuta la lógica cada 2.5 segundos
cada(2.5) {
    imprimir("¡Evento de tiempo!");
    reproducir.sonidoEfecto();
}
```

### Corrutinas (`esperar`)
Permite pausar la ejecución de una función de forma no bloqueante.
```ces
funcion secuenciaMuerte() {
    animador.play("Morir");
    esperar(1.2); // Pausa por 1.2 segundos
    difundir("GameOver");
    destruir(materia);
}
```

---

## 🧮 Funciones Matemáticas Multilingües

Accede a la potencia de cálculo sin importar el idioma.

| Función | Español | English | Descripción |
| :--- | :--- | :--- | :--- |
| **Random** | `azar(min, max)` | `random` | Número aleatorio entre rango. |
| **Trig** | `seno(v)`, `coseno(v)`| `sin`, `cos` | Funciones trigonométricas base. |
| **Math** | `raizCuadrada(v)` | `sqrt` | Raíz cuadrada. |
| **Round** | `redondear(v)` | `round` | Redondeo estándar. |
| **Floor** | `piso(v)` | `floor` | Hacia abajo. |
| **Ceil** | `techo(v)` | `ceil` | Hacia arriba. |
| **Abs** | `absoluto(v)` | `abs` | Valor positivo. |
| **Clamp** | `limitar(v, min, max)`| `clamp` | Restringe un valor a un rango. |
| **Dist** | `distancia(v1, v2)` | `distance` | Distancia entre dos puntos o objetos. |

---

## ⚙️ Comandos del Motor (Atajos)

### Gestión de Objetos
- `crear miPrefab`: Instancia un prefab en la posición actual.
- `instanciar(original, x, y)`: Duplica una materia existente.
- `destruir(mtr)`: Elimina el objeto (o una referencia) del juego.
- `buscar("Nombre")`: Encuentra un objeto por su nombre en la escena.

### Físicas y Sensores
- `lanzarRayo(origen, dir, dist, tag)`: Lanza un Raycast para detectar impactos.
- `estaTocandoTag("Suelo")`: Devuelve verdadero si el objeto colisiona con ese tag.

### UI y Sistema
- `imprimir(mensaje)`: Envía texto a la consola del editor.
- `difundir("Mensaje", datos)`: Envía un evento global a todos los objetos.
- `alRecibir("Mensaje", datos)`: Hook para reaccionar a mensajes globales.

---

## 🎮 El Sistema Proxy `reproducir` / `play`

Esta es una de las funciones más potentes de Creative Engine. Puedes llamar a los nombres de tus animaciones o sonidos directamente como si fueran funciones de la clase.

```ces
// Si tienes un sonido en AudioSource llamado "Explosion"
reproducir.Explosion();

// Si tienes un estado en AnimatorController llamado "Atacar"
play.Atacar();
```
El motor buscará automáticamente en los componentes `AudioSource` o `AnimatorController` de la materia y ejecutará la acción correspondiente.
