import { log, warn } from '../../../shared/utils/logger.js';

/**
 * Responsável por ouvir as atualizações de estado do servidor vindas do NetworkManager
 * e aplicá-las ao ClientWorld. Desacopla a lógica de rede da lógica de mundo do cliente.
 */
export class StateSynchronizer {
  /** @type {import('./network-manager.js').NetworkManager} */
  networkManager;
  /** @type {import('../gameplay/client-world.js').ClientWorld} */
  clientWorld;

  /**
   * Cria uma instância do StateSynchronizer.
   * @param {import('./network-manager.js').NetworkManager} networkManager - O gerenciador de rede.
   * @param {import('../gameplay/client-world.js').ClientWorld} clientWorld - O mundo do jogo no cliente.
   */
  constructor(networkManager, clientWorld) {
    if (!networkManager) {
      throw new Error("StateSynchronizer requires a NetworkManager instance.");
    }
    if (!clientWorld) {
      throw new Error("StateSynchronizer requires a ClientWorld instance.");
    }
    this.networkManager = networkManager;
    this.clientWorld = clientWorld;

    this.registerListeners();
    log('[CLIENT] StateSynchronizer initialized.');
  }

  /**
   * Registra os listeners de eventos de rede necessários.
   */
  registerListeners() {
    // Registra o handler para o evento 'gameStateUpdate'
    this.networkManager.on('gameStateUpdate', this.handleGameStateUpdate.bind(this));
    
    // ---- NOVO: Ouvir eventos de impacto ----
    this.networkManager.on('projectileImpact', this.handleProjectileImpact.bind(this));
    // --------------------------------------
  }

  /**
   * Manipula o recebimento de um snapshot de estado do jogo do servidor.
   * @param {import('../../../shared/models/game-state.js').GameState} gameState - O snapshot do estado do jogo.
   */
  handleGameStateUpdate(gameState) {
    // log('[CLIENT] StateSynchronizer received gameStateUpdate:', gameState.timestamp);
    try {
        this.clientWorld.updateFromState(gameState);
    } catch (error) {
         warn('[CLIENT] Error applying game state update:', error);
    }
  }
  
  /**
   * Manipula o recebimento de eventos de impacto de projéteis.
   * @param {object} impactData - Dados do impacto recebidos do servidor.
   */
  handleProjectileImpact(impactData) {
     try {
         if (impactData && impactData.projectileId && impactData.position) {
             this.clientWorld.addImpactEvent(
                 impactData.projectileId,
                 impactData.position, // Posição já deve vir como array [x,y,z]
                 impactData.surfaceType,
                 impactData.obstacleType
             );
         } else {
             warn('[CLIENT] Received invalid projectileImpact data:', impactData);
         }
     } catch (error) {
          warn('[CLIENT] Error handling projectile impact event:', error);
     }
  }
}