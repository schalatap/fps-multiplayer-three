// server/src/gameplay/spawn-manager.js

import { log, warn } from '../../../shared/utils/logger.js';
import { Vector3 } from '../../../shared/physics/vector.js';

/**
 * Gerencia a lógica de obtenção de pontos de spawn.
 */
export class SpawnManager {
    /** @type {import('../../../shared/gameplay/world/map.js').GameMap} */
    gameMap;

    /**
     * Cria uma instância do SpawnManager.
     * @param {import('../../../shared/gameplay/world/map.js').GameMap} gameMapInstance - A instância do mapa do jogo.
     */
    constructor(gameMapInstance) {
        if (!gameMapInstance) {
            throw new Error("SpawnManager requires a GameMap instance.");
        }
        this.gameMap = gameMapInstance;
        log('SpawnManager initialized.');
    }

    /**
     * Retorna uma posição de spawn aleatória do mapa.
     * @returns {Vector3} Uma cópia de uma posição de spawn.
     */
    getSpawnPoint() {
        try {
            const spawnPoint = this.gameMap.getRandomSpawnPoint();
            // log(`Spawn point requested, returning: ${spawnPoint.toString()}`);
            return spawnPoint;
        } catch (error) {
             warn("Error getting spawn point:", error);
             // Fallback para origem em caso de erro extremo
             return new Vector3(0, 0.5, 0);
        }
    }

    // --- Lógica Futura ---
    // findSafeSpawnPoint(playersToAvoid, minDistance) {
    //   // Tenta encontrar um ponto de spawn que esteja a uma distância mínima
    //   // de outros jogadores para reduzir spawn camping.
    //   let attempts = 0;
    //   const maxAttempts = 10;
    //   while (attempts < maxAttempts) {
    //       const potentialPoint = this.getSpawnPoint();
    //       let safe = true;
    //       for (const player of playersToAvoid) {
    //           if (player.isAlive && player.position.distanceToSq(potentialPoint) < minDistance * minDistance) {
    //               safe = false;
    //               break;
    //           }
    //       }
    //       if (safe) return potentialPoint;
    //       attempts++;
    //   }
    //   warn(`Could not find a safe spawn point after ${maxAttempts} attempts. Returning random.`);
    //   return this.getSpawnPoint(); // Retorna aleatório como fallback
    // }
}