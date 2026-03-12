// js/editor/SkeletonImporter.js
import * as Components from '../engine/Components.js';
import { Materia } from '../engine/Materia.js';

export async function importSpineJSON(jsonContent, targetMateria, projectsDirHandle) {
    const data = JSON.parse(jsonContent);
    const scene = targetMateria.scene || window.SceneManager.currentScene;
    const skeletonRenderers = [];

    // 1. Create Bones
    const boneMap = new Map(); // name -> Materia
    if (data.bones) {
        for (const boneData of data.bones) {
            const boneMtr = new Materia(boneData.name);
            boneMtr.addComponent(new Components.Transform(boneMtr));
            const boneComp = new Components.Bone(boneMtr);
            boneComp.length = boneData.length || 50;
            boneMtr.addComponent(boneComp);

            const trans = boneMtr.getComponentByName('Transform');
            trans.localPosition = { x: boneData.x || 0, y: -(boneData.y || 0) }; // Spine Y is up
            trans.localRotation = -(boneData.rotation || 0);

            boneMap.set(boneData.name, boneMtr);
        }

        // Setup Hierarchy
        for (const boneData of data.bones) {
            if (boneData.parent) {
                const child = boneMap.get(boneData.name);
                const parent = boneMap.get(boneData.parent);
                if (child && parent) {
                    child.setParent(parent, false);
                }
            } else {
                boneMap.get(boneData.name).setParent(targetMateria, false);
            }
        }
    }

    // 2. Process Animations
    const animations = [];
    if (data.animations) {
        for (const animName in data.animations) {
            const spineAnim = data.animations[animName];
            const ceAnim = {
                name: animName,
                type: 'skeletal',
                duration: 0,
                keyframes: []
            };

            const timePoints = new Set();
            if (spineAnim.bones) {
                for (const boneName in spineAnim.bones) {
                    const timeline = spineAnim.bones[boneName];
                    if (timeline.rotate) timeline.rotate.forEach(k => timePoints.add(k.time));
                    if (timeline.translate) timeline.translate.forEach(k => timePoints.add(k.time));
                    if (timeline.scale) timeline.scale.forEach(k => timePoints.add(k.time));
                }
            }

            const sortedTimes = Array.from(timePoints).sort((a, b) => a - b);
            ceAnim.duration = sortedTimes[sortedTimes.length - 1] || 1.0;

            for (const time of sortedTimes) {
                const frameData = {};
                for (const [boneName, boneMtr] of boneMap) {
                    const spineBoneAnim = spineAnim.bones ? spineAnim.bones[boneName] : null;
                    const trans = boneMtr.getComponentByName('Transform');

                    // Default from bind pose
                    let pos = { ...trans.localPosition };
                    let rot = trans.localRotation;
                    let scale = { ...trans.localScale };

                    if (spineBoneAnim) {
                        if (spineBoneAnim.rotate) {
                            rot -= interpolateSpineTimeline(spineBoneAnim.rotate, time, 'angle');
                        }
                        if (spineBoneAnim.translate) {
                            pos.x += interpolateSpineTimeline(spineBoneAnim.translate, time, 'x');
                            pos.y -= interpolateSpineTimeline(spineBoneAnim.translate, time, 'y');
                        }
                        if (spineBoneAnim.scale) {
                            scale.x *= interpolateSpineTimeline(spineBoneAnim.scale, time, 'x', 1);
                            scale.y *= interpolateSpineTimeline(spineBoneAnim.scale, time, 'y', 1);
                        }
                    }

                    // Use Name instead of ID for animation keys
                    frameData[boneName] = { pos, rot, scale };
                }
                ceAnim.keyframes.push({ time, data: frameData });
            }
            animations.push(ceAnim);
        }
    }

    // 3. Process Skins / Attachments (Basic version: creates SpriteRenderers)
    if (data.skins && data.skins.length > 0) {
        const defaultSkin = data.skins[0];
        if (defaultSkin.attachments) {
            for (const slotName in defaultSkin.attachments) {
                const attachments = defaultSkin.attachments[slotName];
                const boneName = findBoneForSlot(data.slots, slotName);
                const parentMtr = boneMap.get(boneName) || targetMateria;

                for (const attName in attachments) {
                    const att = attachments[attName];
                    if (att.type === 'region' || !att.type) {
                        const spriteMtr = new Materia(att.name || attName);
                        spriteMtr.addComponent(new Components.Transform(spriteMtr));
                        const sr = new Components.SpriteRenderer(spriteMtr);

                        // We assume the image file matches the attachment name/path
                        const imgPath = att.path || att.name || attName;
                        sr.source = `Assets/${imgPath}.png`;

                        spriteMtr.addComponent(sr);

                        const sTrans = spriteMtr.getComponentByName('Transform');
                        sTrans.localPosition = { x: att.x || 0, y: -(att.y || 0) };
                        sTrans.localRotation = -(att.rotation || 0);
                        sTrans.localScale = { x: att.scaleX || 1, y: att.scaleY || 1 };

                        spriteMtr.setParent(parentMtr, false);
                    } else if (att.type === 'mesh') {
                        const meshMtr = new Materia(att.name || attName);
                        meshMtr.addComponent(new Components.Transform(meshMtr));
                        const skel = new Components.SkeletonRenderer(meshMtr);

                        // Parse Spine Mesh Data
                        const vertices = [];
                        const weights = [];
                        const uvs = att.uvs || [];
                        const indices = att.triangles || [];

                        // Spine weighted vertices are stored as [boneCount, boneIndex, x, y, weight, ...]
                        if (att.vertices.length > att.uvs.length) {
                            let vIdx = 0;
                            for (let i = 0; i < uvs.length / 2; i++) {
                                const boneCount = att.vertices[vIdx++];
                                const vertexWeights = [];
                                for (let b = 0; b < boneCount; b++) {
                                    vertexWeights.push({
                                        boneIndex: att.vertices[vIdx++],
                                        x: att.vertices[vIdx++],
                                        y: -att.vertices[vIdx++],
                                        weight: att.vertices[vIdx++]
                                    });
                                }
                                weights.push(vertexWeights);
                                // For the bind-pose vertex, we just use 0,0 and let the skinning handle it
                                vertices.push(0, 0);
                            }
                        } else {
                            // Simple mesh (no weights/bones mentioned in vertex array)
                            for(let i=0; i<att.vertices.length; i+=2) {
                                vertices.push(att.vertices[i], -att.vertices[i+1]);
                                weights.push([{ boneIndex: 0, weight: 1.0 }]); // Default to first bone
                            }
                        }

                        skel.mesh = { vertices, uvs, indices, weights };
                        skel.bones = Array.from(boneMap.keys()); // Use all bones as reference
                        skel.source = `Assets/${att.path || att.name || attName}.png`;

                        meshMtr.addComponent(skel);
                        meshMtr.setParent(parentMtr, false);
                        skeletonRenderers.push(skel);
                    }
                }
            }
        }
    }

    // 4. Automatically capture Bind Poses
    // Wait a frame or ensure transforms are calculated
    for (const skel of skeletonRenderers) {
        skel.bindPoses = skel.bones.map(boneName => {
            const boneMtr = boneMap.get(boneName);
            if (!boneMtr) return null;
            const t = boneMtr.getComponentByName('Transform');
            if (!t) return null;
            // Since we just built the hierarchy, world transforms might not be updated.
            // But we can calculate them manually or assume they are at origin for now.
            // In a more robust engine, we'd wait for a scene update.
            return {
                x: boneMtr.x,
                y: boneMtr.y,
                rotation: boneMtr.rotation,
                scale: { ...boneMtr.scale }
            };
        });
    }

    return { boneMap, animations };
}

function findBoneForSlot(slots, slotName) {
    if (!slots) return null;
    const slot = slots.find(s => s.name === slotName);
    return slot ? slot.bone : null;
}

function interpolateSpineTimeline(timeline, time, prop, defaultValue = 0) {
    if (!timeline || timeline.length === 0) return defaultValue;

    // Exact match
    const exact = timeline.find(k => Math.abs(k.time - time) < 0.001);
    if (exact) return exact[prop] !== undefined ? exact[prop] : defaultValue;

    // Find surrounding keys
    let k1 = null, k2 = null;
    for (let i = 0; i < timeline.length; i++) {
        if (timeline[i].time > time) {
            k2 = timeline[i];
            k1 = timeline[i - 1];
            break;
        }
    }

    if (!k2) return timeline[timeline.length - 1][prop] !== undefined ? timeline[timeline.length - 1][prop] : defaultValue;
    if (!k1) return k2[prop] !== undefined ? k2[prop] : defaultValue;

    const t = (time - k1.time) / (k2.time - k1.time);
    const v1 = k1[prop] !== undefined ? k1[prop] : defaultValue;
    const v2 = k2[prop] !== undefined ? k2[prop] : defaultValue;

    return v1 + (v2 - v1) * t;
}
