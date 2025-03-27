import { log, warn, error as logError } from '../../shared/utils/logger.js';

/**
 * Gerencia a conexão Socket.IO com o servidor e a comunicação de rede básica.
 * Implementado como Singleton.
 */
class NetworkManager {
    /** @type {NetworkManager | null} */
    static instance = null;

    /** @type {import('socket.io-client').Socket | null} */
    socket = null;
    /**
     * ID do socket do jogador local, definido quando conectado.
     * @type {string | null}
     * @private // Indica uso interno, mas acessível via getLocalPlayerId
     */
    _localPlayerId = null;

    /**
     * O construtor é privado para forçar o uso do getInstance (Singleton).
     */
    constructor() {
        if (NetworkManager.instance) {
            return NetworkManager.instance;
        }
        NetworkManager.instance = this;
        this.initializeConnection();
    }

    /**
     * Obtém a instância Singleton do NetworkManager.
     * @returns {NetworkManager}
     */
    static getInstance() {
        if (!NetworkManager.instance) {
            NetworkManager.instance = new NetworkManager();
        }
        return NetworkManager.instance;
    }

    /**
     * Inicializa a conexão Socket.IO com o servidor.
     */
    initializeConnection() {
        try {
            this.socket = io();
            log('[CLIENT] Attempting to connect to the server...');
            this.setupEventListeners(); // Os listeners SÃO registrados aqui
        } catch (err) {
            logError('[CLIENT] Socket.IO client initialization failed:', err);
        }
    }

    /**
     * Configura os listeners de eventos básicos do Socket.IO.
     * O listener 'gameStateUpdate' ainda é registrado aqui, mas seu *processamento*
     * agora é delegado ao StateSynchronizer.
     */
    setupEventListeners() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            this._localPlayerId = this.socket.id;
            log(`[CLIENT] Connected to server with ID: ${this._localPlayerId}`);
        });

        this.socket.on('disconnect', (reason) => {
            warn(`[CLIENT] Disconnected from server. Reason: ${reason}`);
            this._localPlayerId = null;
        });

        this.socket.on('connect_error', (err) => {
            logError(`[CLIENT] Connection error: ${err.message}`);
        });

        // O listener ainda existe aqui, mas o StateSynchronizer também o registrará
        // e será o responsável por chamar clientWorld.updateFromState.
        // O log direto foi removido/comentado.
        this.socket.on('gameStateUpdate', (/* gameState */) => {
          // log('[CLIENT] NetworkManager saw gameStateUpdate'); // Log removido/comentado
        });
    }

     /**
     * Retorna o ID do socket do jogador local.
     * @returns {string | null}
     */
    getLocalPlayerId() {
        return this._localPlayerId;
    }

    /**
     * Emite um evento para o servidor.
     * @param {string} eventName O nome do evento.
     * @param {any} data Os dados a serem enviados.
     */
    emit(eventName, data) {
        if (this.socket && this.socket.connected) {
            this.socket.emit(eventName, data);
        } else {
            warn(`[CLIENT] Cannot emit event '${eventName}'. Socket not connected.`);
        }
    }

     /**
      * Registra um listener para um evento vindo do servidor.
      * Delegado para o socket.io, usado pelo StateSynchronizer.
      * @param {string} eventName O nome do evento.
      * @param {Function} callback A função a ser chamada quando o evento ocorrer.
      */
     on(eventName, callback) {
         if (this.socket) {
             this.socket.on(eventName, callback);
         } else {
              warn(`[CLIENT] Cannot register listener for '${eventName}'. Socket not initialized.`);
         }
     }

     /**
     * Envia o estado de input do jogador para o servidor. (Tarefa 3)
     * @param {import('../../../shared/models/player-input.js').PlayerInput} inputState - O objeto de input a ser enviado.
     */
    sendInput(inputState) {
        this.emit('playerInput', inputState);
        // log('[CLIENT] Sent input state:', inputState.sequence); // Log pode ser verboso
    }
}

// Exporta a instância Singleton
const networkManagerInstance = NetworkManager.getInstance();
export { networkManagerInstance as NetworkManager };