/**
 * Utilitário simples para logging com prefixos.
 */

const PREFIX_INFO = "[INFO]";
const PREFIX_WARN = "[WARN]";
const PREFIX_ERROR = "[ERROR]";

/**
 * Loga uma mensagem informativa.
 * @param {...any} args Argumentos para logar.
 */
export function log(...args) {
  console.log(PREFIX_INFO, ...args);
}

/**
 * Loga uma mensagem de aviso.
 * @param {...any} args Argumentos para logar.
 */
export function warn(...args) {
  console.warn(PREFIX_WARN, ...args);
}

/**
 * Loga uma mensagem de erro.
 * @param {...any} args Argumentos para logar.
 */
export function error(...args) {
  console.error(PREFIX_ERROR, ...args);
}

