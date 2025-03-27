/**
 * Constantes de configuração geral do jogo.
 */

/**
 * A taxa de atualização do loop de jogo do servidor, em ticks por segundo.
 * Define a frequência com que o estado do jogo é atualizado e (potencialmente) enviado aos clientes.
 * @type {number}
 */
export const SERVER_TICK_RATE = 30; // Exemplo: 30 atualizações por segundo

/**
 * O intervalo de tempo entre ticks do servidor, em milissegundos.
 * Calculado a partir de SERVER_TICK_RATE.
 * @type {number}
 */
export const SERVER_TICK_INTERVAL_MS = 1000 / SERVER_TICK_RATE;

/**
 * Velocidade base de movimento dos jogadores (unidades por segundo).
 * @type {number}
 */
export const BASE_PLAYER_SPEED = 7.0; // Aumentado de 5.0 para 7.0

/**
 * Tempo em segundos que um jogador permanece morto antes de respawnar.
 * @type {number}
 */
export const RESPAWN_DELAY = 3.0;

// --- CONSTANTES DE MOVIMENTO (AJUSTADAS) ---
/**
 * Fator de aceleração. Valores maiores > aceleração mais rápida.
 * Experimente valores entre 10-25.
 * @type {number}
 */
export const PLAYER_ACCELERATION = 18;

/**
 * Fator de atrito/desaceleração. Valores maiores > parada mais rápida.
 * Experimente valores entre 5-15.
 * @type {number}
 */
export const PLAYER_FRICTION = 10;

/** Velocidade mínima para considerar o jogador parado (evita drifting por float precision) */
export const MIN_SPEED_THRESHOLD = 0.01;
// --- FIM CONSTANTES DE MOVIMENTO ---

/**
 * Aceleração devido à gravidade (unidades por segundo ao quadrado).
 * Aplicada à velocidade Y a cada tick.
 * @type {number}
 */
export const GRAVITY = 20.0;

/**
 * Altura dos olhos do jogador em relação à base (pés)
 * Usado para câmera e origem aproximada do projétil.
 * @type {number}
 */
export const PLAYER_EYE_HEIGHT = 1.6;