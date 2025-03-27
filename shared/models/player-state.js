/**
 * @fileoverview Define a estrutura de dados para o estado de um jogador
 *               a ser sincronizado pela rede.
 */

/**
 * Representa o estado serializável de um jogador.
 * Este é um objeto simples para facilitar a transmissão via JSON/Socket.IO.
 * Corresponde ao que Player.getState() retorna.
 *
 * @typedef {object} PlayerState
 * @property {string} id - O ID único do jogador.
 * @property {{x: number, y: number, z: number}} position - A posição atual do jogador.
 * @property {number} health - A vida atual do jogador.
 * @property {number} maxHealth - A vida máxima do jogador.
 * @property {string} name - O nome do jogador.
 * @property {number} score - A pontuação do jogador.
 * // Propriedades futuras a serem adicionadas conforme necessário:
 * // @property {boolean} isAlive
 * // @property {number} mana
 * // @property {number} maxMana
 * // @property {object} attributes - Estado do AttributeSet
 * // @property {object} cooldowns - Estado dos cooldowns de magias/habilidades
 * // @property {string | null} currentWeaponId - ID da arma equipada
 */

// Não há código executável neste arquivo, apenas a definição da estrutura via JSDoc.
// Poderia ser uma classe se precisasse de métodos, mas para um DTO (Data Transfer Object) simples,
// JSDoc é suficiente e evita a necessidade de instanciar.

export {}; // Export vazio para tratar como módulo ES