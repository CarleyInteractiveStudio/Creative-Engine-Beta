# 🎨 Visual Editors Guide - Creative Engine

Creative Engine includes a suite of visual tools to manage graphics, animations, and levels intuitively.

---

## ✂️ 1. Sprite Editor (Sprite Slicer)

Allows you to crop a large image into multiple small sprites (useful for character sheets or tilesets).

- **How to Open:** Double-click any image (.png, .jpg) in the Asset Browser.
- **Cropping Modes:**
  - **Automatic:** Detects the borders of drawings.
  - **Grid:** Divides the image into equal cells (e.g., 32x32).
- **Pivots:** Defines the center point of each sprite (e.g., a character's feet).

---

## 🎞️ 2. Animation Editor (.cea)

Create image sequences for your characters or objects.

- **How to Open:** Double-click a `.cea` file.
- **Timeline:** Drag sprites from the browser onto the timeline to add frames.
- **Onion Skin:** Shows the previous and next frame transparently to help you animate fluidly.
- **Speed (FPS):** Adjusts how fast the animation plays.

---

## 🎮 3. Animation Controller (StateMachine)

Manages the logic of when each animation should play (e.g., Idle -> Walk).

- **How to Open:** Double-click a `.ceanim` file.
- **Visual Graph:** Right-click to create states. Connect states by dragging from one node to another.
- **Smart Mode:** If enabled, the engine will automatically detect if the character is moving up, down, left, or right and play the corresponding animation without the need for programming.

---

## 🗺️ 4. Tilemap Editor

Quickly design grid-based levels.

- **Component:** Add a **Tilemap** Law to a Matter.
- **Palettes:** Open the **Tile Palette** window (Window > Tile Palette) and drag your tileset.
- **Tools:**
  - **Brush:** Paint individual tiles.
  - **Bucket:** Fill large areas.
  - **Eraser:** Erase tiles.
- **Layers:** Create multiple layers to have backgrounds and decorations separately.
- **Collisions:** Add the **TilemapCollider2D** Law to generate automatic collisions based on the painted tiles.
