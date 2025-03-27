import * as THREE from 'three';
import { log, warn } from '../../../shared/utils/logger.js';
import { Vector3 } from '../../../shared/physics/vector.js'; // Importar Vector3

// --- Cache de Materiais (Opcional mas recomendado) ---
const materialCache = new Map();
function getMaterial(type) {
    if (materialCache.has(type)) {
        return materialCache.get(type);
    }
    let material;
    switch (type) {
        case 'ground':
            material = new THREE.MeshStandardMaterial({ color: 0x55aa55, roughness: 0.9, metalness: 0.0 }); // Verde Grama
            break;
        case 'box':
            material = new THREE.MeshStandardMaterial({ color: 0x9d6a3f, roughness: 0.8, metalness: 0.1 }); // Marrom Madeira/Caixa
            break;
        case 'tree_trunk':
            material = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 }); // Marrom Tronco
            break;
        case 'tree_canopy':
            material = new THREE.MeshStandardMaterial({ color: 0x44aa44, roughness: 0.8 }); // Verde Copa
            break;
        default:
            material = new THREE.MeshStandardMaterial({ color: 0xff00ff }); // Magenta para erro/desconhecido
    }
    materialCache.set(type, material);
    return material;
}
// --- Fim Cache ---

/**
 * Gera o mesh 3D para representar o mapa, incluindo chão, obstáculos, rampas e árvores.
 * @param {import('../../../shared/gameplay/world/map.js').GameMap}
 * @returns {THREE.Group | null}
 */
export function createMapMesh(gameMap) {
    if (!gameMap || !gameMap.minBounds || !gameMap.maxBounds) {
        warn('[CLIENT] Cannot create map mesh: Invalid gameMap data provided.');
        return null;
    }

    log('[CLIENT] Generating expanded map mesh...');
    const mapGroup = new THREE.Group();
    mapGroup.name = "MapMeshGroup";

    try {
        const bounds = gameMap.getBounds();
        const mapWidth = bounds.max.x - bounds.min.x;
        const mapDepth = bounds.max.z - bounds.min.z;
        const floorY = bounds.min.y;

        // --- Chão (Grama) ---
        const floorGeometry = new THREE.PlaneGeometry(mapWidth, mapDepth, 10, 10); // Adiciona segmentos para possível deformação futura
        const floorMaterial = getMaterial('ground');
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        floorMesh.position.set(0, floorY, 0);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.name = "MapFloor";
        floorMesh.receiveShadow = true;
        mapGroup.add(floorMesh);

        // --- Obstáculos, Rampas e Árvores ---
        const obstacles = gameMap.getStaticObstacles();
        log(`[CLIENT] Generating ${obstacles.length} static map elements...`);

        obstacles.forEach((obstacle, index) => {
            if (!obstacle.position || !obstacle.size || !obstacle.type) {
                warn(`[CLIENT] Invalid obstacle data at index ${index}. Skipping.`);
                return;
            }

            let elementMesh = null; // Mesh ou Group a ser adicionado

            try {
                switch (obstacle.type) {
                    case 'box': {
                        const boxGeo = new THREE.BoxGeometry(obstacle.size.x, obstacle.size.y, obstacle.size.z);
                        const boxMat = getMaterial('box');
                        elementMesh = new THREE.Mesh(boxGeo, boxMat);
                        // Posição: Centro da base + metade da altura
                        elementMesh.position.copy(obstacle.position);
                        elementMesh.position.y += obstacle.size.y / 2;
                        // Aplica rotação visual se definida
                        if (obstacle.rotationY) {
                             elementMesh.rotation.y = obstacle.rotationY;
                        }
                        break;
                    }
                    case 'tree': {
                        const treeGroup = new THREE.Group();
                        treeGroup.position.copy(obstacle.position);

                        // --- Dimensões Visuais ---
                        // Usar dimensões que façam sentido visualmente,
                        // independentemente da hitbox de colisão em map.js
                        const visualTrunkRadius = 0.5;
                        const visualTrunkHeight = 4;
                        const visualCanopyRadius = 2.5;
                        // -----------------------

                        // Tronco
                        const trunkGeo = new THREE.CylinderGeometry(visualTrunkRadius * 0.8, visualTrunkRadius, visualTrunkHeight, 8);
                        const trunkMat = getMaterial('tree_trunk');
                        const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
                        trunkMesh.position.y = visualTrunkHeight / 2;
                        trunkMesh.castShadow = true;
                        trunkMesh.receiveShadow = true;
                        treeGroup.add(trunkMesh);

                        // Copa
                        const canopyGeo = new THREE.IcosahedronGeometry(visualCanopyRadius, 1);
                        const canopyMat = getMaterial('tree_canopy');
                        const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
                        // Posicionar copa um pouco acima do tronco
                        canopyMesh.position.y = visualTrunkHeight + visualCanopyRadius * 0.6;
                        canopyMesh.castShadow = true;
                        canopyMesh.receiveShadow = false;
                        treeGroup.add(canopyMesh);

                        elementMesh = treeGroup;
                        break;
                    }
                    default:
                        warn(`[CLIENT] Unknown obstacle type '${obstacle.type}' at index ${index}. Skipping mesh generation.`);
                }

                // Configurações comuns para todos os elementos gerados
                if (elementMesh) {
                    elementMesh.name = `${obstacle.type}_${index}`;
                    elementMesh.castShadow = true;
                    elementMesh.receiveShadow = true;
                    mapGroup.add(elementMesh);
                }

            } catch (elementError) {
                 warn(`[CLIENT] Error creating mesh for element type ${obstacle.type} at index ${index}:`, elementError);
            }
        });

        log(`[CLIENT] Map mesh generation complete.`);
        return mapGroup;

    } catch (error) {
        warn('[CLIENT] Fatal error during map mesh generation:', error);
        return null;
    }
}