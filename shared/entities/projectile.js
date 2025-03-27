import { GameObject } from '../base/game-object.js';
import { Vector3 } from '../physics/vector.js';
import { generateUUID } from '../utils/math-utils.js';
import { log } from '../utils/logger.js';

/**
 * Classe base para projéteis (balas, magias, etc.).
 * Herda de GameObject.
 */
export class Projectile extends GameObject {
  /** @type {string} */
  ownerId; // ID do jogador que disparou
  /** @type {number} */
  damage = 0;
  /** @type {number} */
  speed = 20;
  /** @type {number} */
  range = 100; // Distância máxima
  /** @type {Vector3} */
  origin; // Ponto de onde foi disparado

  /**
   * Distância percorrida até agora.
   * @type {number}
   */
  distanceTraveled = 0;

  /**
   * Flag para marcar para remoção no próximo tick do servidor.
   * @type {boolean}
   */
  markForRemoval = false;

  // Dimensões para colisão (podem ser específicas do tipo de projétil)
  width = 0.1;
  height = 0.1;
  depth = 0.1;

  projectileType = 'default'; // Adiciona um tipo para diferenciar no cliente

  /**
   * Cria uma nova instância de Projectile.
   * @param {string} ownerId - ID do jogador que disparou.
   * @param {Vector3} origin - Posição inicial do disparo.
   * @param {Vector3} velocity - Vetor de velocidade inicial.
   * @param {number} damage - Dano causado pelo projétil.
   * @param {number} speed - Velocidade escalar do projétil.
   * @param {number} range - Alcance máximo.
   * @param {string} [projectileType='default'] - Tipo do projétil.
   * @param {string} [id=generateUUID()] - ID único do projétil.
   */
  constructor(ownerId, origin, velocity, damage, speed, range, projectileType = 'default', id = generateUUID()) {
    // A posição inicial é a origem
    super(id, origin.clone(), velocity.clone());

    this.ownerId = ownerId;
    this.origin = origin.clone();
    this.damage = damage;
    this.speed = speed; // A velocidade escalar pode ser redundante se já temos o vetor velocity
    this.range = range;
    this.projectileType = projectileType; // Armazena o tipo do projétil
    this.distanceTraveled = 0;
    this.markForRemoval = false;


    // Ajusta as dimensões se necessário (ex: baseado em constantes)
    // this.width = PROJECTILE_SIZE; etc.
  }

  /**
   * Atualiza o estado do projétil.
   * Move o projétil e verifica se excedeu o alcance.
   * (A colisão será verificada externamente pelo CollisionSystem no servidor).
   * @param {number} deltaTime - Tempo desde a última atualização.
   */
  update(deltaTime) {
    // O MovementSystem cuidará da atualização da posição:
    // this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

    // Calcula a distância percorrida neste frame e acumula
    const distanceThisFrame = this.velocity.magnitude() * deltaTime;
    this.distanceTraveled += distanceThisFrame;

    // Verifica se excedeu o alcance
    if (this.distanceTraveled >= this.range) {
      this.markForRemoval = true;
      // log(`Projectile ${this.id} exceeded range and marked for removal.`);
    }
  }

  /**
   * Calcula a AABB do projétil. Versão aprimorada para colisão precisa.
   * @param {Vector3} [pos=this.position] - Posição opcional para calcular AABB.
   * @returns {{min: Vector3, max: Vector3}}
   */
  getBoundingBox(pos = this.position) {
      const halfSize = this.width / 2; // Assume cubo por simplicidade
      // Expansão muito pequena ou zero para colisão mais precisa
      const expansion = 0.001; 
      return {
          min: new Vector3(
              pos.x - halfSize - expansion,
              pos.y - halfSize - expansion, // Centro Y - metade (projétil tem posição central)
              pos.z - halfSize - expansion
          ),
          max: new Vector3(
              pos.x + halfSize + expansion,
              pos.y + halfSize + expansion, // Centro Y + metade
              pos.z + halfSize + expansion
          ),
      };
  }

  /**
   * Obtém o estado serializável do projétil para sincronização.
   * @returns {object} Estado do projétil (id, ownerId, position).
   */
  getState() {
    const baseState = super.getState(); // id, position
    return {
      ...baseState,
      ownerId: this.ownerId,
      type: this.projectileType, // Envia o tipo para o cliente
      // O cliente não precisa necessariamente de damage, speed, range, origin, velocity
      // Apenas a posição (e talvez o tipo) para renderizar.
      // type: 'bullet' // Pode ser útil adicionar um tipo
    };
  }

  /**
   * Define o estado do projétil (usado principalmente no cliente).
   * @param {object} state
   */
  setState(state) {
    super.setState(state); // Define position
    if (state.ownerId) this.ownerId = state.ownerId;
    if (state.type) this.projectileType = state.type;
  }
}