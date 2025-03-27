import { Vector3 } from '../physics/vector.js';
import { generateUUID } from '../utils/math-utils.js';

/**
 * Classe base para todos os objetos dinâmicos no mundo do jogo.
 */
export class GameObject {
  /**
   * Identificador único do objeto.
   * @type {string}
   */
  id;

  /**
   * Posição do objeto no mundo.
   * @type {Vector3}
   */
  position;

  /**
   * Velocidade do objeto.
   * @type {Vector3}
   */
  velocity;

  // Rotação pode ser adicionada depois, usando Euler ou Quaternions
  // rotation = new Vector3(); // Euler (simples, mas sofre de Gimbal Lock)
  // quaternion = { x: 0, y: 0, z: 0, w: 1 }; // Quaternion (mais robusto)

  /**
   * Cria uma nova instância de GameObject.
   * @param {string} [id] - ID opcional. Se não fornecido, um UUID será gerado.
   * @param {Vector3} [position] - Posição inicial opcional.
   * @param {Vector3} [velocity] - Velocidade inicial opcional.
   */
  constructor(id = generateUUID(), position = new Vector3(), velocity = new Vector3()) {
    this.id = id;
    this.position = position instanceof Vector3 ? position.clone() : new Vector3(position?.x, position?.y, position?.z);
    this.velocity = velocity instanceof Vector3 ? velocity.clone() : new Vector3(velocity?.x, velocity?.y, velocity?.z);
  }

  /**
   * Método de atualização, a ser sobrescrito pelas subclasses.
   * Chamado a cada tick do loop de jogo (servidor) ou frame (cliente).
   * @param {number} deltaTime - Tempo decorrido desde a última atualização, em segundos.
   */
  update(deltaTime) {
    // A lógica de atualização específica da entidade (movimento, lógica de IA, etc.)
    // deve ser implementada nas classes filhas.
    // O movimento básico (posição += velocidade * deltaTime) será feito pelo MovementSystem.
  }

  /**
   * Obtém o estado serializável básico deste objeto para sincronização de rede.
   * As subclasses devem sobrescrever este método para adicionar suas próprias propriedades.
   * @returns {object} Um objeto contendo o estado essencial (id, position).
   */
  getState() {
    // Retorna um objeto simples, não a instância de Vector3 diretamente,
    // para facilitar a serialização JSON e evitar referências circulares.
    return {
      id: this.id,
      position: { x: this.position.x, y: this.position.y, z: this.position.z },
      // velocity não é sempre necessária no cliente, pode ser omitida aqui
      // velocity: { x: this.velocity.x, y: this.velocity.y, z: this.velocity.z }
    };
  }

  /**
   * Define o estado deste objeto com base nos dados recebidos (ex: da rede).
   * As subclasses devem sobrescrever este método para lidar com suas próprias propriedades.
   * @param {object} state - O objeto de estado contendo novas propriedades.
   */
  setState(state) {
    if (state.position) {
      this.position.set(state.position.x ?? this.position.x, state.position.y ?? this.position.y, state.position.z ?? this.position.z);
    }
    // if (state.velocity) {
    //   this.velocity.set(state.velocity.x ?? this.velocity.x, state.velocity.y ?? this.velocity.y, state.velocity.z ?? this.velocity.z);
    // }
    // ID geralmente não é alterado após a criação
  }
}