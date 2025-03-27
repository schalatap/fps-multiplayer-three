/**
 * @fileoverview Define a estrutura de dados para o snapshot completo do estado do jogo
 *               a ser sincronizado do servidor para os clientes.
 */

/**
 * Representa um snapshot do estado completo do jogo em um determinado momento.
 *
 * @typedef {object} GameState
 * @property {number} timestamp - O timestamp do servidor (ms desde epoch) quando o snapshot foi criado.
 * @property {Array<import('./player-state.js').PlayerState>} players - Um array contendo o estado de todos os jogadores ativos.
 * // Propriedades futuras a serem adicionadas:
 * // @property {Array<object>} projectiles - Estado de todos os projéteis ativos.
 * // @property {Array<object>} worldObjects - Estado de outros objetos do mundo (itens, etc.).
 * // @property {object} gameInfo - Informações gerais da partida (tempo restante, modo de jogo, etc.).
 */

// Não há código executável neste arquivo, apenas a definição da estrutura via JSDoc.

export {}; // Export vazio para tratar como módulo ES