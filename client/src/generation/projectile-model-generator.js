import * as THREE from 'three';

// Cache de geometrias e materiais para reutilização (otimização)
const geometryCache = new Map();
const materialCache = new Map();

/**
 * Cria ou obtém do cache uma geometria para um tipo de projétil.
 * @param {string} type - Tipo do projétil (ex: 'pistol_bullet', 'fireball').
 * @param {number} [size=0.1] - Tamanho característico do projétil.
 * @returns {THREE.BufferGeometry}
 */
function getProjectileGeometry(type, size = 0.1) {
    const key = `${type}_${size}`;
    if (geometryCache.has(key)) {
        return geometryCache.get(key);
    }

    let geometry;
    switch (type) {
        case 'fireball': // Exemplo futuro
            geometry = new THREE.SphereGeometry(size * 1.5, 8, 8); // Maior e menos detalhado
            break;
        case 'pistol_bullet':
        default:
            geometry = new THREE.SphereGeometry(size, 6, 6); // Pequena esfera
            // Poderia ser uma BoxGeometry ou CapsuleGeometry também
            // geometry = new THREE.BoxGeometry(size, size, size * 2); // Balas mais alongadas
            break;
    }
    geometryCache.set(key, geometry);
    return geometry;
}

/**
 * Cria ou obtém do cache um material para um tipo de projétil.
 * @param {string} type - Tipo do projétil.
 * @returns {THREE.Material}
 */
function getProjectileMaterial(type) {
    if (materialCache.has(type)) {
        return materialCache.get(type);
    }

    let material;
    switch (type) {
        case 'fireball':
            material = new THREE.MeshBasicMaterial({ color: 0xff8800 }); // Laranja brilhante
            break;
        case 'pistol_bullet':
        default:
            material = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Amarelo brilhante
            break;
    }
    // MeshBasicMaterial não é afetado por luz, bom para projéteis visíveis
    // Poderia usar MeshStandardMaterial se quisesse sombras/luz

    materialCache.set(type, material);
    return material;
}


/**
 * Cria um mesh simples para representar um projétil com base no seu tipo.
 * @param {string} type - O tipo do projétil (ex: 'pistol_bullet').
 * @param {number} [size=0.1] - O tamanho base do projétil.
 * @returns {THREE.Mesh} O mesh do projétil.
 */
export function createProjectileMesh(type = 'default', size = 0.1) {
    const geometry = getProjectileGeometry(type, size);
    const material = getProjectileMaterial(type);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `ProjectileMesh_${type}`;

    // Projéteis geralmente não lançam nem recebem sombras, mas pode ser ativado se necessário
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    return mesh;
}