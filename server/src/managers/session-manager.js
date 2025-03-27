import { ServerPlayer } from '../gameplay/server-player.js';
import { log, warn } from '../../../shared/utils/logger.js';
import gameMapInstance from '../../../shared/gameplay/world/map.js'; // Para posição inicial

/**
 * Gerencia as sessões dos jogadores, associando conexões (sockets)
 * a instâncias de ServerPlayer e dados relacionados à sessão.
 */
export class SessionManager {
  /**
   * Mapa que associa socket.id a instâncias de ServerPlayer.
   * @type {Map<string, ServerPlayer>}
   */
  players;
  /** @type {import('../gameplay/spawn-manager.js').SpawnManager} */ // <-- Adicionar referência
  spawnManager;

  /**
     * Cria uma instância do SessionManager.
     * @param {import('../gameplay/spawn-manager.js').SpawnManager} spawnManager // <-- Receber SpawnManager
     */
  constructor(spawnManager) { // <-- Receber SpawnManager
    if (!spawnManager) throw new Error("SessionManager requires a SpawnManager instance."); // <-- Validar
    this.players = new Map();
    this.spawnManager = spawnManager; // <-- Armazenar
    log('SessionManager initialized.');
  }

  /**
     * Adiciona um novo jogador à sessão.
     * @param {import('socket.io').Socket} socket
     * @returns {ServerPlayer} A instância do jogador criada.
     */
  addPlayer(socket) {
    // Pega uma posição inicial do spawn manager
    const initialPosition = this.spawnManager.getSpawnPoint(); // <-- Usar SpawnManager
    const newPlayer = new ServerPlayer(socket, this.spawnManager, `Player_${socket.id.substring(0, 4)}`, initialPosition); // <-- Passar spawnManager
    this.players.set(socket.id, newPlayer);
    log(`Player connected: ${newPlayer.name} (ID: ${socket.id}) at ${initialPosition.toString()}`);
    return newPlayer;
  }

  /**
     * Remove um jogador da sessão.
     * @param {string} socketId
     */
  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (player) {
        log(`Player disconnected: ${player.name} (ID: ${socketId})`);
        this.players.delete(socketId);
        // Poderia emitir um evento 'playerLeft' aqui
    } else {
        warn(`Attempted to remove non-existent player with socket ID: ${socketId}`);
    }
  }

  /**
     * Obtém um jogador pelo ID do socket.
     * @param {string} socketId
     * @returns {ServerPlayer | undefined}
     */
  getPlayer(socketId) {
    return this.players.get(socketId);
  }

  /**
   * Retorna um iterador para todos os jogadores.
   * @returns {IterableIterator<ServerPlayer>}
   */
  getAllPlayers() {
      return this.players.values();
  }

  /**
    * Retorna um array com todos os jogadores.
    * @returns {Array<ServerPlayer>}
    */
  getAllPlayersArray() {
      return Array.from(this.players.values());
  }
}