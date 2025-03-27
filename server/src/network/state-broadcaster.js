import { log, warn } from '../../../shared/utils/logger.js';
// Importar tipos para JSDoc
// import type { Server as SocketIOServer } from 'socket.io';
// import type { GameStateManager } from '../managers/game-state-manager.js';

/**
 * Responsável por coletar o estado atual do jogo do GameStateManager
 * e transmiti-lo (broadcast) para todos os clientes conectados via Socket.IO.
 */
export class StateBroadcaster {
  /**
   * Instância do servidor Socket.IO.
   * @type {import('socket.io').Server} // Ajustado JSDoc
   */
  io;

  /**
   * Gerenciador do estado do jogo.
   * @type {import('../managers/game-state-manager.js').GameStateManager} // Ajustado JSDoc
   */
  gameStateManager;

  /**
   * Cria uma instância do StateBroadcaster.
   * @param {import('socket.io').Server} io - A instância do servidor Socket.IO. // Ajustado JSDoc
   * @param {import('../managers/game-state-manager.js').GameStateManager} gameStateManager - O gerenciador de estado do jogo. // Ajustado JSDoc
   */
  constructor(io, gameStateManager) {
    if (!io) {
      throw new Error("StateBroadcaster requires a Socket.IO server instance.");
    }
    if (!gameStateManager) {
      throw new Error("StateBroadcaster requires a GameStateManager instance.");
    }
    this.io = io;
    this.gameStateManager = gameStateManager;
    
    // Listen for internal impact events to broadcast over the network
    if (global.eventEmitter) {
         const existingListeners = global.eventEmitter.listeners['broadcastImpactEffect'] || [];
         // Usar nome da função bindada para checagem
         if (!existingListeners.some(fn => fn.name === 'bound broadcastImpactHandler')) {
            global.eventEmitter.on('broadcastImpactEffect', this.broadcastImpactHandler.bind(this));
            log('StateBroadcaster listening for broadcastImpactEffect events.');
         }
    } else {
        warn('StateBroadcaster: Global event emitter not found. Cannot broadcast impact effects.');
    }
    
    log('StateBroadcaster initialized.');
  }

  /**
   * Manipulador para o evento interno 'broadcastImpactEffect'.
   * Envia os dados do impacto para todos os clientes via Socket.IO.
   * @param {object} impactData - Dados do impacto vindos do MovementSystem.
   */
  broadcastImpactHandler(impactData) {
    try {
        // Diretamente emite o evento 'projectileImpact' para todos os clientes
        // com os dados recebidos.
        this.io.emit('projectileImpact', impactData);
        // log(`Broadcasting impact effect for projectile ${impactData.projectileId}`);
    } catch (error) {
        warn('StateBroadcaster: Error broadcasting impact effect:', error);
    }
  }

  /**
   * Coleta o snapshot mais recente do estado do jogo e o envia para todos os clientes.
   */
  broadcastGameState() {
    try {
      // Coleta o estado atual de todas as entidades gerenciadas
      const gameStateSnapshot = this.gameStateManager.getSnapshot();

      // Verifica se há clientes conectados antes de emitir
      const connectedSockets = this.io.sockets.sockets; // Obtém um mapa de sockets conectados
      if (connectedSockets.size > 0) {
        // Emite o snapshot para todos os clientes conectados
        this.io.emit('gameStateUpdate', gameStateSnapshot);
        // log(`Broadcasting game state to ${connectedSockets.size} clients. Snapshot time: ${gameStateSnapshot.timestamp}`); // Log pode ser muito verboso
      } else {
        // log('No clients connected, skipping broadcast.'); // Log opcional
      }
    } catch (error) {
      warn('Error during game state broadcast:', error);
    }
  }
}