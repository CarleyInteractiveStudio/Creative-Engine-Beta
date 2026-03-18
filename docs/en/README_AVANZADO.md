# 🏗️ Advanced Guide: Projects, Scenes, and Building - Creative Engine

This guide covers the fundamental aspects of asset management, level design, and the final publication of your games.

---

## 📂 1. Project Structure

Each project in Creative Engine is saved in an independent folder with the following structure:
- `/Assets`: This is where all your images, sounds, videos, and scripts reside.
- `/lib`: Folder reserved for libraries (.celib) that extend the engine.
- `project.ceconfig`: Technical configuration file (layers, tags, metadata).
- `thumbnail.png`: Project preview image.

### Project Settings
Go to **Edit > Project Settings** to:
- Change the name and author of the game.
- Manage **Sorting Layers** (drawing order by layers).
- Define **Collision Layers** and **Tags**.

---

## 🎬 2. Scene Management (.ceScene)

Scenes are individual worlds that contain matters and environmental settings.

### Basic Operations
- **Save Scene:** Use `Ctrl + S`. It is crucial to save to persist the object hierarchy.
- **Scene Switch:** Double-click any `.ceScene` file in the browser. You will be asked if you want to save pending changes.
- **Scene Thumbnail:** When saving, the engine automatically captures a photo of what you see to use as an icon in the browser.

---

## 📦 3. Importing and Packages (.cep)

### Asset Importing
1. **Drag and Drop:** You can drag files directly from your PC to the grid area of the Asset Browser.
2. **Spine (Skeletal Animation):** Official support for importing skeletons exported from Spine in `.json` format. Go to **File > Import Skeleton**.

### Package Exporting
Right-click any folder within `Assets` and choose **Export Package**. This will create a `.cep` file that groups all content (images, linked scripts, etc.) so you can move it between projects easily.

---

## 🏗️ 4. The Build System (Publication)

The Build process generates an independent web package (`.zip`) ready to be hosted on servers.

### Steps for a Successful Build
1. Go to **File > Build**.
2. **Initial Scene:** Make sure to select which scene the player will load first.
3. **Asset Optimization:**
   - If you disable "Include all files", the engine will perform a dependency analysis to export **only** what your scenes need, saving a lot of size.
4. **Splash Screens:** You can add studio logos that will appear before the game loads.
5. **Generation:** Click on "Build Game". You will get a ZIP containing the runtime engine, your transpiled scripts, and your optimized assets.

---

## 🏠 5. Prefab System

A **Prefab** is an object template that you can reuse.
1. Create an object and configure it (add laws, scripts, children).
2. Drag it from the **Hierarchy** to the **Asset Browser**.
3. A `.ceprefab` file will be created. Now you can drag it into any scene to create identical copies.
4. **Edit Mode:** Double-click the `.ceprefab` to enter the isolated prefab editor. Changes here will affect all future instances.
