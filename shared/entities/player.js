import { GameObject } from '../base/game-object.js';
import { Vector3 } from '../physics/vector.js';
import { clamp, generateUUID } from '../utils/math-utils.js';
import { log, warn } from '../utils/logger.js'; // Added warn import
import { PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_DEPTH } from '../base/collidable.js';

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
   * @param {number} amount - Quantidade de dano a ser aplicada.
   */
  takeDamage(amount) {
    if (!this.isAlive || amount <= 0) return; // Não pode tomar dano se já estiver morto
    
    const previousHealth = this.health;
    this.health = clamp(this.health - amount, 0, this.maxHealth);
    
    // Log Aprimorado (Tarefa 3)
    log(`Player ${this.id} (${this.name}) took ${amount} damage. Health: ${previousHealth.toFixed(0)} -> ${this.health.toFixed(0)}/${this.maxHealth.toFixed(0)}`);
    
    if (this.health <= 0) {
        this.isAlive = false;
        log(`Player ${this.id} (${this.name}) has died.`);
        // Chama o método onDeath no ServerPlayer (se existir)
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
   * Calcula e retorna a Axis-Aligned Bounding Box (AABB) do jogador no espaço do mundo.
   * @param {Vector3} [pos=this.position] - Posição opcional para calcular AABB (útil para colisão preditiva).
   * @returns {{min: Vector3, max: Vector3}} A AABB do jogador.
   */
  getBoundingBox(pos = this.position) {
    const halfWidth = this.width / 2;
    const halfDepth = this.depth / 2;
    // Expansão reduzida para colisão mais precisa com obstáculos
    const expansion = 0.01;
    return {
        min: new Vector3(
            pos.x - halfWidth - expansion,
            pos.y - expansion, // Base Y (pés estão em pos.y)
            pos.z - halfDepth - expansion
        ),
        max: new Vector3(
            pos.x + halfWidth + expansion,
            pos.y + this.height + expansion, // Topo Y = base + altura
            pos.z + halfDepth + expansion
        ),
    };
  }
  
}