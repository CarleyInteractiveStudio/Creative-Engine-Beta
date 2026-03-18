# 🏗️ Advanced Guide: Projects, Scenes, and Building - Creative Engine

This guide covers core aspects of asset management, level design, and final publishing for your games.

---

## 📂 1. Project Structure

Each project in Creative Engine is saved in a dedicated folder:
- `/Assets`: All your images, sounds, videos, and scripts.
- `/lib`: Folder for libraries (.celib) extending the engine.
- `project.ceconfig`: Technical settings file (layers, tags, metadata).
- `thumbnail.png`: Project preview image.

### Project Settings
Go to **Edit > Project Settings** to:
- Change the game's title and author.
- Manage **Sorting Layers** (draw order).
- Define **Collision Layers** and **Tags**.

---

## 🎬 2. Scene Management (.ceScene)

Scenes are individual worlds containing materials and environment settings.

### Basic Operations
- **Save Scene:** Use `Ctrl + S`.
- **Switch Scenes:** Double-click any `.ceScene` file in the browser.
- **Scene Thumbnail:** The engine automatically takes a screenshot for the icon upon saving.

---

## 📦 3. Import and Packages (.cep)

### Importing Assets
1. **Drag and Drop:** Drag files directly from your PC to the asset browser.
2. **Spine (Skeletal Animation):** Supports importing from Spine in `.json` format.

### Exporting Packages
Right-click any folder in `Assets` and select **Export Package**. This creates a `.cep` file for easy transfer between projects.

---

## 🏗️ 4. Build System

Building creates an independent web package (`.zip`) ready to be hosted on servers.

1. Go to **File > Build**.
2. Select the starting scene.
3. Configure Splash Screens.
4. Click "Build Game".
