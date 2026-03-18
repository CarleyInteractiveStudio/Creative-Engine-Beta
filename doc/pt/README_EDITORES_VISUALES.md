# 🎨 Visual Editor Guide: Animator, Tiles, and Sprites - Creative Engine

Creative Engine includes specialized tools for asset creation and world-building.

---

## 🎭 1. Animator Controller (.ceanim)
Manage the character's states (Idling, Running, Jumping).
- **States:** Individual animation clips.
- **Transitions:** Arrows connecting states.
- **Entry State:** The starting animation when the game begins.

### Creating Transitions
Right-click an animation node and select **Create Transition**. Click another node to connect them.

---

## 🗺️ 2. Tile Palette (.cepalette)
Paint levels using grids of sprites.
- **Brush (B):** Paint tiles on the map.
- **Bucket (G):** Fill areas.
- **Eraser (N):** Remove tiles.

### Setup
Create a `.cepalette` asset, open it, and associate a **Spritesheet** to extract tiles.

---

## 🖼️ 3. Sprite Editor (Slicer)
Extract individual frames from a single large image.
- **Automatic:** Carl IA finds objects in the image.
- **Grid by Cell Size:** Divide by fixed dimensions (e.g., 64x64).
- **Grid by Cell Count:** Divide into specific rows and columns.

### Pivot Points
Define where the "origin" of the sprite is (Center, Bottom, etc.).

---

## 🎬 4. Animation Editor (.cea)
Create traditional or skeletal 2D animations.
- **Frame-by-Frame:** Each frame is a new image.
- **Skeletal (Bones):** Move bones to animate a single mesh.
