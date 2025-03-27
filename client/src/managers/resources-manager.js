import { createMapMesh } from '../generation/map-model-generator.js';
import { log, warn } from '../../../shared/utils/logger.js';

/**
 * Gerencia o carregamento e/ou geração de recursos do jogo, como modelos, texturas, etc.
 * (Pode ser implementado como Singleton se preferir).
 */
export class ResourcesManager {
    /**
     * Cache para armazenar recursos já carregados/gerados.
     * @type {Map<string, any>}
     */
    cache;

    /**
     * Cria uma instância do ResourcesManager.
     */
    constructor() {
        this.cache = new Map();
        log('[CLIENT] ResourcesManager initialized.');
    }

    /**
     * Carrega (ou gera neste caso) o mesh do mapa.
     * Usa um cache simples para evitar regeneração.
     * @param {import('../../../shared/gameplay/world/map.js').GameMap} gameMap - A instância do mapa.
     * @returns {import('three').Group | null} O mesh do mapa ou null se falhar.
     */
    loadMapMesh(gameMap) {
        const cacheKey = 'mapMesh'; // Chave simples para o cache do mapa

        if (this.cache.has(cacheKey)) {
            log('[CLIENT] Returning cached map mesh.');
            return this.cache.get(cacheKey);
        }

        log('[CLIENT] Loading/Generating map mesh...');
        const mapMesh = createMapMesh(gameMap);

        if (mapMesh) {
            this.cache.set(cacheKey, mapMesh);
            log('[CLIENT] Map mesh loaded and cached.');
        } else {
            warn('[CLIENT] Failed to load/generate map mesh.');
        }

        return mapMesh;
    }

    // Métodos futuros: loadTexture(url), loadModel(url), etc.
    // getResource(key) { return this.cache.get(key); }
}