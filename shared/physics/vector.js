/**
 * Representa um vetor 3D e fornece operações comuns.
 */
export class Vector3 {
    /** @type {number} */
    x;
    /** @type {number} */
    y;
    /** @type {number} */
    z;
  
    /**
     * Cria uma nova instância de Vector3.
     * @param {number} [x=0] - A componente x.
     * @param {number} [y=0] - A componente y.
     * @param {number} [z=0] - A componente z.
     */
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  
    // --- Métodos Estáticos (Retornam novos vetores) ---
  
    /**
     * Adiciona dois vetores.
     * @param {Vector3} v1 - O primeiro vetor.
     * @param {Vector3} v2 - O segundo vetor.
     * @returns {Vector3} Um novo vetor resultante da adição.
     */
    static add(v1, v2) {
      return new Vector3(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z);
    }
  
    /**
     * Subtrai o segundo vetor do primeiro.
     * @param {Vector3} v1 - O primeiro vetor.
     * @param {Vector3} v2 - O segundo vetor (a ser subtraído).
     * @returns {Vector3} Um novo vetor resultante da subtração.
     */
    static subtract(v1, v2) {
      return new Vector3(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z);
    }
  
    /**
     * Multiplica um vetor por um escalar.
     * @param {Vector3} v - O vetor.
     * @param {number} s - O escalar.
     * @returns {Vector3} Um novo vetor resultante da multiplicação.
     */
    static multiplyScalar(v, s) {
      return new Vector3(v.x * s, v.y * s, v.z * s);
    }
  
    /**
     * Divide um vetor por um escalar.
     * @param {Vector3} v - O vetor.
     * @param {number} s - O escalar.
     * @returns {Vector3} Um novo vetor resultante da divisão.
     */
    static divideScalar(v, s) {
      return s !== 0 ? new Vector3(v.x / s, v.y / s, v.z / s) : new Vector3(); // Evita divisão por zero
    }
  
    /**
     * Calcula a interpolação linear entre dois vetores.
     * @param {Vector3} v1 - O vetor inicial.
     * @param {Vector3} v2 - O vetor final.
     * @param {number} alpha - O fator de interpolação (0 a 1).
     * @returns {Vector3} Um novo vetor resultante da interpolação.
     */
    static lerp(v1, v2, alpha) {
       // Clamp alpha to the [0, 1] range
       const t = Math.max(0, Math.min(1, alpha));
       return new Vector3(
          v1.x + (v2.x - v1.x) * t,
          v1.y + (v2.y - v1.y) * t,
          v1.z + (v2.z - v1.z) * t
       );
    }
  
    // --- Métodos de Instância (Modificam o vetor atual ou retornam valores) ---
  
    /**
     * Adiciona outro vetor a este vetor.
     * @param {Vector3} v - O vetor a ser adicionado.
     * @returns {Vector3} A instância atual do vetor (para encadeamento).
     */
    add(v) {
      this.x += v.x;
      this.y += v.y;
      this.z += v.z;
      return this;
    }
  
    /**
     * Subtrai outro vetor deste vetor.
     * @param {Vector3} v - O vetor a ser subtraído.
     * @returns {Vector3} A instância atual do vetor (para encadeamento).
     */
    subtract(v) {
      this.x -= v.x;
      this.y -= v.y;
      this.z -= v.z;
      return this;
    }
  
    /**
     * Multiplica este vetor por um escalar.
     * @param {number} s - O escalar.
     * @returns {Vector3} A instância atual do vetor (para encadeamento).
     */
    multiplyScalar(s) {
      this.x *= s;
      this.y *= s;
      this.z *= s;
      return this;
    }
  
    /**
     * Divide este vetor por um escalar.
     * @param {number} s - O escalar.
     * @returns {Vector3} A instância atual do vetor (para encadeamento).
     */
    divideScalar(s) {
      if (s !== 0) {
        this.x /= s;
        this.y /= s;
        this.z /= s;
      } else {
        this.x = 0;
        this.y = 0;
        this.z = 0;
      }
      return this;
    }
  
    /**
     * Calcula a magnitude (comprimento) deste vetor.
     * @returns {number} A magnitude do vetor.
     */
    magnitude() {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
  
     /**
      * Calcula a magnitude quadrada deste vetor. Mais eficiente que magnitude() se apenas para comparações.
      * @returns {number} A magnitude quadrada do vetor.
      */
     magnitudeSq() {
         return this.x * this.x + this.y * this.y + this.z * this.z;
     }
  
    /**
     * Normaliza este vetor (transforma-o em um vetor unitário, de comprimento 1).
     * @returns {Vector3} A instância atual do vetor (para encadeamento).
     */
    normalize() {
      const mag = this.magnitude();
      // Usar magnitudeSq() aqui pode ser um pouco mais rápido se mag já foi calculado
      if (mag > 0.00001) { // Evita divisão por zero ou valores muito pequenos
          this.divideScalar(mag);
      } else {
          // Se a magnitude for zero, não podemos normalizar; talvez zerar ou manter? Zerar é mais seguro.
          this.x = 0;
          this.y = 0;
          this.z = 0;
      }
      return this;
    }
  
    /**
     * Calcula a distância entre este vetor e outro vetor.
     * @param {Vector3} v - O outro vetor.
     * @returns {number} A distância entre os dois vetores.
     */
    distanceTo(v) {
      const dx = this.x - v.x;
      const dy = this.y - v.y;
      const dz = this.z - v.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  
    /**
     * Calcula a distância quadrada entre este vetor e outro vetor.
     * @param {Vector3} v - O outro vetor.
     * @returns {number} A distância quadrada entre os dois vetores.
     */
    distanceToSq(v) {
      const dx = this.x - v.x;
      const dy = this.y - v.y;
      const dz = this.z - v.z;
      return dx * dx + dy * dy + dz * dz;
    }
  
    /**
     * Cria um clone deste vetor.
     * @returns {Vector3} Um novo vetor com os mesmos valores x, y, z.
     */
    clone() {
      return new Vector3(this.x, this.y, this.z);
    }
  
    /**
     * Copia os valores de outro vetor para este vetor.
     * @param {Vector3} v - O vetor cujos valores serão copiados.
     * @returns {Vector3} A instância atual do vetor (para encadeamento).
     */
    copy(v) {
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
      return this;
    }
  
    /**
     * Interpola linearmente este vetor em direção a outro vetor.
     * @param {Vector3} v - O vetor alvo da interpolação.
     * @param {number} alpha - O fator de interpolação (0 a 1).
     * @returns {Vector3} A instância atual do vetor (para encadeamento).
     */
    lerp(v, alpha) {
      // Clamp alpha to the [0, 1] range
      const t = Math.max(0, Math.min(1, alpha));
      this.x += (v.x - this.x) * t;
      this.y += (v.y - this.y) * t;
      this.z += (v.z - this.z) * t;
      return this;
    }
  
    /**
     * Verifica se este vetor é igual a outro vetor (dentro de uma pequena tolerância).
     * @param {Vector3} v - O outro vetor.
     * @param {number} [epsilon=0.00001] - A tolerância para a comparação.
     * @returns {boolean} `true` se os vetores forem considerados iguais, `false` caso contrário.
     */
    equals(v, epsilon = 0.00001) {
      return (
        Math.abs(this.x - v.x) < epsilon &&
        Math.abs(this.y - v.y) < epsilon &&
        Math.abs(this.z - v.z) < epsilon
      );
    }
  
    /**
     * Define os componentes x, y, z deste vetor.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {Vector3} A instância atual do vetor (para encadeamento).
     */
    set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
  
    /**
     * Define este vetor como (0, 0, 0).
     * @returns {Vector3} A instância atual do vetor (para encadeamento).
     */
    zero() {
      this.x = 0;
      this.y = 0;
      this.z = 0;
      return this;
    }
  
     /**
      * Retorna uma representação de string do vetor.
      * @returns {string}
      */
     toString() {
         return `Vector3(${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${this.z.toFixed(2)})`;
     }

     /**
     * Calcula o produto vetorial (cross product) entre este vetor e outro vetor,
     * armazenando o resultado neste vetor. (v = this x v)
     * @param {Vector3} v - O outro vetor.
     * @returns {Vector3} A instância atual do vetor (para encadeamento).
     */
    cross(v) {
      const x = this.x, y = this.y, z = this.z;
      const vx = v.x, vy = v.y, vz = v.z;

      this.x = y * vz - z * vy;
      this.y = z * vx - x * vz;
      this.z = x * vy - y * vx;

      return this;
    }

    /**
     * Calcula o produto vetorial (cross product) entre dois vetores.
     * @param {Vector3} a - O primeiro vetor.
     * @param {Vector3} b - O segundo vetor.
     * @returns {Vector3} Um novo vetor resultante do produto vetorial (a x b).
     */
    static crossVectors(a, b) {
      const ax = a.x, ay = a.y, az = a.z;
      const bx = b.x, by = b.y, bz = b.z;

      const x = ay * bz - az * by;
      const y = az * bx - ax * bz;
      const z = ax * by - ay * bx;

      return new Vector3(x, y, z);
    }

     
  
    /**
     * Vetor zero estático (0, 0, 0). Use com moderação para evitar mutações acidentais.
     * @type {Vector3}
     */
    static get ZERO() {
        return new Vector3(0, 0, 0);
    }
  
     /**
      * Vetor unitário X estático (1, 0, 0).
      * @type {Vector3}
      */
     static get UNIT_X() {
         return new Vector3(1, 0, 0);
     }
  
      /**
       * Vetor unitário Y estático (0, 1, 0).
       * @type {Vector3}
       */
      static get UNIT_Y() {
          return new Vector3(0, 1, 0);
      }
  
       /**
        * Vetor unitário Z estático (0, 0, 1).
        * @type {Vector3}
        */
       static get UNIT_Z() {
           return new Vector3(0, 0, 1);
       }
  }