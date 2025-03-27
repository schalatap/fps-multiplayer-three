/**
 * @fileoverview Define a estrutura de dados para o input do jogador enviado do cliente para o servidor.
 */

/**
 * Representa um pacote de input do jogador para um determinado intervalo de tempo (deltaTime).
 *
 * @typedef {object} PlayerInput
 * @property {number} sequence - Um número sequencial para identificar e ordenar os pacotes de input.
 * @property {number} deltaTime - O delta time no cliente quando este input foi gerado (em segundos).
 * @property {{W: boolean, A: boolean, S: boolean, D: boolean, Shift: boolean, Space: boolean, Fire: boolean, Cast1: boolean, Cast2: boolean}} keys - O estado das teclas de ação/movimento.
 * @property {number} lookYaw - O ângulo de rotação horizontal (yaw) do jogador em radianos.
 * @property {number} lookPitch - O ângulo de rotação vertical (pitch) do jogador em radianos.
 */

// Não há código executável neste arquivo, apenas a definição da estrutura via JSDoc.

export {}; // Export vazio para tratar como módulo ES