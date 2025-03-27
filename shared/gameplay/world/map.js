import { Vector3 } from '../../physics/vector.js';
import { log } from '../../utils/logger.js';

/**
 * Define a estrutura e os limites do mapa do jogo.
 * Inclui obstáculos estáticos com tipo e rotação opcional.
 */
export class GameMap {
  /** @type {Vector3} */
  minBounds;
  /** @type {Vector3} */
  maxBounds;
  /** @type {Array<Vector3>} */
  spawnPoints;
  /**
   * Lista de obstáculos estáticos no mapa.
   * Cada objeto deve ter:
   * - position: Vector3 (centro da base do objeto)
   * - size: Vector3 (dimensões do objeto)
   * - type: string ('box', 'tree') - para renderização
   * - rotationY: number (opcional, em radianos, para renderização) - rotação visual em torno do eixo Y
   * @type {Array<{position: Vector3, size: Vector3, type: string, rotationY?: number}>}
   */
  staticObstacles;

  /**
   * Cria uma instância do GameMap.
   * @param {Vector3} minBounds
   * @param {Vector3} maxBounds
   * @param {Array<Vector3>} spawnPoints
   * @param {Array<{position: Vector3, size: Vector3, type: string, rotationY?: number}>} [staticObstacles=[]]
   */
  constructor(minBounds, maxBounds, spawnPoints = [], staticObstacles = []) {
    this.minBounds = minBounds;
    this.maxBounds = maxBounds;
    this.spawnPoints = spawnPoints;
    this.staticObstacles = staticObstacles;

    // Garantir que rotationY exista com valor padrão 0 se não fornecido
    this.staticObstacles.forEach(obs => {
        obs.rotationY = obs.rotationY ?? 0;
    });

    if (spawnPoints.length === 0) {
        this.spawnPoints.push(new Vector3(0, 0.5, 0));
        log('Map created with default spawn point at origin.');
    } else {
         log(`Map created with ${spawnPoints.length} spawn points.`);
    }

    log(`Map created with ${this.staticObstacles.length} static obstacles.`);
  }

  /** @returns {{min: Vector3, max: Vector3}} */
  getBounds() {
    return { min: this.minBounds, max: this.maxBounds };
  }

  /** @returns {Vector3} */
  getRandomSpawnPoint() {
    if (this.spawnPoints.length === 0) return new Vector3(0, 0.5, 0);
    const randomIndex = Math.floor(Math.random() * this.spawnPoints.length);
    return this.spawnPoints[randomIndex].clone();
  }

  /** @returns {Array<{position: Vector3, size: Vector3, type: string, rotationY?: number}>} */
  getStaticObstacles() {
    return this.staticObstacles;
  }
}

// --- Instância Padrão do Mapa ---
const mapSizeX = 100;
const mapSizeZ = 80;
const mapMinY = 0;
const mapMaxY = 25;

const defaultMinBounds = new Vector3(-mapSizeX / 2, mapMinY, -mapSizeZ / 2);
const defaultMaxBounds = new Vector3(mapSizeX / 2, mapMaxY, mapSizeZ / 2);

const spawnOffsetZ = mapSizeZ * 0.45;
const spawnOffsetY = 0.5;
const defaultSpawnPoints = [
  new Vector3(-mapSizeX * 0.3, spawnOffsetY, spawnOffsetZ),
  new Vector3(0, spawnOffsetY, spawnOffsetZ),
  new Vector3(mapSizeX * 0.3, spawnOffsetY, spawnOffsetZ),
  new Vector3(-mapSizeX * 0.3, spawnOffsetY, -spawnOffsetZ),
  new Vector3(0, spawnOffsetY, -spawnOffsetZ),
  new Vector3(mapSizeX * 0.3, spawnOffsetY, -spawnOffsetZ),
];

const boxHeight = 1.5;

// --- REFINAMENTO DA HITBOX DA ÁRVORE ---
const treeTrunkRadiusVisual = 0.5;
const treeTrunkHeightVisual = 4;
const treeCanopyRadiusVisual = 2.5; // Não usado diretamente na hitbox

// Hitbox: Agora mais precisa, apenas para o tronco
const treeCollisionWidthDepth = treeTrunkRadiusVisual * 2 * 1.2; // Tronco com margem mínima
const treeCollisionHeight = treeTrunkHeightVisual * 0.9; // Apenas o tronco, sem parte da copa
const treeCollisionSize = new Vector3(treeCollisionWidthDepth, treeCollisionHeight, treeCollisionWidthDepth);
log(`Tree collision size set to: ${treeCollisionSize.toString()}`); // Log para debug

const defaultStaticObstacles = [
    // --- Área Central ---
    { type: 'box', position: new Vector3(0, 0, 0), size: new Vector3(5, boxHeight * 2, 5) },
    { type: 'box', position: new Vector3(6, 0, 3), size: new Vector3(3, boxHeight, 3) },
    { type: 'box', position: new Vector3(-6, 0, -3), size: new Vector3(3, boxHeight, 3) },
    { type: 'box', position: new Vector3(3, 0, -6), size: new Vector3(3, boxHeight, 3) },
    { type: 'box', position: new Vector3(-3, 0, 6), size: new Vector3(3, boxHeight, 3) },

    // --- Obstáculos Laterais / Cobertura ---
    { type: 'box', position: new Vector3(-mapSizeX * 0.3, 0, 0), size: new Vector3(4, boxHeight, 8) },
    { type: 'box', position: new Vector3(mapSizeX * 0.3, 0, 0), size: new Vector3(4, boxHeight, 8) },
    { type: 'box', position: new Vector3(0, 0, mapSizeZ * 0.3), size: new Vector3(15, boxHeight, 3) },
    { type: 'box', position: new Vector3(0, 0, -mapSizeZ * 0.3), size: new Vector3(15, boxHeight, 3) },

    // --- Árvores (Usando a nova treeCollisionSize refinada) ---
    { type: 'tree', position: new Vector3(-mapSizeX * 0.4, 0, mapSizeZ * 0.3), size: treeCollisionSize.clone() },
    { type: 'tree', position: new Vector3(mapSizeX * 0.4, 0, mapSizeZ * 0.3), size: treeCollisionSize.clone() },
    { type: 'tree', position: new Vector3(-mapSizeX * 0.4, 0, -mapSizeZ * 0.3), size: treeCollisionSize.clone() },
    { type: 'tree', position: new Vector3(mapSizeX * 0.4, 0, -mapSizeZ * 0.3), size: treeCollisionSize.clone() },
    { type: 'tree', position: new Vector3(mapSizeX * 0.15, 0, 0), size: treeCollisionSize.clone() },
    { type: 'tree', position: new Vector3(-mapSizeX * 0.15, 0, 0), size: treeCollisionSize.clone() },
];

const gameMap = new GameMap(defaultMinBounds, defaultMaxBounds, defaultSpawnPoints, defaultStaticObstacles);

export default gameMap;