# 🏗️ Projects, Scenes, and Publishing - Creative Engine

This manual covers the technical management of your creations, from folder structure to final packaging.

---

## 📂 1. Project Structure

Each project is saved in its own folder with the following items:
- **/Assets:** Images, sounds, scripts, and scenes.
- **/lib:** Libraries (.celib) extending the engine.
- **/doc:** Local project documentation and engine manuals.
- **project.ceconfig:** Technical configuration (Layers, Tags, metadata).
- **thumbnail.png:** Project preview image.

---

## 🎬 2. Scene Management (.ceScene)

Scenes are independent worlds. You can have levels, menus, and loading screens.
- **Save:** `Ctrl + S`. A thumbnail is captured automatically.
- **Switch Scenes:** Double-click a `.ceScene` file in the Browser.
- **Switch Logic:** Use `scene.load("Assets/Level2.ceScene")` in your scripts.

---

## 📦 3. Prefabs (.ceprefab)

A Prefab is a pre-configured object you can reuse.
- **Create:** Drag a Materia from the Hierarchy to the Asset Browser.
- **Usage:** Drag the `.ceprefab` file into the scene to create an instance.
- **Editing:** Double-click the prefab in the Browser to enter **Prefab Edit Mode**.

---

## 🏗️ 4. Build and Export System

### Exporting Assets (.cep)
Right-click any folder in Assets and choose **Export Package**. This creates a compressed `.cep` file with all necessary files, ideal for sharing with other creators.

### Building the Game
Prepare your game for the web.
1. Go to **File > Build**.
2. Select the starting scene.
3. Configure Splash Screens.
4. The engine will generate a `.zip` file with a standalone web environment ready to upload to sites like Itch.io.

---

## 📱 5. Android Signing (Keystore)
In Project Settings, you can generate or assign a **Keystore** file. This is mandatory if you plan to convert your web build into a signed Android APK for Google Play.
