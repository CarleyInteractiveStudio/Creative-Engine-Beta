# ⚙️ Technical Configuration Guide (.ceconfig) - Creative Engine

Every project in Creative Engine is managed by a `project.ceconfig` file. Understanding its structure allows for advanced control over layers, tags, and game settings.

---

## 📄 1. File Structure

This JSON file is found in the root of your project:
```json
{
  "appName": "MyGame",
  "authorName": "CreativeStudio",
  "appVersion": "1.0.0",
  "rendererMode": "realista",
  "layers": {
    "sortingLayers": ["Default", "Agua", "UI", "Foreground"],
    "collisionLayers": ["Default", "Agua", "Ground", "Player"]
  },
  "tags": ["Untagged", "Agua", "Ground", "Enemy"],
  "ramLimit": 2048
}
```

---

## 🎨 2. Visual Settings

### `rendererMode`
- `"canvas2d"`: Simple 2D mode without lighting.
- `"realista"`: Advanced mode with lights and Day/Night cycles.

### `ramLimit`
Defines the memory limit (in MB) for the engine's internal cache. If exceeded, non-active assets are released.

---

## 🧱 3. Layers & Tags

### `sortingLayers` (Drawing Order)
The order of the strings in this array determines the draw order. The first elements are drawn behind.

### `collisionLayers` (Physics)
Used to filter collisions between objects. You can define up to 32 layers.

---

## 📱 4. Keystore (Android)

Used for signing builds for publication.
- `keystore.path`: Path to your `.keystore` file.
- `keystore.alias`: Key alias for signing.
