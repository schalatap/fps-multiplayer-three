import * as THREE from 'three';
import { PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_DEPTH } from '../../../shared/base/collidable.js'; // Importar dimensões base

// Cache de Materiais (para não criar materiais repetidamente)
const materialCache = {
    skin: new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.8 }), // Tom de pele
    shirt: new THREE.MeshStandardMaterial({ color: 0x4466ff, roughness: 0.7 }), // Azul
    pants: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 }), // Cinza escuro
};

/**
 * Cria um modelo 3D voxel/low-poly para o jogador usando geometria procedural.
 * Retorna um THREE.Group com a base (pés) na origem (0,0,0).
 * @returns {THREE.Group} O grupo contendo as partes do corpo do jogador.
 */
export function createDetailedPlayerModel() {
    const playerGroup = new THREE.Group();
    playerGroup.name = "VoxelPlayerModel";

    // Dimensões relativas (baseadas nas constantes e estilo voxel)
    const headSize = PLAYER_WIDTH * 0.7;
    const torsoHeight = PLAYER_HEIGHT * 0.45;
    const torsoWidth = PLAYER_WIDTH;
    const torsoDepth = PLAYER_DEPTH * 0.8;
    const armLength = PLAYER_HEIGHT * 0.4;
    const armWidth = PLAYER_WIDTH * 0.25;
    const legHeight = PLAYER_HEIGHT * 0.4;
    const legWidth = PLAYER_WIDTH * 0.3; // Pernas um pouco mais finas que o torso

    // --- Criação das Partes ---

    // Pernas (Duas caixas separadas)
    const legY = legHeight / 2; // Posição Y do centro da perna
    const legOffset = (legWidth / 2) + (PLAYER_WIDTH * 0.1); // Afastamento do centro X

    const legGeo = new THREE.BoxGeometry(legWidth, legHeight, legWidth);

    const leftLegMesh = new THREE.Mesh(legGeo, materialCache.pants);
    leftLegMesh.position.set(-legOffset, legY, 0);
    leftLegMesh.castShadow = true;
    leftLegMesh.receiveShadow = true;
    leftLegMesh.userData.bodyPart = 'leg_l';
    playerGroup.add(leftLegMesh);

    const rightLegMesh = new THREE.Mesh(legGeo, materialCache.pants);
    rightLegMesh.position.set(legOffset, legY, 0);
    rightLegMesh.castShadow = true;
    rightLegMesh.receiveShadow = true;
    rightLegMesh.userData.bodyPart = 'leg_r';
    playerGroup.add(rightLegMesh);

    // Torso
    const torsoY = legHeight + (torsoHeight / 2); // Posição Y do centro do torso
    const torsoGeo = new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoDepth);
    const torsoMesh = new THREE.Mesh(torsoGeo, materialCache.shirt);
    torsoMesh.position.set(0, torsoY, 0);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    torsoMesh.userData.bodyPart = 'torso';
    playerGroup.add(torsoMesh);

    // Cabeça
    const headY = legHeight + torsoHeight + (headSize / 2); // Posição Y do centro da cabeça
    const headGeo = new THREE.BoxGeometry(headSize, headSize, headSize);
    const headMesh = new THREE.Mesh(headGeo, materialCache.skin);
    headMesh.position.set(0, headY, 0);
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    headMesh.userData.bodyPart = 'head';
    playerGroup.add(headMesh);

    // Braços
    const armY = legHeight + torsoHeight - (armLength * 0.3); // Posição Y do centro do braço (um pouco abaixo do topo do torso)
    const armXOffset = (torsoWidth / 2) + (armWidth / 2) + 0.05; // Afastamento do torso
    const armGeo = new THREE.BoxGeometry(armWidth, armLength, armWidth);

    const leftArmMesh = new THREE.Mesh(armGeo, materialCache.skin); // Ou camisa?
    leftArmMesh.position.set(-armXOffset, armY, 0);
    leftArmMesh.castShadow = true;
    leftArmMesh.receiveShadow = true;
    leftArmMesh.userData.bodyPart = 'arm_l';
    playerGroup.add(leftArmMesh);

    const rightArmMesh = new THREE.Mesh(armGeo, materialCache.skin);
    rightArmMesh.position.set(armXOffset, armY, 0);
    rightArmMesh.castShadow = true;
    rightArmMesh.receiveShadow = true;
    rightArmMesh.userData.bodyPart = 'arm_r';
    playerGroup.add(rightArmMesh);

    // O grupo já está com a base (Y=0) nos pés devido ao posicionamento relativo.
    return playerGroup;
}

// Substituir a exportação antiga se necessário
export { createDetailedPlayerModel as createPlayerMesh }; // Exporta com o nome esperado por ClientPlayer