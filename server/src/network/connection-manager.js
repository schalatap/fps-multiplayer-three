import { log, error as logError } from '../../../shared/utils/logger.js';
// Não precisamos importar SessionManager aqui se ele for injetado

/**
 * Gerencia as conexões e desconexões de clientes via Socket.IO.
 * Delega o gerenciamento de jogadores ao SessionManager.
 */
export class ConnectionManager {
  /**
   * A instância do servidor Socket.IO.
   * @type {import('socket.io').Server}
   */
  io;

  /**
   * Gerenciador de sessões de jogadores.
   * @type {import('../managers/session-manager.js').SessionManager}
   */
  sessionManager; // Adicionada propriedade para armazenar a instância injetada

  /**
   * Cria uma instância do ConnectionManager.
   * @param {import('socket.io').Server} io - A instância do servidor Socket.IO.
   * @param {import('../managers/session-manager.js').SessionManager} sessionManager - O gerenciador de sessões.
   */
  constructor(io, sessionManager) { // Modificado para receber sessionManager
    if (!io) {
      throw new Error("Socket.IO server instance is required for ConnectionManager.");
    }
    if (!sessionManager) { // Adicionada verificação para sessionManager
        throw new Error("SessionManager instance is required for ConnectionManager.");
    }
    this.io = io;
    this.sessionManager = sessionManager; // Armazena a instância injetada
    log('ConnectionManager initialized.');
    this.setupEventListeners();
  }

  /**
   * Configura os listeners de eventos principais do Socket.IO.
   */
  setupEventListeners() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);

      socket.on('disconnect', (reason) => {
        this.handleDisconnection(socket, reason);
      });

      // Listener para 'playerInput' 
      socket.on('playerInput', (inputData) => {
        const player = this.sessionManager.getPlayer(socket.id);
        if (player) {
            // Log temporário para verificar recebimento
            //log(`Received input from ${player.id} (Seq: ${inputData?.sequence})`);
            // Chama o método processInput no ServerPlayer correspondente
            player.processInput(inputData); // Método será implementado 
        } else {
            // Isso não deveria acontecer se addPlayer funcionou
            logError(`Received input from unknown player socket: ${socket.id}`);
        }
    });

      // Listener para 'increaseAttributeRequest' será adicionado na Etapa 23
      // socket.on('increaseAttributeRequest', (attributeType) => { ... });

    });

     this.io.on('connect_error', (err) => {
        logError(`Server connect_error: ${err.message}`);
     });
  }

  /**
   * Lida com uma nova conexão de cliente.
   * @param {import('socket.io').Socket} socket - O socket do cliente conectado.
   */
  handleConnection(socket) {
    log(`Client connected: ${socket.id}`);
    // Chama o SessionManager para criar/gerenciar o jogador
    const player = this.sessionManager.addPlayer(socket); // Modificado
    if (!player) {
        // Se falhar ao criar o jogador, talvez desconectar o socket?
        socket.disconnect(true);
        logError(`Failed to initialize player for socket ${socket.id}. Disconnecting.`);
    }
    // Poderia enviar dados iniciais para o cliente aqui, se necessário
    // Ex: socket.emit('welcome', { playerId: player.id, mapData: ... });
  }

  /**
   * Lida com a desconexão de um cliente.
   * @param {import('socket.io').Socket} socket - O socket do cliente desconectado.
   * @param {string} reason - A razão da desconexão.
   */
  handleDisconnection(socket, reason) {
    log(`Client disconnected: ${socket.id}. Reason: ${reason}`);
    // Chama o SessionManager para remover o jogador
    this.sessionManager.removePlayer(socket.id); // Modificado
  }
}