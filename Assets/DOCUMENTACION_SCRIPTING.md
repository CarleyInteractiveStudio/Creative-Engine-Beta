# 📜 Guía Maestra de Scripting: Creative Engine (CES/CHC)

Bienvenido a la documentación oficial de **Creative Engine**. Este motor utiliza un sistema de scripting transpilado que permite usar múltiples idiomas y una sintaxis simplificada para crear lógica compleja rápidamente.

---

## 🛠️ Estructura y Reglas Básicas

### Archivos y Clases
- Los archivos `.ces` y `.chc` se transforman automáticamente en clases.
- No es necesario declarar la clase manualmente; el nombre del archivo define el nombre del script.

### Importación de Librerías (`go` / `ve`)
Permite acceder a funcionalidades externas o del motor.
- `ve motor;` (Importa las APIs base del motor)
- `go "MiLibreria";` (Importa una librería creada por el usuario)

---

## 🔑 Palabras Clave y Lógica

| Función | Español | Inglés | Portugués | Ruso | Chino |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Condicional** | `si` | `if` | `se` | `если` | `如果` |
| **Sino** | `sino` | `else` | `senão` | `иначе` | `否则` |
| **Bucle Mientras** | `mientras` | `while` | `enquanto` | `пока` | `当` |
| **Bucle Para** | `para` | `for` | `para` | `для` | `对于` |
| **Retornar** | `retornar` | `return` | - | `вернуть` | `返回` |
| **Nuevo** | `nuevo` | `new` | - | `новый` | `新建` |
| **Función** | `funcion` | `function` | `função` | `функция` | `函数` |
| **Verdadero** | `verdadero` | `true` | `verdadeiro` | `истина` | `真` |
| **Falso** | `falso` | `false` | `falso` | `ложь` | `假` |
| **Variable** | `variable` | `let` | - | - | - |
| **Constante** | `constante` | `const` | - | - | - |

---

## 📦 Variables y Ámbitos (Scopes)

### Declaración
`[ámbito] [tipo] [nombre] = [valor];`

**Ámbitos:**
- `public` / `publico` / `公开`: Aparece en el Inspector para edición visual.
- `private` / `privado` / `私有`: Solo accesible dentro del script.

**Tipos:**
- `number` / `numero`: Decimales o enteros.
- `text` / `texto`: Cadenas de texto.
- `boolean` / `booleano`: `verdadero` o `falso`.
- `Materia` / `mtr`: Referencia a objetos de la escena.
- `Sprite`, `Audio`, `Prefab`, `Scene`.
- `Vector2`: `{x, y}`.
- `Color`: `{r, g, b, a}`.

---

## ⏳ Ciclo de Vida y Eventos

El motor llama a estas funciones automáticamente. Puedes usar los nombres en cualquier idioma soportado.

### Principales
- `alEmpezar()` / `iniciar()` / `start()`: Al nacer el objeto.
- `alActualizar(delta)` / `actualizar(delta)` / `update()`: Cada frame.
- `actualizarFijo(delta)` / `fixedUpdate()`: Para físicas (50Hz).

### Físicas y Colisiones
- `alEntrarEnColision(otro)` / `OnCollisionEnter`: Al chocar.
- `alPermanecerEnColision(otro)`: Mientras está chocando.
- `alSalirDeColision(otro)`: Al separarse.
- `alEntrarEnTrigger(otro)`: Al entrar en un área sensor (isTrigger).

### Entrada de Usuario (Mouse/Touch)
- `alPresionar()` / `onPointerDown()`
- `alSoltar()` / `onPointerUp()`
- `alHacerClick()` / `onPointerClick()`
- `alDeslizar()` / `onPointerDrag()`
- `alMantener()` / `onPointerHold()`

### Animación y Mensajería
- `alFinalizarAnimacion(nombre)` / `OnAnimationEnd`
- `alRecibir(mensaje, datos)` / `onReceive`: Comunicación global entre scripts.

---

## 🕰️ Tiempo y Control Avanzado

### Temporizadores (`cada`)
Ejecuta lógica repetidamente sin necesidad de variables contadoras.
```ces
cada(1.5) {
    imprimir("Esto ocurre cada 1.5 segundos");
}
```

### Corrutinas (`esperar`)
Pausa el flujo de una función.
```ces
funcion secuencia() {
    imprimir("Inicio");
    esperar(2);
    imprimir("Fin después de 2 segundos");
}
```

---

## 🧮 Funciones Matemáticas (Multilingües)

Puedes usar estas funciones directamente en cualquier parte de tu script.

| Español | Inglés | Descripción |
| :--- | :--- | :--- |
| `azar(min, max)` | `random` | Número aleatorio entre min y max. |
| `seno(v)` | `sin` | Seno trigonométrico. |
| `coseno(v)` | `cos` | Coseno trigonométrico. |
| `tangente(v)` | `tan` | Tangente trigonométrica. |
| `raizCuadrada(v)`| `sqrt` | Raíz cuadrada de v. |
| `redondear(v)` | `round` | Redondea al entero más cercano. |
| `piso(v)` | `floor` | Redondea hacia abajo. |
| `techo(v)` | `ceil` | Redondea hacia arriba. |
| `absoluto(v)` | `abs` | Valor absoluto (sin signo). |
| `limitar(v, min, max)`| `clamp` | Mantiene v entre min y max. |
| `distancia(v1, v2)`| `distance` | Distancia entre dos puntos. |

---

## ⚙️ Comandos del Motor (Atajos)

### Gestión de Objetos
- `crear miPrefab`: Instancia un prefab (sintaxis ultra-rápida).
- `instanciar(original, x, y)`: Copia una materia existente.
- `destruir(mtr)`: Elimina el objeto de la escena.
- `buscar("Nombre")`: Busca un objeto por su nombre.
- `lanzarRayo(origen, dir, dist, tag)`: Detecta objetos en línea recta (Raycast).

### Comunicación
- `difundir("Evento", datos)`: Envía un mensaje a todos los scripts del juego.
- `imprimir(msg)`: Escribe en la consola del editor.

---

## 🎮 El Proxy `reproducir` / `play`

Creative Engine tiene un sistema inteligente para animaciones. Puedes llamar a estados de tu AnimatorController como si fueran funciones.

```ces
// Si tienes un estado llamado "Correr" en tu controlador:
reproducir.correr();
// O en inglés:
play.walk();
```
Esto buscará el estado en el `AnimatorController` y lo activará automáticamente respetando las transiciones.
