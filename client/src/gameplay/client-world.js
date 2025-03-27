import { ClientPlayer } from './client-player.js';
import { ClientProjectile } from './client-projectile.js';
import { log, warn } from '../../../shared/utils/logger.js';
// Importar tipos para JSDoc
// import type { InputController } from '../core/input-controller.js';
// import type { CollisionSystem } from '../../../shared/physics/collision-system.js';
// import type { GameMap } from '../../../shared/gameplay/world/map.js';

/**
 * Gerencia a representação do mundo do jogo no cliente, incluindo todos os jogadores
 * e outras entidades, com base nos dados recebidos do servidor.
 */
export class ClientWorld {
  /**
   * Mapa que armazena as instâncias de ClientPlayer, usando o ID do jogador como chave.
   * @type {Map<string, ClientPlayer>}
   */
  players;

  /**
   * Mapa que armazena as instâncias de ClientProjectile. (Tarefa 3)
   * @type {Map<string, ClientProjectile>}
   */
  projectiles;
  
  /**
   * Fila de eventos de impacto a serem processados pelo renderizador
   * @type {Array<{id: string, position: number[], surfaceType: string, obstacleType: string|null, timeAdded: number}>}
   */
  impactEvents;

  /**
   * Cria uma instância do ClientWorld.
   */
  constructor() {
    this.players = new Map();
    this.projectiles = new Map();
    this.impactEvents = [];
    log('[CLIENT] ClientWorld initialized.');
  }
  
  /**
   * Adiciona um novo evento de impacto à fila
   * @param {string} projectileId - ID do projétil
   * @param {number[]} position - Posição do impacto [x,y,z]
   * @param {string} surfaceType - Tipo de superfície atingida ('player'|'static')
   * @param {string|null} obstacleType - Tipo de obstáculo (se aplicável)
   */
  addImpactEvent(projectileId, position, surfaceType, obstacleType = null) {
    this.impactEvents.push({
      id: projectileId,
      position: position,
      surfaceType: surfaceType,
      obstacleType: obstacleType,
      timeAdded: Date.now()
    });
    
    // Remove o projétil do mundo cliente imediatamente
    this.projectiles.delete(projectileId);
  }
  
  /**
   * Obtém e limpa a fila de eventos de impacto
   * @returns {Array} Lista de eventos de impacto
   */
  getAndClearImpactEvents() {
    const events = [...this.impactEvents];
    this.impactEvents = [];
    return events;
  }

  /**
   * Atualiza o estado do mundo do cliente com base em um snapshot recebido do servidor.
   * Cria, atualiza ou remove entidades conforme necessário.
   * @param {import('../../../shared/models/game-state.js').GameState} gameState - O snapshot do estado do jogo vindo do servidor.
   */
  updateFromState(gameState) {
    if (!gameState || !gameState.players) {
      warn('[CLIENT] Received invalid game state snapshot.');
      return;
    }

    const incomingPlayerIds = new Set();
    const serverTimestamp = gameState.timestamp; // Extrai o timestamp aqui

    // 1. Atualizar ou criar jogadores existentes no snapshot
    for (const playerState of gameState.players) {
      incomingPlayerIds.add(playerState.id);
      const existingPlayer = this.players.get(playerState.id);

      if (existingPlayer) {
        // Jogador já existe, atualiza seu estado
        existingPlayer.updateState(playerState, serverTimestamp);
      } else {
        // Novo jogador, cria e adiciona ao mapa
        try {
            // Passa o estado inicial, o construtor lidará com os timestamps iniciais
            const newPlayer = new ClientPlayer(playerState);
            this.players.set(newPlayer.id, newPlayer);
            // Evento/callback para notificar SceneManager (Etapa 8)
            // this.emit('playerAdded', newPlayer);
        } catch(error) {
             warn(`[CLIENT] Failed to create ClientPlayer for ID ${playerState.id}:`, error);
        }
      }
    }

    // 2. Remover jogadores locais que não estão mais no snapshot (desconectaram)
    for (const [playerId, player] of this.players.entries()) {
      if (!incomingPlayerIds.has(playerId)) {
        log(`[CLIENT] Removing player ${playerId} (not in snapshot).`);
        // Evento/callback para notificar SceneManager para remover o mesh (Etapa 8)
        // this.emit('playerRemoved', player);
        this.players.delete(playerId);
        // A remoção do mesh da cena será feita pelo SceneManager
      }
    }

    // --- Atualização Projéteis (Tarefa 3) ---
    const incomingProjectileIds = new Set();
    if (gameState.projectiles) { // Verifica se existem projéteis no estado
        for (const projectileState of gameState.projectiles) {
            if (!projectileState || !projectileState.id) continue; // Pula dados inválidos

            incomingProjectileIds.add(projectileState.id);
            const existingProjectile = this.projectiles.get(projectileState.id);

            if (existingProjectile) {
                // Projétil existe, atualiza estado
                existingProjectile.updateState(projectileState, serverTimestamp);
            } else {
                // Novo projétil, cria e adiciona
                try {
                    // Passa o estado inicial (que já contém id, ownerId, position, type)
                    const newProjectile = new ClientProjectile(projectileState);
                    this.projectiles.set(newProjectile.id, newProjectile);
                    // log(`[CLIENT] Created ClientProjectile ${newProjectile.id}`);
                } catch (error) {
                    warn(`[CLIENT] Failed to create ClientProjectile for ID ${projectileState.id}:`, error);
                }
            }
        }
    }

    // Remover projéteis locais que não estão mais no snapshot
    for (const projectileId of this.projectiles.keys()) {
        if (!incomingProjectileIds.has(projectileId)) {
            // log(`[CLIENT] Removing projectile ${projectileId} (not in snapshot).`);
            // Notificar SceneManager para remover mesh (feito no SceneManager.update)
            this.projectiles.delete(projectileId);
        }
    }
  }

  /**
   * Atualiza todas as entidades gerenciadas no mundo do cliente.
   * @param {number} deltaTime
   * @param {import('../core/input-controller.js').InputController | null} inputController - Necessário para a predição local.
   * @param {import('../../../shared/physics/collision-system.js').CollisionSystem | null} collisionSystem - Necessário para a predição local.
   * @param {import('../../../shared/gameplay/world/map.js').GameMap | null} gameMap - Necessário para a predição local.
   */
  update(deltaTime, inputController, collisionSystem, gameMap) {
    // Atualiza todos os jogadores
    for (const player of this.players.values()) {
      player.update(deltaTime, inputController, collisionSystem, gameMap);
    }

    // Atualiza projéteis (Tarefa 3)
    for (const projectile of this.projectiles.values()) {
      projectile.update(deltaTime); // Passa deltaTime para interpolação
    }
  }

  /**
   * Obtém uma instância de ClientPlayer pelo seu ID.
   * @param {string} id - O ID do jogador.
   * @returns {ClientPlayer | undefined} A instância do jogador ou undefined se não encontrado.
   */
  getPlayer(id) {
    return this.players.get(id);
  }

  /**
   * Retorna um iterador para todas as instâncias de ClientPlayer gerenciadas.
   * @returns {IterableIterator<ClientPlayer>}
   */
  getAllPlayers() {
    return this.players.values();
  }

   /**
    * Retorna um array com todas as instâncias de ClientPlayer gerenciadas.
    * @returns {ClientPlayer[]}
    */
   getAllPlayersArray() {
       return Array.from(this.players.values());
   }

  /**
   * Obtém uma instância de ClientProjectile pelo seu ID. (Tarefa 3)
   * @param {string} id - O ID do projétil.
   * @returns {ClientProjectile | undefined}
   */
  getProjectile(id) {
      return this.projectiles.get(id);
  }

  /**
   * Retorna um iterador para todas as instâncias de ClientProjectile gerenciadas. (Tarefa 3)
   * @returns {IterableIterator<ClientProjectile>}
   */
  getAllProjectiles() {
      return this.projectiles.values();
  }

   /**
    * Retorna um array com todas as instâncias de ClientProjectile gerenciadas. (Tarefa 3)
    * @returns {ClientProjectile[]}
    */
   getAllProjectilesArray() {
       return Array.from(this.projectiles.values());
   }
}