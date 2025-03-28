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
                // Dimensões ajustadas para visão em primeira pessoa (estilo CS)
                const bodyLength = 0.25; // Aumentado um pouco
                const bodyHeight = 0.08;
                const bodyWidth = 0.04;
                const gripHeight = 0.12;
                const gripWidth = bodyWidth * 0.9;
                const gripDepth = 0.08;
                const barrelLength = 0.1; // Cano mais longo para visibilidade
                const barrelRadius = bodyWidth * 0.2;

                // Geometrias
                const bodyGeo = new THREE.BoxGeometry(bodyLength, bodyHeight, bodyWidth);
                const gripGeo = new THREE.BoxGeometry(gripDepth, gripHeight, gripWidth);
                const barrelGeo = new THREE.CylinderGeometry(barrelRadius, barrelRadius, barrelLength, 8);

                // Materiais
                const bodyMat = getWeaponMaterial('metal_dark');
                const gripMat = getWeaponMaterial('grip');
                const barrelMat = getWeaponMaterial('metal_grey');

                // --- Meshes e Posicionamento Otimizado para Primeira Pessoa ---
                
                // Corpo/Slide - posicionado para ser visível em primeira pessoa
                const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
                bodyMesh.position.set(0, bodyHeight / 2 + 0.01, -bodyLength / 2);
                bodyMesh.castShadow = true;
                weaponGroup.add(bodyMesh);

                // Cabo/Grip - ajustado para segurar em primeira pessoa
                const gripMesh = new THREE.Mesh(gripGeo, gripMat);
                gripMesh.position.set(0, -gripHeight / 2, gripDepth / 2 - 0.01);
                gripMesh.rotation.x = THREE.MathUtils.degToRad(5); // Inclinação mais sutil
                gripMesh.castShadow = true;
                weaponGroup.add(gripMesh);

                // Cano - mais longo e visível em primeira pessoa
                const barrelMesh = new THREE.Mesh(barrelGeo, barrelMat);
                barrelMesh.rotation.z = Math.PI / 2; // Cilindro deitado no eixo X
                barrelMesh.position.set(0, bodyMesh.position.y - bodyHeight * 0.2, 
                                       bodyMesh.position.z - bodyLength / 2 - barrelLength / 2);
                barrelMesh.castShadow = true;
                weaponGroup.add(barrelMesh);

                // Ajustes adicionais para mira
                weaponGroup.userData.aimPoint = {
                    x: 0,
                    y: bodyMesh.position.y + bodyHeight/4,
                    z: barrelMesh.position.z - barrelLength/2 - 0.05 // Ponto de mira um pouco à frente do cano
                };

                return weaponGroup;

            } catch (error) {
                warn(`[CLIENT] Error creating pistol mesh:`, error);
                return null;
            }

        // Adicionar cases para outras armas aqui...
        
        default:
            warn(`[CLIENT] Unknown weaponType requested for mesh generation: ${weaponType}`);
            return null;
    }
}