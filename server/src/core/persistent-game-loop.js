import { log, error as logError } from '../../../shared/utils/logger.js';
import { SERVER_TICK_INTERVAL_MS } from '../../../shared/constants/game-settings.js';
// Importar tipo para JSDoc
// import type { StateBroadcaster } from '../network/state-broadcaster.js';

/**
 * Implementa um loop de jogo persistente no servidor com cálculo de deltaTime.
 * Usa setTimeout recursivo para maior precisão em relação a setInterval.
 */
export class PersistentGameLoop {
  /** @type {(deltaTime: number) => void} */
  updateCallback;
  /** @type {NodeJS.Timeout | null} */
  timerId = null;
  /** @type {boolean} */
  isRunning = false;
  /** @type {number} */
  lastTickTime = 0;

  /**
   * Referência ao StateBroadcaster para transmitir o estado após cada update.
   * @type {import('../network/state-broadcaster.js').StateBroadcaster | null} // Ajustado JSDoc e tipo
   */
  stateBroadcaster = null; // Modificado: inicializa como null

  /**
   * Cria uma instância do PersistentGameLoop.
   * @param {(deltaTime: number) => void} updateCallback - A função a ser executada a cada tick.
   * @param {import('../network/state-broadcaster.js').StateBroadcaster} [stateBroadcaster] - (Opcional, mas usado nesta etapa) Instância do StateBroadcaster. // Ajustado JSDoc
   */
  constructor(updateCallback, stateBroadcaster = null) { // Modificado: stateBroadcaster opcional
    if (typeof updateCallback !== 'function') {
      throw new Error("PersistentGameLoop requires a valid updateCallback function.");
    }
    this.updateCallback = updateCallback;
    this.stateBroadcaster = stateBroadcaster; // Armazena a instância injetada
    if (stateBroadcaster) {
        log('PersistentGameLoop initialized with StateBroadcaster.');
    } else {
         log('PersistentGameLoop initialized.');
    }
  }

  /**
   * Inicia o loop de jogo.
   */
  start() {
    if (this.isRunning) {
      log('Game loop is already running.');
      return;
    }
    this.isRunning = true;
    this.lastTickTime = performance.now();
    log('Starting persistent game loop...');
    this.scheduleNextTick();
  }

  /**
   * Para o loop de jogo.
   */
  stop() {
    if (!this.isRunning) {
      log('Game loop is not running.');
      return;
    }
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
    log('Persistent game loop stopped.');
  }

  /**
   * Agenda a próxima execução do tick do loop.
   */
  scheduleNextTick() {
    const now = performance.now();
    const nextTickTime = this.lastTickTime + SERVER_TICK_INTERVAL_MS;
    const delay = Math.max(0, nextTickTime - now);

    this.timerId = setTimeout(() => this.tick(), delay);
  }

  /**
   * Executa um único tick do loop de jogo.
   */
  tick() {
    if (!this.isRunning) return;

    const now = performance.now();
    const deltaTime = (now - this.lastTickTime) / 1000;
    this.lastTickTime = now;

    try {
      // Chama a função de atualização principal
      this.updateCallback(deltaTime);

      // Transmite o estado do jogo DEPOIS da atualização
      if (this.stateBroadcaster) { // Modificado: Verifica se existe
        this.stateBroadcaster.broadcastGameState(); // Modificado: Chama o método
      }

    } catch (err) {
      logError('Error during game loop tick:', err);
      this.stop();
      return;
    }

    this.scheduleNextTick();
  }
}