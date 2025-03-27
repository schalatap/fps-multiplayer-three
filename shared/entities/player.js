import { GameObject } from '../base/game-object.js';
import { Vector3 } from '../physics/vector.js';
import { clamp, generateUUID } from '../utils/math-utils.js';
import { log, warn } from '../utils/logger.js';
import { PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_DEPTH } from '../base/collidable.js';
// Importar constantes de dano localizado
import {
    DAMAGE_MULTIPLIER_HEAD,
    DAMAGE_MULTIPLIER_TORSO,
    DAMAGE_MULTIPLIER_ARMS,
    DAMAGE_MULTIPLIER_LEGS,
    DAMAGE_MULTIPLIER_DEFAULT
} from '../constants/combat-settings.js';

const DEFAULT_HEALTH = 100;

/**
 * Representa um jogador no jogo, com propriedades básicas como vida e pontuação.
 * Herda de GameObject.
 */
export class Player extends GameObject {
  /** @type {number} */
  health;
  /** @type {number} */
  maxHealth;
  /** @type {string} */
  name;
  /** @type {number} */
  score;

  // Definir dimensões para cálculo da bounding box
  width = PLAYER_WIDTH;
  height = PLAYER_HEIGHT;
  depth = PLAYER_DEPTH;

  /**
   * A arma atualmente equipada pelo jogador.
   * @type {import('../gameplay/weapons/weapon.js').Weapon | null} // <-- Adicionado (Tarefa 6)
   */
  currentWeapon = null;
  
  /** @type {boolean} */
  isAlive = true; // Adicionado na Etapa 20, inicializado como true

  /**
   * Cria uma nova instância de Player.
   * @param {string} [id=generateUUID()] - ID único do jogador.
   * @param {string} [name='Player'] - Nome do jogador.
   * @param {Vector3} [position=new Vector3()] - Posição inicial.
   * @param {Vector3} [velocity=new Vector3()] - Velocidade inicial.
   * @param {number} [maxHealth=DEFAULT_HEALTH] - Vida máxima inicial.
   */
  constructor(id = generateUUID(), name = `Player_${id.substring(0, 4)}`, position = new Vector3(), velocity = new Vector3(), maxHealth = DEFAULT_HEALTH) {
    super(id, position, velocity); // Chama o construtor da classe pai (GameObject)

    this.name = name;
    this.maxHealth = maxHealth;
    this.health = this.maxHealth; // Começa com vida cheia
    this.score = 0;
    this.currentWeapon = null; // Inicializa sem arma
    this.isAlive = true; // Garante que comece vivo
  }

  /**
   * Aplica dano ao jogador, reduzindo sua vida.
   * A vida não pode ficar abaixo de 0.
   * @param {number} baseAmount - Quantidade de dano base a ser aplicada.
   * @param {string} [hitboxKey='default'] - A chave da hitbox atingida ('head', 'torso', etc.).
   */
  takeDamage(baseAmount, hitboxKey = 'default') {
    if (!this.isAlive || baseAmount <= 0) return; // Não pode tomar dano se já estiver morto
    
    let multiplier = DAMAGE_MULTIPLIER_DEFAULT;
    switch (hitboxKey?.toLowerCase()) { // Adicionado '?' para segurança e toLowerCase
        case 'head': multiplier = DAMAGE_MULTIPLIER_HEAD; break;
        case 'torso': multiplier = DAMAGE_MULTIPLIER_TORSO; break;
        case 'arms': multiplier = DAMAGE_MULTIPLIER_ARMS; break;
        case 'legs': multiplier = DAMAGE_MULTIPLIER_LEGS; break;
        default: multiplier = DAMAGE_MULTIPLIER_DEFAULT;
    }
    const finalAmount = Math.round(baseAmount * multiplier);
    
    const previousHealth = this.health;
    this.health = clamp(this.health - finalAmount, 0, this.maxHealth);
    
    log(`Player ${this.id} (${this.name}) took ${finalAmount} damage (${baseAmount} * ${multiplier.toFixed(1)}x at ${hitboxKey}). Health: ${previousHealth.toFixed(0)} -> ${this.health.toFixed(0)}/${this.maxHealth.toFixed(0)}`);
    
    if (this.health <= 0 && this.isAlive) { // Só processa morte uma vez
        this.isAlive = false;
        log(`Player ${this.id} (${this.name}) has died.`);
        if (typeof this.onDeath === 'function') {
            this.onDeath();
        }
    }
  }

  /**
   * Cura o jogador, aumentando sua vida.
   * A vida não pode ultrapassar maxHealth.
   * @param {number} amount - Quantidade de cura a ser aplicada.
   */
  heal(amount) {
    // Só pode curar se estiver vivo e a cura for positiva
    if (!this.isAlive || amount <= 0) return;
    const previousHealth = this.health;
    this.health = clamp(this.health + amount, 0, this.maxHealth);
     if (this.health > previousHealth) {
         log(`Player ${this.id} (${this.name}) healed ${amount}. Health: ${previousHealth} -> ${this.health}`);
     }
  }

  /**
   * Sobrescreve o método update de GameObject.
   * @param {number} deltaTime - Tempo decorrido desde a última atualização.
   */
  update(deltaTime) {
    super.update(deltaTime);
    // Só atualiza a arma se estiver vivo? (Pode depender da lógica de recarga/etc.)
    if (this.isAlive) {
        this.currentWeapon?.update(deltaTime);
    }
  }

  /**
   * Equipa uma nova arma. Descarta a anterior se houver. (Tarefa 6)
   * @param {import('../gameplay/weapons/weapon.js').Weapon | null} weaponInstance - A instância da arma a ser equipada, ou null para desequipar.
   */
  equipWeapon(weaponInstance) {
    if (this.currentWeapon === weaponInstance) return; // Já está equipada

    const oldWeaponName = this.currentWeapon?.constructor.name ?? 'nothing';
    this.currentWeapon = weaponInstance;
    const newWeaponName = this.currentWeapon?.constructor.name ?? 'nothing';
    log(`Player ${this.id} equipped ${newWeaponName} (was ${oldWeaponName}).`);
    // Poderia haver lógica aqui para soltar a arma antiga no mundo, etc.
  }

  /**
   * Tenta disparar a arma atualmente equipada.
   * @param {Vector3} direction - A direção normalizada do tiro.
   * @returns {object | null} Os dados do projétil gerado (se houver) ou null.
   */
  fireWeapon(direction) {
    // Não pode atirar se estiver morto ou sem arma
    if (!this.isAlive || !this.currentWeapon) {
        if (!this.isAlive) warn(`Player ${this.id} tried to fire while dead.`);
        if (!this.currentWeapon) warn(`Player ${this.id} tried to fire but has no weapon equipped.`);
        return null;
    }

    return this.currentWeapon.fire(direction);
  }

  /**
   * Restaura o estado do jogador para vivo em uma nova posição.
   * @param {Vector3} position - Nova posição de spawn.
   */
  respawn(position) {
      this.health = this.maxHealth;
      this.isAlive = true;
      this.position.copy(position);
      this.velocity.zero(); // Zera velocidade ao respawnar
      log(`Player ${this.id} (${this.name}) respawned at ${position.toString()}.`);
      // Futuro: Poderia adicionar invulnerabilidade temporária aqui
  }

  /**
   * Obtém o estado serializável do jogador para sincronização.
   * Inclui propriedades adicionais além das de GameObject.
   * @returns {object} Estado do jogador (id, position, health, maxHealth, name, score).
   */
  getState() {
    const baseState = super.getState(); // Obtém o estado de GameObject (id, position)
    return {
      ...baseState, // Inclui id, position
      health: this.health,
      maxHealth: this.maxHealth,
      name: this.name,
      score: this.score,
      isAlive: this.isAlive, // Inclui isAlive no estado (Etapa 20)
      // Futuramente: Adicionar ID ou tipo da arma equipada ao estado?
      // currentWeaponType: this.currentWeapon?.constructor.name.toLowerCase() ?? null,
      // ammo: this.currentWeapon?.ammo ?? 0,
    };
  }

  /**
   * Define o estado do jogador com base nos dados recebidos.
   * @param {object} state - O objeto de estado.
   */
  setState(state) {
    super.setState(state);

    if (state.health !== undefined) this.health = state.health;
    if (state.maxHealth !== undefined) this.maxHealth = state.maxHealth;
    if (state.name !== undefined) this.name = state.name;
    if (state.score !== undefined) this.score = state.score;
    if (state.isAlive !== undefined) { // <-- Garantir atualização
        // Se o estado mudou, logar a mudança no cliente (pode ser útil para debug)
        // if (this.isAlive !== state.isAlive) {
        //     log(`ClientPlayer ${this.id} state changed: isAlive=${state.isAlive}`);
        // }
        this.isAlive = state.isAlive;
    }
  }

  /**
   * Calcula a AABB do jogador na posição especificada (pés na posição Y).
   * @param {Vector3} [pos=this.position] - Posição base (pés) para calcular a AABB.
   * @returns {{min: Vector3, max: Vector3}}
   */
  getBoundingBox(pos = this.position) {
    return this._calculateAABB(pos);
  }

  /**
   * Calcula e retorna as Hitboxes AABB do jogador no espaço do mundo na posição atual.
   * @returns {Object.<string, {min: Vector3, max: Vector3}>} Mapa de hitboxes.
   */
  getHitboxes() {
    return this._calculateHitboxes(this.position);
  }

  /**
   * Calcula a AABB em uma posição específica (helper interno).
   * @param {Vector3} pos - A posição base (pés) para calcular a AABB.
   * @returns {{min: Vector3, max: Vector3}}
   * @protected
   */
  _calculateAABB(pos) {
      const halfWidth = this.width / 2;
      const halfDepth = this.depth / 2;
      const expansion = 0.01;
      return {
          min: new Vector3(
              pos.x - halfWidth - expansion,
              pos.y - expansion, // Base Y
              pos.z - halfDepth - expansion
          ),
          max: new Vector3(
              pos.x + halfWidth + expansion,
              pos.y + this.height + expansion, // Topo Y = base + altura
              pos.z + halfDepth + expansion
          ),
      };
  }

   /**
   * Calcula as hitboxes em uma posição específica (helper interno).
   * @param {Vector3} pos - A posição base (pés) para calcular as hitboxes.
   * @returns {Object.<string, {min: Vector3, max: Vector3}>} Mapa de hitboxes.
   * @protected
   */
   _calculateHitboxes(pos) {
      const hitboxes = {};
      const epsilon = 0.02; // Pequena sobreposição/folga

      // Dimensões relativas para o modelo voxel
      const headSize = this.width * 0.7; // Cabeça cúbica
      const torsoHeight = this.height * 0.45;
      const torsoWidth = this.width;
      const torsoDepth = this.depth * 0.8;
      const legHeight = this.height * 0.4;
      const legWidth = this.width * 0.4; // Pernas mais finas
      const legDepth = this.depth * 0.4;
      // Braços omitidos por simplicidade, mas poderiam ser adicionados

      const legTopY = pos.y + legHeight;
      const torsoTopY = legTopY + torsoHeight;
      const headCenterY = torsoTopY + headSize / 2; // Centro do cubo da cabeça

      // Cabeça (Cubo)
      const headCenter = new Vector3(pos.x, headCenterY, pos.z);
      hitboxes['head'] = {
          min: headCenter.clone().subtract(new Vector3(headSize / 2 + epsilon, headSize / 2 + epsilon, headSize / 2 + epsilon)),
          max: headCenter.clone().add(new Vector3(headSize / 2 + epsilon, headSize / 2 + epsilon, headSize / 2 + epsilon))
      };

      // Tronco
      const torsoCenter = new Vector3(pos.x, legTopY + torsoHeight / 2, pos.z);
      hitboxes['torso'] = {
          min: torsoCenter.clone().subtract(new Vector3(torsoWidth / 2 + epsilon, torsoHeight / 2 + epsilon, torsoDepth / 2 + epsilon)),
          max: torsoCenter.clone().add(new Vector3(torsoWidth / 2 + epsilon, torsoHeight / 2 + epsilon, torsoDepth / 2 + epsilon))
      };

      // Pernas (Caixa única - simplificado, poderia ser duas)
      const legCenter = new Vector3(pos.x, pos.y + legHeight / 2, pos.z);
      hitboxes['legs'] = {
          min: legCenter.clone().subtract(new Vector3(legWidth / 2 + epsilon, legHeight / 2 + epsilon, legDepth / 2 + epsilon)), // Usando legWidth/Depth
          max: legCenter.clone().add(new Vector3(legWidth / 2 + epsilon, legHeight / 2 + epsilon, legDepth / 2 + epsilon))
      };

      return hitboxes;
  }
}