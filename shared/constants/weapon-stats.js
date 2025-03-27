/**
 * Constantes definindo as estatísticas base das armas.
 */

// --- Pistola ---
export const PISTOL_DAMAGE = 15; // Dano por acerto
export const PISTOL_FIRE_RATE = 5; // Tiros por segundo
export const PISTOL_RANGE = 100; // Alcance máximo do projétil/hitscan
export const PISTOL_PROJECTILE_SPEED = 60; // Unidades por segundo (reduzido de 80 para melhor detecção)
export const PISTOL_AMMO = Infinity; // Munição inicial (infinita por enquanto)
export const PISTOL_RELOAD_TIME = 1.5; // Tempo de recarga em segundos (se a munição não for infinita)
export const PISTOL_PROJECTILE_SIZE = 0.2; // Tamanho da bounding box do projétil (aumentado de 0.1)