// client/src/managers/scene-manager.js
import { log, warn } from '../../../shared/utils/logger.js';

// Tipos para JSDoc
/** @typedef {import('../gameplay/client-world.js').ClientWorld} ClientWorld */
/** @typedef {import('../core/renderer.js').Renderer} Renderer */
/** @typedef {import('../gameplay/client-player.js').ClientPlayer} ClientPlayer */
/** @typedef {import('../gameplay/client-projectile.js').ClientProjectile} ClientProjectile */
/** @typedef {import('three').Scene} Scene */
/** @typedef {import('three').Mesh} Mesh */
/** @typedef {import('three').Group} Group */

/**
 * Gerencia a adição e remoção de objetos 3D (meshes) na cena do Renderer,
 * baseado nas entidades presentes no ClientWorld. Também controla visibilidade.
 */
export class SceneManager {
    /** @type {ClientWorld} */
    clientWorld;
    /** @type {Renderer} */
    renderer;

    /** @type {Set<string>} - IDs dos meshes de JOGADOR atualmente na cena */
    playerMeshesInScene;
    /** @type {Set<string>} - IDs dos meshes de PROJÉTIL atualmente na cena */
    projectileMeshesInScene;

    /**
     * @param {ClientWorld} clientWorld
     * @param {Renderer} renderer
     */
    constructor(clientWorld, renderer) {
        if (!clientWorld) throw new Error("SceneManager requires ClientWorld.");
        if (!renderer) throw new Error("SceneManager requires Renderer.");

        this.clientWorld = clientWorld;
        this.renderer = renderer;
        this.playerMeshesInScene = new Set();
        this.projectileMeshesInScene = new Set();
        log('[CLIENT] SceneManager initialized.');
    }

    /**
     * Atualiza a cena a cada frame, sincronizando meshes com entidades.
     */
    update() {
        const scene = this.renderer.scene;
        this.syncMeshes(
            this.clientWorld.getAllPlayersArray(), // Entidades atuais
            this.playerMeshesInScene,             // Set de controle
            scene,                                // Cena Three.js
            true                                  // Flag para indicar que é jogador (controla visibilidade)
        );
        this.syncMeshes(
            this.clientWorld.getAllProjectilesArray(), // Entidades atuais
            this.projectileMeshesInScene,              // Set de controle
            scene,                                     // Cena Three.js
            false                                      // Flag para indicar que não é jogador
        );
    }

    /**
     * Função genérica para sincronizar meshes de um tipo de entidade com a cena.
     * @param {(ClientPlayer[] | ClientProjectile[])} currentEntities - Array das entidades atuais no ClientWorld.
     * @param {Set<string>} meshesInSceneSet - O Set que rastreia os IDs dos meshes na cena.
     * @param {Scene} scene - A cena Three.js.
     * @param {boolean} manageVisibility - Se true, gerencia mesh.visible baseado em entity.isAlive (para jogadores).
     */
    syncMeshes(currentEntities, meshesInSceneSet, scene, manageVisibility) {
        const currentEntityIds = new Set();

        // 1. Adicionar/Atualizar meshes existentes e controlar visibilidade
        for (const entity of currentEntities) {
            currentEntityIds.add(entity.id);

            if (entity.mesh) { // Verifica se a entidade tem um mesh
                // Adiciona à cena se for novo
                if (!meshesInSceneSet.has(entity.id)) {
                    entity.addToScene(scene); // Usa o método da entidade
                    meshesInSceneSet.add(entity.id);
                }

                // Gerencia visibilidade (específico para jogadores)
                if (manageVisibility && 'isAlive' in entity) {
                    // Verifica se a propriedade isAlive existe e a usa
                     entity.mesh.visible = (entity).isAlive;
                } else if (manageVisibility) {
                     // Se manageVisibility é true mas isAlive não existe, assume visível
                     entity.mesh.visible = true;
                }
                // Se manageVisibility é false (ex: projéteis), não mexe na visibilidade aqui

            } else {
                 // Loga um aviso se a entidade deveria ter um mesh mas não tem
                 // Evita logar isso a cada frame, talvez só uma vez?
                 // warn(`[CLIENT] Entity ${entity.id} exists in world but has no mesh.`);
            }
        }

        // 2. Remover meshes de entidades que não existem mais
        const meshesToRemove = new Set(meshesInSceneSet); // Copia o set atual
        meshesInSceneSet.forEach(entityId => {
             if (!currentEntityIds.has(entityId)) {
                 meshesToRemove.add(entityId); // Garante que esteja na lista de remoção
             } else {
                  meshesToRemove.delete(entityId); // Remove da lista de remoção se ainda existe
             }
        });


        meshesToRemove.forEach(entityIdToRemove => {
            // Encontra o mesh na cena para remover e fazer dispose
            // Tenta encontrar pelo UUID primeiro (se ClientPlayer/Projectile setou mesh.uuid = entity.id)
             let meshToRemove = scene.getObjectByProperty('uuid', entityIdToRemove);

             // Se não encontrou por UUID, tenta por userData (como fallback ou alternativa)
            // if (!meshToRemove) {
            //      meshToRemove = this.findMeshByUserData(scene, entityIdToRemove);
            // }


            if (meshToRemove) {
                scene.remove(meshToRemove);
                this.disposeMeshResources(meshToRemove); // Limpa recursos GPU
                log(`[CLIENT] Removed and disposed mesh for entity ${entityIdToRemove}.`);
            } else {
                 // Se o mesh não foi encontrado na cena, apenas remove do Set de controle
                 warn(`[CLIENT] Mesh for entity ${entityIdToRemove} not found in scene for removal, removing from tracking set.`);
            }
            meshesInSceneSet.delete(entityIdToRemove); // Remove do Set de controle
        });
    }


    /**
     * Libera recursos de geometria e material de um mesh.
     * @param {Mesh | Group} mesh
     */
     disposeMeshResources(mesh) {
        if (!mesh) return;

        if (mesh.geometry) {
            mesh.geometry.dispose();
        }
        if (mesh.material) {
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(material => {
                    material.map?.dispose(); // Dispose de texturas se houver
                    material.dispose();
                });
            } else {
                mesh.material.map?.dispose();
                mesh.material.dispose();
            }
        }
        // Se for um Group, pode ter filhos para limpar recursivamente
        if (mesh.children && mesh.children.length > 0) {
             mesh.children.forEach(child => this.disposeMeshResources(child));
        }
    }

    /**
     * (Alternativa/Fallback para encontrar mesh se UUID não for usado/confiável)
     * Encontra um mesh na cena pelo ID da entidade guardado em userData.
     * @param {Scene} scene
     * @param {string} entityId
     * @returns {Mesh | Group | null}
     */
    // findMeshByUserData(scene, entityId) {
    //    for (const child of scene.children) {
    //        if (child.userData?.entityId === entityId) {
    //            return child;
    //        }
    //    }
    //    return null;
    // }
}