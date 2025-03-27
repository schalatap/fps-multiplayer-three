import * as THREE from 'three';

// Define dimensões padrão para o jogador
const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.4; // Raio para a cápsula ou largura/profundidade para o cubo
const PLAYER_SEGMENTS = 16; // Segmentos para geometrias curvas

/**
 * Cria um mesh simples para representar um jogador.
 * Usa uma cápsula (cilindro com esferas nas pontas) ou um cubo.
 * @returns {THREE.Mesh} O mesh do jogador.
 */
export function createPlayerMesh() {
    // --- Opção 1: Cápsula ---
    // const capsuleHeight = PLAYER_HEIGHT - PLAYER_RADIUS * 2; // Altura da parte cilíndrica
    // const capsuleGeometry = new THREE.CapsuleGeometry(PLAYER_RADIUS, capsuleHeight, PLAYER_SEGMENTS / 2, PLAYER_SEGMENTS);
    // const playerMaterial = new THREE.MeshStandardMaterial({
    //     color: 0x0088ff, // Azul
    //     roughness: 0.6,
    //     metalness: 0.2
    // });
    // const playerMesh = new THREE.Mesh(capsuleGeometry, playerMaterial);
    // // A geometria da cápsula é centralizada na origem por padrão.
    // // Ajustamos a posição do mesh para que a base da cápsula fique em y=0.
    // playerMesh.position.y = PLAYER_HEIGHT / 2;

    // --- Opção 2: Cubo (mais simples para começar) ---
    const boxGeometry = new THREE.BoxGeometry(PLAYER_RADIUS * 2, PLAYER_HEIGHT, PLAYER_RADIUS * 2);
    const playerMaterial = new THREE.MeshStandardMaterial({
        color: Math.random() * 0xffffff, // Cor aleatória para diferenciar
        roughness: 0.7,
        metalness: 0.1
    });
    const playerMesh = new THREE.Mesh(boxGeometry, playerMaterial);
    // O BoxGeometry também é centralizado. Ajustamos para que a base fique em y=0.
    playerMesh.position.y = PLAYER_HEIGHT / 2;

    // Ativar sombras
    playerMesh.castShadow = true;
    playerMesh.receiveShadow = true; // Jogador pode receber sombra de outros objetos

    return playerMesh;
}