# 🏗️ Proyectos, Escenas y Publicación - Creative Engine

Este manual cubre la gestión técnica de tus creaciones, desde la estructura de carpetas hasta el empaquetado final.

---

## 📂 1. Estructura de un Proyecto

Cada proyecto se guarda en su propia carpeta con los siguientes elementos:
- **/Assets:** Imágenes, sonidos, scripts y escenas.
- **/lib:** Librerías (.celib) que extienden el motor.
- **/doc:** Documentación local del proyecto y manuales del motor.
- **project.ceconfig:** Configuración técnica (Capas, Tags, metadatos).
- **thumbnail.png:** Imagen de previsualización del proyecto.

---

## 🎬 2. Gestión de Escenas (.ceScene)

Las escenas son mundos independientes. Puedes tener niveles, menús y pantallas de carga.
- **Guardar:** `Ctrl + S`. Se captura una miniatura automáticamente.
- **Cambiar de escena:** Haz doble clic en un archivo `.ceScene` en el Navegador.
- **Lógica de Cambio:** Puedes usar `escena.cargar("Assets/Nivel2.ceScene")` en tus scripts.

---

## 📦 3. Prefabs (.ceprefab)

Un Prefab es un objeto pre-configurado que puedes reutilizar.
- **Crear:** Arrastra una Materia desde la Jerarquía hasta el Navegador de Assets.
- **Uso:** Arrastra el archivo `.ceprefab` a la escena para crear una instancia.
- **Edición:** Haz doble clic en el prefab en el Navegador para entrar en el **Modo Edición de Prefab**.

---

## 🏗️ 4. Sistema de Build y Exportación

### Exportar Assets (.cep)
Haz clic derecho en cualquier carpeta en Assets y elige **Exportar Paquete**. Esto crea un archivo `.cep` comprimido con todos los archivos necesarios, ideal para compartir con otros creadores.

### Build del Juego
Prepara tu juego para la web.
1. Ve a **Archivo > Build**.
2. Selecciona la escena inicial.
3. Configura las pantallas de inicio (Splash Screens).
4. El motor generará un archivo `.zip` con un entorno web independiente listo para subir a sitios como Itch.io.

---

## 📱 5. Firma de Android (Keystore)
En la Configuración del Proyecto, puedes generar o asignar un archivo **Keystore**. Esto es obligatorio si planeas convertir tu build web en una APK de Android firmada para Google Play.
