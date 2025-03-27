// server/src/main.js
import { log } from '../../shared/utils/logger.js';
// Importar classes necessárias
import { GameStateManager } from './managers/game-state-manager.js';
import { PersistentGameLoop } from './core/persistent-game-loop.js';
import { StateBroadcaster } from './network/state-broadcaster.js';

/**
 * Ponto de entrada principal para a lógica da aplicação do servidor.
 * Inicializa e orquestra os diferentes módulos do servidor.
 * É chamado pelo server.js após a configuração inicial da rede.
 *
 * @param {import('socket.io').Server} io - Instância do servidor Socket.IO (passada por server.js).
 * @param {import('./managers/session-manager.js').SessionManager} sessionManager - Instância do SessionManager (passada por server.js).
 */
export function initializeServerApp(io, sessionManager) {
  log('Initializing server application logic...');

  // --- Verificação de Dependências ---
  if (!io) throw new Error("Socket.IO instance is required for server app initialization.");
  if (!sessionManager) throw new Error("SessionManager instance is required for server app initialization.");
   // O SpawnManager já está dentro do sessionManager, não precisamos recebê-lo aqui diretamente.

  // --- Instanciação de Managers e Sistemas Core (que dependem dos managers injetados) ---
  // GameStateManager precisa do SessionManager (que contém SpawnManager indiretamente)
  const gameStateManager = new GameStateManager(sessionManager);
  log('GameStateManager instantiated.');

  // StateBroadcaster precisa do io e GameStateManager
  const stateBroadcaster = new StateBroadcaster(io, gameStateManager);
  log('StateBroadcaster instantiated.');

  // --- Configuração do Game Loop ---
  // Define a função de callback que será executada a cada tick
  const updateCallback = (deltaTime) => {
      try {
          // 1. Atualiza o estado do jogo
          gameStateManager.update(deltaTime);
          // 2. Envia o novo estado para os clientes
          stateBroadcaster.broadcastGameState();
      } catch (error) {
          log('Error during game loop update:', error);
          // Considerar parar o loop ou tratar o erro de outra forma
      }
  };

  // Instanciar o Game Loop, passando apenas o callback
  const gameLoop = new PersistentGameLoop(updateCallback);
  log('PersistentGameLoop instantiated.');


  // --- Início dos Processos ---
  gameLoop.start();
  log('Persistent game loop started.');

  log('Server application logic initialized successfully.');

  // Retorna as instâncias principais se necessário para outros propósitos (ex: testes, comandos admin)
  return { gameStateManager, gameLoop, stateBroadcaster };
}