import { Projectile } from '../../../shared/entities/projectile.js';
import { Vector3 } from '../../../shared/physics/vector.js';
import { createProjectileMesh } from '../generation/projectile-model-generator.js'; // <-- Importar generator
import { log, warn } from '../../../shared/utils/logger.js';
import { clamp } from '../../../shared/utils/math-utils.js';
import { SERVER_TICK_INTERVAL_MS } from '../../../shared/constants/game-settings.js';

const RENDER_DELAY_PROJ = SERVER_TICK_INTERVAL_MS * 1.5; // Delay similar ao do jogador

/**
 * Representa a instância de um projétil no lado do cliente.
 * Herda da classe Projectile compartilhada.
 */
export class ClientProjectile extends Projectile {

  /** @type {import('../../../shared/models/projectile-state.js').ProjectileState | null} */ // Assume que ProjectileState existe ou é o retorno de getState()
  previousState = null;
  /** @type {import('../../../shared/models/projectile-state.js').ProjectileState | null} */
  targetState = null;
  lastStateTimestamp = 0;
  targetStateTimestamp = 0;

  /**
   * Referência ao mesh 3D associado a este projétil.
   * @type {import('three').Mesh | null}
   */
  mesh = null;

  /**
   * Cria uma nova instância de ClientProjectile.
   * @param {object} initialState - O estado inicial recebido do servidor (resultado de projectile.getState()).
   */
  constructor(initialState) {
    // Chama o construtor base apenas com ID e tipo inicialmente. Posição será definida.
    super(initialState.ownerId || 'unknown', new Vector3(), new Vector3(), 0, 0, 0, initialState.type || 'default', initialState.id);

    // Guarda estado para interpolação
    this.targetState = { ...initialState };
    this.previousState = { ...initialState };
    this.targetStateTimestamp = initialState.timestamp || Date.now(); // Usa timestamp do gameState
    this.lastStateTimestamp = this.targetStateTimestamp - SERVER_TICK_INTERVAL_MS;

    // Aplica o estado inicial completo (incluindo posição)
    this.setState(initialState);

    // Criação do Mesh
    try {
        // Usa o tipo e talvez um tamanho padrão ou vindo do estado
        this.mesh = createProjectileMesh(this.projectileType, this.width);
        this.mesh.uuid = this.id; // Facilita encontrar na cena
        this.mesh.userData = { projectileId: this.id, isProjectileMesh: true };
        this.mesh.position.copy(this.position); // Define posição inicial do mesh
        // log(`[CLIENT] Created mesh for projectile ${this.id}`);
    } catch (error) {
        warn(`[CLIENT] Failed to create mesh for projectile ${this.id}:`, error);
        this.mesh = null;
    }

    // log(`[CLIENT] ClientProjectile created: ${this.id} (Type: ${this.projectileType})`);
  }

  /**
   * Atualiza os estados para interpolação.
   * @param {object} newState - O novo estado do projétil vindo do servidor.
   * @param {number} serverTimestamp - Timestamp do GameState.
   */
  updateState(newState, serverTimestamp) {
    if (this.targetState) {
        this.previousState = { ...this.targetState };
        this.lastStateTimestamp = this.targetStateTimestamp;
    }
    this.targetState = newState;
    this.targetStateTimestamp = serverTimestamp;

    // Aplica estados não posicionais diretamente (se houver algum a sincronizar)
     if (newState.ownerId) this.ownerId = newState.ownerId;
     if (newState.type) this.projectileType = newState.type; // Atualiza tipo se mudar
  }

  /**
   * Atualiza a posição do projétil via interpolação.
   * @param {number} deltaTime
   */
  update(deltaTime) {
    // Interpolação de Posição (similar ao ClientPlayer remoto)
    if (this.previousState && this.targetState) {
        const now = Date.now();
        const interpolationTime = now - RENDER_DELAY_PROJ;
        const timeDiff = this.targetStateTimestamp - this.lastStateTimestamp;
        let alpha = (timeDiff > 0) ? (interpolationTime - this.lastStateTimestamp) / timeDiff : 1;
        alpha = clamp(alpha, 0, 1);

        if (this.previousState.position && this.targetState.position) {
            const prevPos = new Vector3(this.previousState.position.x, this.previousState.position.y, this.previousState.position.z);
            const targetPos = new Vector3(this.targetState.position.x, this.targetState.position.y, this.targetState.position.z);
            this.position.copy(prevPos).lerp(targetPos, alpha);
        }
      } else if (this.targetState?.position){
          this.position.set(this.targetState.position.x, this.targetState.position.y, this.targetState.position.z);
      }

    // Atualiza a posição do mesh
    if (this.mesh) {
      this.mesh.position.copy(this.position);
    }
  }

   /**
    * Adiciona o mesh deste projétil à cena Three.js.
    * @param {import('three').Scene} scene
    */
   addToScene(scene) {
       if (this.mesh && !this.mesh.parent) {
           scene.add(this.mesh);
           // log(`[CLIENT] Added mesh for projectile ${this.id} to scene.`);
       } else if (!this.mesh) {
           warn(`[CLIENT] Cannot add projectile ${this.id} to scene: mesh not created.`);
       }
   }

   /**
    * Remove o mesh deste projétil da cena Three.js.
    * @param {import('three').Scene} scene
    */
   removeFromScene(scene) {
       if (this.mesh && this.mesh.parent === scene) {
           scene.remove(this.mesh);
           // log(`[CLIENT] Removed mesh for projectile ${this.id} from scene.`);
           // Dispose da geometria e material pode ser feito aqui ou no SceneManager
           // para garantir limpeza, especialmente se não forem cacheados/reutilizados.
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
       }
   }
}