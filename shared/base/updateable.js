/**
 * @fileoverview Interface conceitual para objetos que podem ser atualizados
 *               a cada tick/frame do loop de jogo.
 */

/**
 * @interface
 */
class Updateable {
    /**
     * Método chamado para atualizar o estado do objeto.
     * @param {number} deltaTime - Tempo decorrido desde a última atualização, em segundos.
     * @abstract
     */
    update(deltaTime) {
      throw new Error("Method 'update(deltaTime)' must be implemented by subclasses.");
    }
  }
  
  // Este arquivo serve principalmente como documentação da interface esperada.
  // Não exportamos a classe diretamente, pois é um conceito.
  export {}; // Export vazio para tratar como módulo ES