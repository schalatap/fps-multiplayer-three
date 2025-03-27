// server/src/managers/game-state-manager.js

import { log, warn } from '../../../shared/utils/logger.js';
import { MovementSystem } from '../../../shared/physics/movement-system.js';
import { CollisionSystem } from '../../../shared/physics/collision-system.js';
import { ServerWorld } from '../gameplay/server-world.js';
import gameMapInstance from '../../../shared/gameplay/world/map.js';
import { Projectile } from '../../../shared/entities/projectile.js';
import { Vector3 } from '../../../shared/physics/vector.js';

export class GameStateManager {
  /** @type {import('./session-manager.js').SessionManager} */
  sessionManager;
  /** @type {MovementSystem} */
  movementSystem;
  /** @type {CollisionSystem} */
  collisionSystem;
  /** @type {ServerWorld} */
  world;
  /** @type {Map<string, Projectile>} */
  projectiles;

  /**
   * @param {import('./session-manager.js').SessionManager} sessionManager
   */
  constructor(sessionManager) {
    if (!sessionManager) throw new Error("GameStateManager requires a SessionManager instance.");

    this.sessionManager = sessionManager;
    this.collisionSystem = new CollisionSystem();
    this.world = new ServerWorld(gameMapInstance);
    
    this.movementSystem = new MovementSystem(
        this.collisionSystem,
        this.world.getMapBounds(),
        this.world.map.getStaticObstacles()
    );
    
    this.projectiles = new Map();
    log('GameStateManager initialized.');

    // --- Configuração do EventEmitter Global Temporário ---
    if (!global.eventEmitter) {
      global.eventEmitter = {
          listeners: {},
          on(event, listener) {
              if (!this.listeners[event]) this.listeners[event] = [];
              this.listeners[event].push(listener);
          },
          emit(event, data) {
              if (this.listeners[event]) {
                  this.listeners[event].forEach(listener => {
                      try { listener(data); } catch(e) { warn(`Error in event listener for ${event}:`, e)}
                  });
              }
          }
      };
       log('Global eventEmitter created (temporary).');
    }
    
    // Garante que os listeners sejam adicionados apenas uma vez
    const existingListeners = global.eventEmitter.listeners['projectileFired'] || [];
    if (!existingListeners.some(fn => fn.name === 'bound addProjectile')) { 
         global.eventEmitter.on('projectileFired', this.addProjectile.bind(this));
         log('Listener for projectileFired added to global eventEmitter.');
    }
  }

  /**
   * Método principal de atualização do estado do jogo.
   * @param {number} deltaTime - Tempo desde o último tick em segundos.
   */
  update(deltaTime) {
    try {
        // 1. Atualizar Jogadores (lógica interna do jogador, incluindo respawn timer e applyInputs)
        const players = this.sessionManager.getAllPlayersArray();
        for (const player of players) {
            player.update(deltaTime); // ServerPlayer.update lida com respawn e inputs
        }

        // 2. Atualizar Projéteis (verificar alcance)
        const projectilesToRemove = [];
        const currentProjectiles = Array.from(this.projectiles.values());
        for (const projectile of currentProjectiles) {
            projectile.update(deltaTime); // Verifica se excedeu o range
            if (projectile.markForRemoval) {
                if (!projectilesToRemove.includes(projectile.id)) {
                    projectilesToRemove.push(projectile.id);
                }
            }
        }

        // 3. Sistema de Movimento e Colisão
        //    - Move jogadores vivos e projéteis ativos.
        //    - MovementSystem internamente usa CollisionSystem para:
        //        - Raycast projétil vs jogador (marcando projéteis para remoção em caso de hit).
        //        - Resolver colisão de todas as entidades movidas com os limites do mundo.
        const alivePlayers = players.filter(p => p.isAlive);
        const movingProjectiles = currentProjectiles.filter(p => !projectilesToRemove.includes(p.id));
        const allMovingEntities = [...alivePlayers, ...movingProjectiles];
        this.movementSystem.update(allMovingEntities, deltaTime, alivePlayers); // Passa jogadores vivos como alvos para raycast

        // 4. Coleta Final de Projéteis para Remover
        //    (Inclui os marcados por range E os marcados por colisão dentro do MovementSystem)
        for (const projectile of movingProjectiles) { // Re-verifica após movementSystem.update
            if (projectile.markForRemoval && !projectilesToRemove.includes(projectile.id)) {
                projectilesToRemove.push(projectile.id);
            }
        }

        // 5. Remover efetivamente os Projéteis marcados
        projectilesToRemove.forEach(id => this.removeProjectile(id));

    } catch (error) {
        warn("[GameStateManager] Error during update:", error);
        // Considerar o que fazer em caso de erro no loop principal
    }
  }

  /**
   * Adiciona um novo projétil ao mundo do jogo. Chamado via evento.
   * @param {object} projectileData - Dados do projétil.
   */
  addProjectile(projectileData) {
    try {
        // Validação básica dos dados recebidos
        if (!projectileData || !projectileData.ownerId || !projectileData.origin || !projectileData.velocity) {
             warn("[GameStateManager] Invalid projectile data received:", projectileData);
             return;
        }
        const originVec = new Vector3(projectileData.origin.x, projectileData.origin.y, projectileData.origin.z);
        const velocityVec = new Vector3(projectileData.velocity.x, projectileData.velocity.y, projectileData.velocity.z);
        const newProjectile = new Projectile(
            projectileData.ownerId,
            originVec,
            velocityVec,
            projectileData.damage || 0, // Default values if missing
            projectileData.speed || 20,
            projectileData.range || 100,
            projectileData.type || 'default'
        );
        this.projectiles.set(newProjectile.id, newProjectile);
        // log(`Projectile ${newProjectile.id} (type: ${newProjectile.projectileType}) added.`); // Log menos verboso
    } catch (error) {
        warn(`[GameStateManager] Failed to add projectile:`, error, projectileData);
    }
  }

  /**
   * Remove um projétil do mundo do jogo.
   * @param {string} projectileId - O ID do projétil a ser removido.
   */
  removeProjectile(projectileId) {
    if (this.projectiles.has(projectileId)) {
        this.projectiles.delete(projectileId);
        // log(`Projectile ${projectileId} removed.`);
    }
  }

  /**
   * Coleta um snapshot do estado atual do jogo para ser enviado aos clientes.
   * @returns {object} Um objeto representando o estado atual do jogo.
   */
  getSnapshot() {
    const playerStates = [];
    // Itera sobre os jogadores gerenciados pelo SessionManager
    for (const player of this.sessionManager.getAllPlayers()) {
        if (player) { // Garante que o jogador existe
             playerStates.push(player.getState());
        }
    }

    const projectileStates = [];
    for (const projectile of this.projectiles.values()) {
        projectileStates.push(projectile.getState());
    }

    return {
        timestamp: Date.now(),
        players: playerStates,
        projectiles: projectileStates,
        // Futuro: adicionar outros estados (itens no mapa, estado do mundo, etc.)
    };
  }
}