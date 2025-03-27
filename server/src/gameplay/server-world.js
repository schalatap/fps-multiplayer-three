import gameMapInstance from '../../../shared/gameplay/world/map.js'; // Importa a instância padrão
import { log } from '../../../shared/utils/logger.js';

/**
 * Representa o mundo do jogo no lado do servidor, contendo informações
 * sobre o mapa e potencialmente gerenciando entidades estáticas.
 */
export class ServerWorld {
    /**
     * A instância do mapa do jogo.
     * @type {import('../../../shared/gameplay/world/map.js').GameMap}
     */
    map;

    /**
     * Cria uma instância do ServerWorld.
     * @param {import('../../../shared/gameplay/world/map.js').GameMap} mapInstance - A instância do mapa a ser usada.
     */
    constructor(mapInstance) {
        if (!mapInstance) {
            throw new Error("ServerWorld requires a GameMap instance.");
        }
        this.map = mapInstance;
        log('ServerWorld initialized.');
        // Carregar obstáculos estáticos, etc.
    }

    /**
     * Retorna os limites do mapa atual.
     * @returns {{min: import('../../../shared/physics/vector.js').Vector3, max: import('../../../shared/physics/vector.js').Vector3}}
     */
    getMapBounds() {
        return this.map.getBounds();
    }

    // Outros métodos relacionados ao mundo (ex: verificar linha de visão, etc.)
}