# 📜 Guía Maestra de Scripting: Creative Engine (CES/CHC)

Bienvenido a la documentación oficial y detallada del lenguaje de scripting de **Creative Engine**. Este motor utiliza un sistema transpilado multilingüe que te permite escribir lógica de videojuegos en tu idioma preferido (Español, Inglés, Portugués, Ruso o Chino).

---

## 🛠️ Estructura de un Script
Cada archivo `.ces` o `.chc` se convierte internamente en una clase de JavaScript. El motor maneja la inicialización, el ciclo de vida y la comunicación entre objetos automáticamente.

### 🔌 Importación de Librerías
Para usar funciones de librerías externas o internas del motor, usa la palabra clave `go` o `ve`.
- **Sintaxis:** `go "NombreLibreria"` o `ve motor;`

---

## 🔑 Palabras Clave Multilingües

Creative Engine es único por su soporte nativo de múltiples idiomas para las estructuras lógicas básicas.

| Función | Español | Inglés | Portugués | Ruso | Chino |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Condicional** | `si` | `if` | `se` | `если` | `如果` |
| **Alternativa** | `sino` | `else` | `senão` | `иначе` | `否则` |
| **Bucle Mientras** | `mientras` | `while` | `enquanto` | `пока` | `当` |
| **Bucle Para** | `para` | `for` | `para` | `для` | `对于` |
| **Retornar** | `retornar` | `return` | - | `вернуть` | `返回` |
| **Nuevo Objeto** | `nuevo` | `new` | - | `новый` | `新建` |
| **Función** | `funcion` | `function` | `função` | `функция` | `函数` |
| **Booleano Verdadero**| `verdadero` | `true` | `verdadeiro` | `истина` | `真` |
| **Booleano Falso** | `falso` | `false` | `falso` | `ложь` | `假` |
| **Variable** | `variable` | `let` | - | - | - |
| **Constante** | `constante` | `const` | - | - | - |

---

## 📦 Variables y Tipos de Datos

Las variables pueden declararse con un ámbito (opcional, por defecto es público) y un tipo obligatorio.

### Ámbitos (Scopes)
- `public` / `publico`: Aparece en el **Inspector** del editor para ser editado visualmente.
- `private` / `privado`: Solo es accesible dentro del script.

### Tipos de Datos Soportados
| Tipo | Alias Multilingües | Uso |
| :--- | :--- | :--- |
| `number` | `numero`, `número`, `число`, `数字` | Valores numéricos decimales o enteros. |
| `text` | `texto`, `текст`, `文本` | Cadenas de caracteres entre comillas. |
| `boolean`| `booleano`, `булево`, `布尔值` | Valores de verdad: `verdadero` o `falso`. |
| `Materia`| `materia`, `материя`, `物质`, `mtr` | Referencia a otro objeto en la escena. |
| `Sprite` | `спрайт`, `精灵` | Referencia a una imagen o asset de sprite. |
| `Audio`  | `áudio`, `аудио`, `音频`, `sonido`| Referencia a un clip de sonido. |
| `Prefab` | `преfab`, `预制件` | Un objeto prefabricado listo para ser instanciado. |
| `Vector2`| `вектор2`, `向量2` | Coordenadas `x` e `y`. |
| `Color`  | `cor`, `цвет`, `颜色` | Valores RGBA. |

**Ejemplo:**
```ces
public numero velocidad = 5.5;
privado texto nombreSecreto = "Carl";
public mtr objetivo;
```

---

## ⏳ Ciclo de Vida y Eventos

Los scripts reaccionan automáticamente a lo que sucede en el juego a través de métodos reservados.

### Métodos de Inicio y Actualización
- `alEmpezar()` / `iniciar()` / `start()`: Se ejecuta una sola vez cuando el objeto aparece en el juego.
- `alActualizar(delta)` / `actualizar(delta)` / `update()`: Se ejecuta en cada fotograma. `delta` es el tiempo pasado desde el último frame.

### Físicas y Colisiones
- `actualizarFijo(delta)` / `fixedUpdate()`: Ideal para lógica de físicas constantes.
- `alEntrarEnColision(otro)`: Se dispara cuando este objeto toca a `otro`.
- `alSalirDeColision(otro)`: Se dispara al dejar de tocar.

### Interacción del Usuario
- `alPresionar()` / `onPointerDown()`: Al hacer clic o tocar el objeto.
- `alSoltar()` / `onPointerUp()`: Al soltar el clic/toque.
- `alHacerClick()` / `onPointerClick()`: Clic completo.

---

## 🕰️ Temporizadores y Corrutinas

Creative Engine facilita el manejo del tiempo sin bloquear el juego.

### Bloque `cada` (Timers Simplificados)
Ejecuta código repetidamente en un intervalo de segundos.
```ces
cada(2.0) {
    imprimir("Han pasado 2 segundos");
}
```

### `esperar` (Corrutinas)
Pausa la ejecución de una función durante un tiempo específico.
```ces
funcion aparecerEnemigo() {
    esperar(3);
    crear enemigoPrefab;
}
```

---

## 🛠️ Funciones del Motor y Atajos

Dentro de cualquier script, tienes acceso directo a las capacidades del motor usando estos comandos:

### Gestión de Objetos
- `crear miPrefab`: Instancia un prefab en la escena.
- `destruir(materia)`: Elimina un objeto del juego.
- `buscar("Nombre")`: Encuentra un objeto en la escena por su nombre.
- `instanciar(prefab, posicion, rotacion)`: Versión avanzada de creación.

### Utilidades Globales
- `imprimir(mensaje)`: Muestra información en la consola del editor.
- `lanzarRayo(origen, direccion, distancia, tag)`: Detecta objetos en una línea recta (Raycast).
- `azar(min, max)`: Genera un número aleatorio.
- `distancia(v1, v2)`: Calcula la distancia entre dos puntos.

---

## 🎨 Ejemplo de Script Completo

```ces
ve motor;

public numero fuerzaSalto = 10;
public Audio sonidoSalto;
private booleano enSuelo = verdadero;

alEmpezar() {
    imprimir("¡Script de salto iniciado!");
}

alActualizar(delta) {
    si (entrada.teclaPresionada("Space") && enSuelo) {
        fisica.addForce(nuevo Vector2(0, -fuerzaSalto));
        fuenteDeAudio.play(sonidoSalto);
        enSuelo = falso;
    }
}

alEntrarEnColision(otro) {
    si (otro.tieneTag("Suelo")) {
        enSuelo = verdadero;
    }
}
```
