# 🖥️ Guía de la Terminal - Creative Engine

La Terminal es una herramienta avanzada que permite interactuar con el motor mediante comandos de texto. Es ideal para gestionar archivos rápidamente o manipular objetos de la escena sin usar el ratón.

---

## 🚀 Cómo Activar la Terminal

Existen dos formas de abrir la terminal en el editor:
1. **Menú Superior:** Ve a **Ventana > Terminal**.
2. **Pestaña Inferior:** En el panel de Assets/Consola, haz clic en la pestaña **Terminal**.

---

## 📂 1. Comandos de Sistema de Archivos

Estos comandos permiten navegar por las carpetas de tu proyecto:

- `ls`: Lista todos los archivos y carpetas en el directorio actual.
- `cd <carpeta>`: Entra en una carpeta. Usa `cd ..` para subir de nivel o `cd ~` para volver a la raíz.
- `pwd`: Muestra la ruta actual en la que te encuentras.
- `cat <archivo>`: Muestra el contenido de un archivo de texto o script en la pantalla.
- `clear`: Limpia todo el historial de la terminal.

---

## 🎬 2. Comandos de Escena (Manipulación de Objetos)

Puedes crear y modificar objetos (Materias) directamente desde aquí:

- `lsobj`: Muestra una lista de todos los objetos en la escena actual con sus IDs.
- `mkobj <nombre>`: Crea una nueva Materia vacía con el nombre indicado.
- `rmobj <id>`: Elimina el objeto con el ID especificado.
- `inspect <id>`: Muestra detalles técnicos, componentes y propiedades del objeto.
- `addcomp <id> <tipo>`: Añade un componente al objeto.
  - *Ejemplo:* `addcomp 102 Rigidbody2D`
- `setprop <id> <componente> <propiedad> <valor>`: Cambia el valor de una propiedad.
  - *Ejemplo:* `setprop 102 Transform position.x 500`
  - *Ejemplo:* `setprop 105 SpriteRenderer color #ff0000`

---

## 🌐 3. Comandos de Utilidad

- `download <url> [ruta]`: Descarga un archivo desde Internet directamente a tu proyecto.
  - *Ejemplo:* `download https://ejemplo.com/hero.png Assets/hero.png`
- `help`: Muestra la lista de todos los comandos disponibles.
- `version`: Muestra la versión actual de Creative Engine.

---

## 💡 Ejemplos de Flujo de Trabajo

### Crear un jugador y configurarlo:
```bash
mkobj Jugador
# Supongamos que el ID generado es 10
addcomp 10 SpriteRenderer
addcomp 10 Rigidbody2D
setprop 10 Transform position.y 200
```

### Explorar Assets:
```bash
cd Assets
ls
cat MiScript.ces
```
