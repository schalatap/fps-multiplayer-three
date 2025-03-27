import * as THREE from 'three';
import { PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_DEPTH } from '../../../shared/base/collidable.js';
// Importar gerador de arma
import { createWeaponMesh } from './weapon-model-generator.js';
import { log } from '../../../shared/utils/logger.js';

// Cache de Materiais
const materialCache = {
    skin: new THREE.MeshStandardMaterial({ color: 0xE0AC69, roughness: 0.8, name: 'SkinMat' }), // Tom de pele mais específico
    hair: new THREE.MeshStandardMaterial({ color: 0x402810, roughness: 0.9, name: 'HairMat' }), // Marrom escuro cabelo
    shirt: new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.7, name: 'ShirtMat' }), // Branco/Cinza claro camisa
    pants: new THREE.MeshStandardMaterial({ color: 0x506070, roughness: 0.7, name: 'PantsMat' }), // Azul/Cinza calça
    shoes: new THREE.MeshStandardMaterial({ color: 0x503010, roughness: 0.8, name: 'ShoesMat' }), // Marrom sapato
    backpack: new THREE.MeshStandardMaterial({ color: 0x705030, roughness: 0.8, name: 'BackpackMat'}) // Mochila
};

/**
 * Cria um modelo 3D low-poly estilizado para o jogador.
 * Retorna um THREE.Group com a base (pés) na origem (0,0,0).
 * @returns {THREE.Group} O grupo contendo as partes do corpo do jogador.
 */
export function createStylizedPlayerModel() {
    const playerGroup = new THREE.Group();
    playerGroup.name = "StylizedPlayerModel";

    // --- Dimensões Proporcionais ---
    // Ajuste estas proporções para refinar o visual
    const headHeight = PLAYER_HEIGHT * 0.2;
    const headWidth = PLAYER_WIDTH * 0.7;
    const headDepth = PLAYER_DEPTH * 0.7;

    const neckHeight = PLAYER_HEIGHT * 0.05;

    const torsoHeight = PLAYER_HEIGHT * 0.4;
    const torsoWidth = PLAYER_WIDTH * 0.9;
    const torsoDepth = PLAYER_DEPTH * 0.7;

    const shoulderWidth = torsoWidth * 1.2; // Ombros um pouco mais largos

    const upperArmLength = PLAYER_HEIGHT * 0.22;
    const lowerArmLength = PLAYER_HEIGHT * 0.20;
    const armRadius = PLAYER_WIDTH * 0.15; // Usaremos cilindros

    const handSize = armRadius * 1.5;

    const upperLegLength = PLAYER_HEIGHT * 0.25;
    const lowerLegLength = PLAYER_HEIGHT * 0.20;
    const legRadius = PLAYER_WIDTH * 0.18;

    const footHeight = PLAYER_HEIGHT * 0.05;
    const footLength = PLAYER_DEPTH * 0.4;
    const footWidth = legRadius * 2.2;

    // --- Posições Y (Relativas à base Y=0) ---
    const footY = footHeight / 2;
    const lowerLegY = footHeight + lowerLegLength / 2;
    const upperLegY = footHeight + lowerLegLength + upperLegLength / 2;
    const torsoY = footHeight + lowerLegLength + upperLegLength + torsoHeight / 2;
    const neckY = footHeight + lowerLegLength + upperLegLength + torsoHeight + neckHeight / 2;
    const headY = footHeight + lowerLegLength + upperLegLength + torsoHeight + neckHeight + headHeight / 2;
    const armY = footHeight + lowerLegLength + upperLegLength + torsoHeight * 0.8; // Ponto de pivô do braço (ombro)

    // --- Geometrias ---
    const headGeo = new THREE.BoxGeometry(headWidth, headHeight, headDepth);
    // Cabelo (caixa simples em cima)
    const hairGeo = new THREE.BoxGeometry(headWidth * 1.1, headHeight * 0.4, headDepth * 1.1);
    const neckGeo = new THREE.CylinderGeometry(headWidth * 0.3, headWidth * 0.3, neckHeight, 8);
    const torsoGeo = new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoDepth);
    const upperArmGeo = new THREE.CylinderGeometry(armRadius, armRadius, upperArmLength, 8);
    const lowerArmGeo = new THREE.CylinderGeometry(armRadius * 0.9, armRadius * 0.9, lowerArmLength, 8);
    const handGeo = new THREE.BoxGeometry(handSize, handSize, handSize);
    const upperLegGeo = new THREE.CylinderGeometry(legRadius, legRadius, upperLegLength, 8);
    const lowerLegGeo = new THREE.CylinderGeometry(legRadius * 0.9, legRadius * 0.9, lowerLegLength, 8);
    const footGeo = new THREE.BoxGeometry(footWidth, footHeight, footLength);
    const backpackGeo = new THREE.BoxGeometry(torsoWidth * 0.8, torsoHeight * 0.7, torsoDepth * 0.5);

    // --- Meshes e Posicionamento ---

    // Cabeça
    const headGroup = new THREE.Group();
    headGroup.name = 'HeadGroup';
    const headMesh = new THREE.Mesh(headGeo, materialCache.skin);
    headMesh.castShadow = true; headMesh.receiveShadow = true; headMesh.userData.bodyPart = 'head';
    headGroup.add(headMesh);
    // Cabelo
    const hairMesh = new THREE.Mesh(hairGeo, materialCache.hair);
    hairMesh.position.y = headHeight * 0.3; // Ajustar para encaixar
    hairMesh.castShadow = true; hairMesh.receiveShadow = false; // Cabelo não precisa receber
    headGroup.add(hairMesh);
    headGroup.position.y = headY;
    playerGroup.add(headGroup);

    // Pescoço
    const neckMesh = new THREE.Mesh(neckGeo, materialCache.skin);
    neckMesh.position.y = neckY;
    neckMesh.castShadow = true; neckMesh.receiveShadow = true;
    playerGroup.add(neckMesh);

    // Torso
    const torsoMesh = new THREE.Mesh(torsoGeo, materialCache.shirt);
    torsoMesh.position.y = torsoY;
    torsoMesh.castShadow = true; torsoMesh.receiveShadow = true; torsoMesh.userData.bodyPart = 'torso';
    playerGroup.add(torsoMesh);

    // Mochila (Anexada ao Torso)
    const backpackMesh = new THREE.Mesh(backpackGeo, materialCache.backpack);
    backpackMesh.position.z = -(torsoDepth / 2 + (torsoDepth * 0.5) / 2); // Atrás do torso
    backpackMesh.position.y = torsoY * 0.95; // Um pouco mais baixo no torso
    backpackMesh.castShadow = true; backpackMesh.receiveShadow = true;
    playerGroup.add(backpackMesh); // Adiciona ao grupo principal

    // Braços (Esquerdo e Direito como Grupos)
    const armOffsetX = shoulderWidth / 2; // Pivô no ombro
    ['left', 'right'].forEach(side => {
        const sideMultiplier = (side === 'left' ? -1 : 1);
        const armGroup = new THREE.Group();
        armGroup.name = `${side}ArmGroup`;
        armGroup.position.set(armOffsetX * sideMultiplier, armY, 0); // Posição do ombro

        // Braço Superior
        const upperArmMesh = new THREE.Mesh(upperArmGeo, materialCache.shirt); // Manga da camisa
        upperArmMesh.position.y = -upperArmLength / 2; // Pivô no topo
        upperArmMesh.rotation.x = Math.PI / 2; // Alinhar cilindro com eixo Y
        upperArmMesh.castShadow = true; upperArmMesh.receiveShadow = true;
        upperArmMesh.userData.bodyPart = `arm_upper_${side[0]}`;
        armGroup.add(upperArmMesh);

        // Antebraço (relativo ao fim do braço superior)
        const lowerArmMesh = new THREE.Mesh(lowerArmGeo, materialCache.skin);
        lowerArmMesh.position.y = -upperArmLength - lowerArmLength / 2;
        lowerArmMesh.rotation.x = Math.PI / 2; // Alinhar cilindro com eixo Y
        lowerArmMesh.castShadow = true; lowerArmMesh.receiveShadow = true;
        lowerArmMesh.userData.bodyPart = `arm_lower_${side[0]}`;
        armGroup.add(lowerArmMesh);

        // Mão
        const handMesh = new THREE.Mesh(handGeo, materialCache.skin);
        handMesh.position.y = -upperArmLength - lowerArmLength - handSize / 2;
        handMesh.castShadow = true; handMesh.receiveShadow = true;
        handMesh.name = `${side}Hand`; // Nome para encontrar e anexar arma
        handMesh.userData.bodyPart = `hand_${side[0]}`;
        armGroup.add(handMesh);

        playerGroup.add(armGroup);
    });

    // Pernas (Esquerda e Direita como Grupos)
    const legOffsetX = legRadius + 0.05;
    ['left', 'right'].forEach(side => {
        const sideMultiplier = (side === 'left' ? -1 : 1);
        const legGroup = new THREE.Group();
        legGroup.name = `${side}LegGroup`;
        legGroup.position.set(legOffsetX * sideMultiplier, 0, 0); // Posição da base da perna

        // Perna Superior
        const upperLegMesh = new THREE.Mesh(upperLegGeo, materialCache.pants);
        upperLegMesh.position.y = upperLegY;
        upperLegMesh.rotation.x = Math.PI / 2; // Alinhar cilindro com eixo Y
        upperLegMesh.castShadow = true; upperLegMesh.receiveShadow = true;
        upperLegMesh.userData.bodyPart = `leg_upper_${side[0]}`;
        legGroup.add(upperLegMesh);

        // Perna Inferior
        const lowerLegMesh = new THREE.Mesh(lowerLegGeo, materialCache.pants);
        lowerLegMesh.position.y = lowerLegY;
        lowerLegMesh.rotation.x = Math.PI / 2; // Alinhar cilindro com eixo Y
        lowerLegMesh.castShadow = true; lowerLegMesh.receiveShadow = true;
        lowerLegMesh.userData.bodyPart = `leg_lower_${side[0]}`;
        legGroup.add(lowerLegMesh);

        // Pé
        const footMesh = new THREE.Mesh(footGeo, materialCache.shoes);
        footMesh.position.y = footY; // Centro do pé
        footMesh.position.z = footLength * 0.1; // Ligeiramente à frente
        footMesh.castShadow = true; footMesh.receiveShadow = true;
        footMesh.userData.bodyPart = `foot_${side[0]}`;
        legGroup.add(footMesh);

        playerGroup.add(legGroup);
    });

    // --- Anexar Arma (Pistola na mão direita) ---
    const rightHand = playerGroup.getObjectByName('rightHand');
    if (rightHand) {
        const weaponMesh = createWeaponMesh('pistol');
        if (weaponMesh) {
            weaponMesh.name = "HeldWeapon";
            weaponMesh.userData.isHeldWeapon = true;
            // Ajustar posição/rotação/escala da arma relativa à mão
            weaponMesh.scale.set(0.4, 0.4, 0.4);
            weaponMesh.position.set(0, -handSize * 0.2, handSize * 0.3);
            weaponMesh.rotation.x = Math.PI / 18;
            weaponMesh.rotation.y = Math.PI / 12;
            rightHand.add(weaponMesh);
            log("[CLIENT] Attached weapon to player's right hand");
        }
    }

    return playerGroup;
}

// Exportar com o nome antigo para compatibilidade
export { createStylizedPlayerModel as createPlayerMesh };