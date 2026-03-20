# 🎨 Visual Editors Guide - Creative Engine

Creative Engine includes specialized tools for asset creation and world-building without code.

---

## 🎭 1. Animator Controller (.ceanim)
Manage your characters' state logic.

### Key Concepts
- **States:** Nodes containing an animation clip (.cea).
- **Transitions:** Arrows connecting states under certain conditions.
- **Smart Mode:** If active, the engine automatically chooses the state (Walk, Jump, Idle) based on the Rigidbody2D velocity or Movement component.

### Usage
1. Create an **Animator Controller** asset.
2. Double-click to open the visual editor.
3. Drag `.cea` clips into the graph.
4. Connect states by right-clicking a node and selecting **Create Transition**.

---

## 🦴 2. Skeletal Animation and Skinning
Unlike frame-by-frame animation, skeletal animation allows moving parts of an object fluidly.

- **Bone:** Defines the hierarchical structure.
- **SkeletonRenderer:** Takes an image and deforms it according to bone movement (Skinning).
- **IK (Inverse Kinematics):** Allows moving the end of a chain (like a foot) and having the rest of the bones (leg, knee) adjust automatically.

---

## 🗺️ 3. Tile Palette (.cepalette)
Paint levels quickly using sprite grids.

1. Create a **Tile Palette** asset.
2. Open it and associate a spritesheet or individual images.
3. In the **Palette** window, select a tile.
4. In the scene, use the **Brush (B)** to paint or the **Eraser (N)** to erase.

---

## 🖼️ 4. Sprite Editor (Slicer)
Extract individual frames from a large image.

- **Automatic:** Carl IA automatically detects sprite boundaries.
- **Grid:** Divide by cell size (e.g., 32x32) or by row/column count.
- **Pivot:** Defines the center of rotation and position of the sprite.

---

## ⛰️ 5. 2D Terrain Editor
Paint organic floor and wall shapes with custom textures.

- **Layers:** You can have multiple overlapping textures.
- **Collisions:** The **TerrenoCollider2D** component automatically generates the physical shape of what you've painted.

---

## 🍱 6. UI Editor
Create menus and HUDs by dragging elements. **Layout Group** components help keep everything organized automatically.

- **UITransform:** Replaces the traditional Transform for UI elements, allowing the use of anchors and pivots for responsive design.

---

## 🎞️ 7. VidSpri: Video to Sprite Converter
Integrated tool to convert video files into optimized sprite sheets or image sequences. Access from **Window > Vid Spri**.
