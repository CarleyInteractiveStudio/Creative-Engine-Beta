# Creative Engine: El Libro Maestro Ultra-Detallado (Master Scripting Book)

Bienvenido al recurso definitivo para dominar el desarrollo en **Creative Engine**. Este libro ha sido diseñado para llevarte desde los conceptos más básicos hasta el entendimiento profundo de las entrañas del motor, su sistema de transpilación y su API multilingüe.

---

## Tabla de Contenidos
1. [Filosofía del Motor](#filosofía-del-motor)
2. [El Corazón: Materia y Leyes](#el-corazón-materia-y-leyes)
3. [Scripting Multilingüe (CES)](#scripting-multilingüe-ces)
4. [El Proceso de Transpilación](#el-proceso-de-transpilación)
5. [Físicas y Colisiones](#físicas-y-colisiones)
6. [Interfaz de Usuario (UI)](#interfaz-de-usuario-ui)
7. [IA y Colaboración (Carl & Carley)](#ia-y-colaboración-carl--carley)

---

## 1. Filosofía del Motor
Creative Engine no es solo una herramienta; es un ecosistema diseñado para la **accesibilidad radical**. La filosofía principal es que la barrera del idioma no debe ser un impedimento para la creación. Por ello, el motor soporta scripting nativo en múltiples idiomas, permitiendo que la lógica del juego se exprese de la forma más natural posible para el desarrollador.

---

## 2. El Corazón: Materia y Leyes
En Creative Engine, todo lo que ves en pantalla es una **Materia** (Object). Lo que define el comportamiento de esa Materia son sus **Leyes** (Componentes).

- **Materia:** Un contenedor vacío con posición, rotación y escala.
- **Leyes:** Scripts, Físicas (Rigidbody2D), Salud, Animadores, etc.

---

## 3. Scripting Multilingüe (CES)
El lenguaje **CES (Creative Engine Script)** es una capa de abstracción sobre JavaScript que permite escribir código en español, inglés, portugués, ruso y chino.

### Atributos Globales (Alias Multilingües)
Todas las Materias exponen propiedades que puedes usar directamente en tus scripts:

| Español | English | Português | Русский | 中文 | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `x`, `y` | `x`, `y` | `x`, `y` | `x`, `y` | `x`, `y` | Coordenadas de posición |
| `rotacion` | `rotation` | `rotacao` | `вращение` | `旋转` | Ángulo de rotación |
| `escala` | `scale` | `escala` | `масштаб` | `缩放` | Tamaño del objeto |
| `nombre` | `name` | `nome` | `имя` | `名称` | Identificador único |
| `etiqueta` | `tag` | `etiqueta` | `тег` | `标签` | Categoría del objeto |

### Ejemplo de Lógica en Español:
```ces
public star() {
    imprimir("Iniciando mi aventura...");
    fisica.velocidadY = 10; // Acceso directo al Rigidbody2D
}

public alActualizar() {
    si (entrada.teclaPulsada("espacio")) {
        vida.quitarVida(10);
    }
}
```

---

## 4. El Proceso de Transpilación
El motor no ejecuta el código CES directamente. Existe un **Transpilador (CES_Transpiler.js)** que actúa como un traductor en tiempo real.

**¿Cómo funciona?**
1. **Detección de Idioma:** Analiza palabras clave como `si`, `if`, `se` para identificar la estructura.
2. **Mapeo de Tokens:** Convierte alias como `quitarVida` en llamadas a métodos internos como `damage()`.
3. **Limpieza de Await:** El motor maneja corrutinas automáticas. El transpilador limpia los `await` innecesarios en constructores para evitar errores de sintaxis.
4. **Generación de JS:** El resultado es JavaScript puro de alto rendimiento que el navegador puede ejecutar.

---

## 5. Físicas y Colisiones
El motor utiliza un motor de físicas 2D integrado. Para que un objeto reaccione a la gravedad, debe tener la ley **Física (Rigidbody2D)**.

**Propiedades Clave:**
- **Tipo de Cuerpo:** Dinámico (cae), Estático (suelo), o Cinemático (movido por script).
- **Escala de Gravedad:** Cuánta fuerza ejerce el mundo sobre el objeto.
- **Masa:** Influye en la inercia y las colisiones.

**Eventos de Colisión:**
- `alChocar(objeto)` / `OnCollisionEnter(other)`: Se activa en el momento del impacto.

---

## 6. Interfaz de Usuario (UI)
El sistema de UI es independiente del renderizado de la escena. Utiliza el componente **UITransform** para posicionar elementos en la pantalla (Canvas).

**Componentes de UI:**
- **Imagen UI:** Muestra sprites con soporte de opacidad.
- **Barra de Progreso:** Ideal para barras de salud o carga.
- **Scroll View:** Permite crear inventarios o menús largos.
- **Máscara UI:** Recorta a los hijos que salen de su área.

---

## 7. IA y Colaboración (Carl & Carley)
### Carl IA
Carl es tu asistente personal dentro del editor. Puede crear objetos, añadir componentes y escribir scripts por ti. Entiende lenguaje natural y ejecuta planes complejos.

### Carley Creative Code (Entrenamiento de IA)
En la sección de **Proyecto Colaborativo** (Preferencias), puedes activar la opción "Compartir con Carley".
- **¿Por qué hacerlo?** Al compartir tus códigos CES cuando publicas un juego, ayudas a entrenar el modelo **Carley Creative Code**.
- **Ventajas:** Este modelo está diseñado desde cero para este motor. Consume **menos de 1 GB de RAM**, lo que reduce costos de servidor y permite que más usuarios tengan acceso gratuito a la IA de alta calidad.
- **Privacidad:** Tus códigos solo se usan para fines de entrenamiento interno y nunca se comparten con terceros.

---

© 2024 Carley Interactive Studio. Todos los derechos reservados.
