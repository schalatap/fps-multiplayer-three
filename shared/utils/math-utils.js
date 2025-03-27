/**
 * Funções matemáticas utilitárias.
 */

/**
 * Restringe um valor a um intervalo [min, max].
 * @param {number} value O valor a ser restringido.
 * @param {number} min O limite inferior.
 * @param {number} max O limite superior.
 * @returns {number} O valor restringido.
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }
  
  /**
   * Realiza interpolação linear entre dois valores.
   * @param {number} a O valor inicial.
   * @param {number} b O valor final.
   * @param {number} alpha O fator de interpolação (normalmente entre 0 e 1).
   * @returns {number} O valor interpolado.
   */
  export function lerp(a, b, alpha) {
    // Pode-se optar por clampar alpha aqui também se desejado:
    // const t = clamp(alpha, 0, 1);
    // return a + (b - a) * t;
    return a + (b - a) * alpha;
  }
  
  /**
   * Gera um UUID (Universally Unique Identifier) v4 simples.
   * Não é criptograficamente seguro, mas suficiente para IDs únicos no jogo.
   * @returns {string} Um UUID v4.
   */
  export function generateUUID() {
    // Fonte: https://stackoverflow.com/a/2117523/1168342
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  /**
   * Converte graus para radianos.
   * @param {number} degrees Ângulo em graus.
   * @returns {number} Ângulo em radianos.
   */
  export function degreesToRadians(degrees) {
      return degrees * (Math.PI / 180);
  }
  
  /**
   * Converte radianos para graus.
   * @param {number} radians Ângulo em radianos.
   * @returns {number} Ângulo em graus.
   */
  export function radiansToDegrees(radians) {
      return radians * (180 / Math.PI);
  }