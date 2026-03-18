# 🏗️ Guía Avanzada: Proyectos, Escenas y Construcción - Creative Engine

Esta guía cubre los aspectos fundamentales de la gestión de activos, el diseño de niveles y la publicación final de tus juegos.

---

## 📂 1. Estructura de Proyectos

Cada proyecto en Creative Engine se guarda en una carpeta independiente con la siguiente estructura:
- `/Assets`: Aquí residen todas tus imágenes, sonidos, videos y scripts.
- `/lib`: Carpeta reservada para librerías (.celib) que extienden el motor.
- `project.ceconfig`: Archivo de configuración técnica (capas, tags, metadatos).
- `thumbnail.png`: Imagen de previsualización del proyecto.

### Configuración del Proyecto
Ve a **Editar > Configuración del Proyecto** para:
- Cambiar el nombre y autor del juego.
- Gestionar las **Sorting Layers** (orden de dibujo por capas).
- Definir **Collision Layers** y **Tags**.

---

## 🎬 2. Gestión de Escenas (.ceScene)

Las escenas son mundos individuales que contienen materias y configuraciones ambientales.

### Operaciones Básicas
- **Guardar Escena:** Usa `Ctrl + S`. Es crucial guardar para persistir la jerarquía de objetos.
- **Cambio de Escena:** Doble clic en cualquier archivo `.ceScene` en el navegador. Se te preguntará si quieres guardar los cambios pendientes.
- **Miniatura de Escena:** Al guardar, el motor captura automáticamente una foto de lo que ves para usarla como icono en el navegador.

### Control de Ambiente
Usa el panel de **Control de Ambiente** (Ventana > Control de Ambiente) para:
- Ajustar el ciclo día/noche.
- Definir colores de luz ambiental.
- **Excluir capas:** Evita que objetos como la interfaz de usuario se vean afectados por la oscuridad.

---

## 📦 3. Importación y Paquetes (.cep)

### Importación de Activos
1. **Arrastrar y Soltar:** Puedes arrastrar archivos directamente desde tu PC al área de cuadrícula del Navegador de Assets.
2. **Spine (Animación Esquelética):** Soporte oficial para importar esqueletos exportados desde Spine en formato `.json`. Ve a **Archivo > Importar Esqueleto**.

### Exportación de Paquetes
Haz clic derecho en cualquier carpeta dentro de `Assets` y elige **Exportar Paquete**. Esto creará un archivo `.cep` que agrupa todo el contenido (imágenes, scripts vinculados, etc.) para que puedas moverlo entre proyectos fácilmente.

---

## 🏗️ 4. El Sistema de Build (Publicación)

El proceso de Build genera un paquete web independiente (`.zip`) listo para ser alojado en servidores.

### Pasos para un Build Exitoso
1. Ve a **Archivo > Build**.
2. **Escena Inicial:** Asegúrate de seleccionar qué escena cargará primero el jugador.
3. **Optimización de Assets:**
   - Si desactivas "Incluir todos los archivos", el motor realizará un análisis de dependencias para exportar **únicamente** lo que tus escenas necesitan, ahorrando mucho peso.
4. **Pantallas de Splash:** Puedes añadir logos de tu estudio que aparecerán antes de cargar el juego.
5. **Generación:** Haz clic en "Construir Juego". Obtendrás un ZIP que contiene el motor runtime, tus scripts transpilados y tus assets optimizados.

---

## 🏠 5. Sistema de Prefabs

Un **Prefab** es una plantilla de un objeto que puedes reutilizar.
1. Crea un objeto y configúralo (ponle leyes, scripts, hijos).
2. Arrástralo desde la **Jerarquía** hacia el **Navegador de Assets**.
3. Se creará un archivo `.ceprefab`. Ahora puedes arrastrarlo a cualquier escena para crear copias idénticas.
4. **Modo Edición:** Haz doble clic en el `.ceprefab` para entrar en el editor de prefabs aislado. Los cambios aquí afectarán a todas las instancias futuras.
