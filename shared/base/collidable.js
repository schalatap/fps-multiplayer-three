/**
 * @fileoverview Define a interface conceitual para objetos que podem colidir
 *               e constantes relacionadas às dimensões das entidades.
 */

/**
 * Interface conceitual para objetos que podem participar de colisões.
 * @interface
 */
class Collidable {
    /**
     * A posição atual do objeto no mundo.
     * @type {import('../physics/vector.js').Vector3}
     * @abstract
     */
    get position() {
        throw new Error("Collidable must implement 'position' getter.");
    }
  
    /**
     * Calcula e retorna a Axis-Aligned Bounding Box (AABB) do objeto no espaço do mundo.
     * @returns {{min: import('../physics/vector.js').Vector3, max: import('../physics/vector.js').Vector3}} A AABB do objeto.
     * @abstract
     */
    getBoundingBox() {
      throw new Error("Collidable must implement 'getBoundingBox()'.");
    }
  }
  
  // --- Constantes de Dimensões (Exemplo para Jogador) ---
  export const PLAYER_HEIGHT = 1.8; // Altura total do jogador
  export const PLAYER_WIDTH = 0.8;  // Largura/Profundidade do jogador
  export const PLAYER_DEPTH = 0.8; // Pode ser igual a PLAYER_WIDTH
  
  // Export vazio para tratar como módulo ES, já que a classe é conceitual
  export {};