// client/src/generation/weapon-model-generator.js
import * as THREE from 'three';
import { log, warn } from '../../../shared/utils/logger.js';

// Cache de Materiais (similar aos outros geradores)
const materialCache = new Map();
function getWeaponMaterial(type) {
    if (materialCache.has(type)) {
        return materialCache.get(type);
    }
    let material;
    switch (type) {
        case 'metal_dark':
            material = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.8 });
            break;
        case 'metal_grey':
            material = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6, metalness: 0.7 });
            break;
        case 'grip':
            material = new THREE.MeshStandardMaterial({ color: 0x503820, roughness: 0.8 }); // Marrom escuro
            break;
        default:
            material = new THREE.MeshStandardMaterial({ color: 0xff00ff }); // Magenta para erro
    }
    materialCache.set(type, material);
    return material;
}

/**
 * Cria um mesh procedural simples para uma arma.
 * @param {string} [weaponType='pistol'] - O tipo da arma a ser criada (ex: 'pistol').
 * @returns {THREE.Group | null} Um grupo contendo as partes da arma, ou null.
 *                                A origem (0,0,0) do grupo é o ponto de "empunhadura".
 */
export function createWeaponMesh(weaponType = 'pistol') {
    log(`[CLIENT] Generating mesh for weapon type: ${weaponType}`);
    const weaponGroup = new THREE.Group();
    weaponGroup.name = `${weaponType}Model`;

    switch (weaponType.toLowerCase()) {
        case 'pistol':
            try {
                // Dimensões relativas (ajuste conforme necessário)
                const bodyLength = 0.2;
                const bodyHeight = 0.08;
                const bodyWidth = 0.04;
                const gripHeight = 0.12;
                const gripWidth = bodyWidth * 0.9;
                const gripDepth = 0.08;
                const barrelLength = 0.05;
                const barrelRadius = bodyWidth * 0.2;

                // Geometrias
                const bodyGeo = new THREE.BoxGeometry(bodyLength, bodyHeight, bodyWidth);
                const gripGeo = new THREE.BoxGeometry(gripDepth, gripHeight, gripWidth);
                const barrelGeo = new THREE.CylinderGeometry(barrelRadius, barrelRadius, barrelLength, 8);

                // Materiais
                const bodyMat = getWeaponMaterial('metal_dark');
                const gripMat = getWeaponMaterial('grip');
                const barrelMat = getWeaponMaterial('metal_grey');

                // --- Meshes e Posicionamento Relativo à Origem do Grupo (Empunhadura) ---
                // A origem Y=0 estará na parte superior do cabo.
                // A origem Z=0 estará na parte traseira do corpo/slide.
                // A origem X=0 estará no centro.

                // Corpo/Slide (um pouco à frente e acima da origem)
                const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
                bodyMesh.position.set(0, bodyHeight / 2 + 0.01, -bodyLength / 2 + 0.01); // Centrado X, acima da origem Y, frente da origem Z
                bodyMesh.castShadow = true;
                weaponGroup.add(bodyMesh);

                // Cabo/Grip (abaixo e ligeiramente atrás da origem Y/Z)
                const gripMesh = new THREE.Mesh(gripGeo, gripMat);
                gripMesh.position.set(0, -gripHeight / 2, gripDepth / 2 - 0.02); // Centrado X, abaixo da origem Y, parte traseira alinhada com a origem Z
                gripMesh.rotation.x = THREE.MathUtils.degToRad(10); // Leve inclinação para trás
                gripMesh.castShadow = true;
                weaponGroup.add(gripMesh);

                // Cano (à frente do corpo)
                const barrelMesh = new THREE.Mesh(barrelGeo, barrelMat);
                barrelMesh.rotation.z = Math.PI / 2; // Cilindro deitado no eixo X
                barrelMesh.position.set(0, bodyMesh.position.y - bodyHeight * 0.3, bodyMesh.position.z - bodyLength / 2 - barrelLength / 2); // Alinhado abaixo e à frente do corpo
                barrelMesh.castShadow = true;
                weaponGroup.add(barrelMesh);

                return weaponGroup;

            } catch (error) {
                warn(`[CLIENT] Error creating pistol mesh:`, error);
                return null;
            }

        // Adicionar cases para outras armas aqui...
        // case 'rifle':
        //     // ... criar geometria do rifle ...
        //     return rifleGroup;

        default:
            warn(`[CLIENT] Unknown weaponType requested for mesh generation: ${weaponType}`);
            return null;
    }
}