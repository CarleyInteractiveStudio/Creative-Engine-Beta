// js/editor/WeightPainter.js
import * as Components from '../engine/Components.js';

export class WeightPainter {
    constructor(sceneView) {
        this.sceneView = sceneView;
        this.active = false;
        this.selectedBone = null;
        this.brushSize = 50;
        this.strength = 0.5;
        this.mode = 'add'; // 'add', 'subtract'
    }

    paint(worldPos, skeletonRenderer) {
        if (!skeletonRenderer || !this.selectedBone) return;

        const mesh = skeletonRenderer.mesh;
        const weights = mesh.weights;
        const vertices = mesh.vertices;

        // Transform worldPos to local space of the SkeletonRenderer
        const transform = skeletonRenderer.materia.getComponentByName('Transform');
        const relX = worldPos.x - transform.x;
        const relY = worldPos.y - transform.y;
        const rad = -transform.rotation * Math.PI / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);

        const localX = (relX * cos - relY * sin) / (transform.scale.x || 1);
        const localY = (relX * sin + relY * cos) / (transform.scale.y || 1);

        const boneIndex = skeletonRenderer.bones.indexOf(this.selectedBone);
        if (boneIndex === -1) return;

        let changed = false;
        for (let i = 0; i < weights.length; i++) {
            const vx = vertices[i * 2];
            const vy = vertices[i * 2 + 1];

            // Distance in world units (accounting for object scale)
            const dx = (vx - localX) * (transform.scale.x || 1);
            const dy = (vy - localY) * (transform.scale.y || 1);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.brushSize) {
                const falloff = 1 - (dist / this.brushSize);
                const delta = falloff * this.strength;

                let weightEntry = weights[i].find(w => w.boneIndex === boneIndex);
                if (!weightEntry) {
                    weightEntry = { boneIndex: boneIndex, weight: 0 };
                    weights[i].push(weightEntry);
                }

                if (this.mode === 'add') {
                    weightEntry.weight = Math.min(1, weightEntry.weight + delta);
                } else {
                    weightEntry.weight = Math.max(0, weightEntry.weight - delta);
                }

                this.normalizeWeights(weights[i]);
                changed = true;
            }
        }

        if (changed) {
            skeletonRenderer.isDirty = true;
        }
    }

    normalizeWeights(vertexWeights) {
        let total = 0;
        vertexWeights.forEach(w => total += w.weight);
        if (total > 0) {
            vertexWeights.forEach(w => w.weight /= total);
        } else {
            // If no weight, assign 1 to first bone to avoid invisible vertices
            vertexWeights[0].weight = 1;
        }
    }

    drawBrush(ctx, worldPos, zoom) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(worldPos.x, worldPos.y, this.brushSize, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2 / zoom;
        ctx.stroke();

        ctx.fillStyle = this.mode === 'add' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)';
        ctx.fill();
        ctx.restore();
    }
}
