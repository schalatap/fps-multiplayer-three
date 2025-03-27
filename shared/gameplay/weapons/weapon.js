import { log, warn } from '../../utils/logger.js';

/**
 * Classe base abstrata para todas as armas do jogo.
 */
export class Weapon {
    /** @type {import('../../entities/player.js').Player} */
    owner; // O jogador que empunha a arma

    // Estatísticas da arma (serão definidas pelas subclasses)
    damage = 0;
    fireRate = 1; // Tiros por segundo
    range = 50;
    projectileSpeed = 50;
    ammo = Infinity;
    maxAmmo = Infinity;
    reloadTime = 0;

    /** @type {number} */
    fireInterval; // Intervalo entre tiros em milissegundos
    /** @type {number} */
    lastFireTime = 0; // Timestamp da última vez que atirou
    isReloading = false;
    reloadStartTime = 0;

    /**
     * @param {import('../../entities/player.js').Player} owner - O jogador que possui esta arma.
     */
    constructor(owner) {
        if (!owner) {
            throw new Error("Weapon must have an owner (Player).");
        }
        this.owner = owner;
        // O fireInterval será calculado pelas subclasses com base no fireRate
        this.fireInterval = 1000 / this.fireRate; // Convertido para ms
    }

    /**
     * Verifica se a arma pode disparar no momento atual.
     * Considera a cadência de tiro e o estado de recarga.
     * @returns {boolean} `true` se pode disparar, `false` caso contrário.
     */
    canFire() {
        const now = Date.now();
        if (this.isReloading) {
            // Poderia verificar se a recarga terminou aqui, mas geralmente é melhor
            // ter um método update ou um timer que reseta isReloading.
            // log(`Cannot fire: Reloading.`);
            return false;
        }
        if (this.ammo <= 0 && this.maxAmmo !== Infinity) {
             // log(`Cannot fire: Out of ammo.`);
             // Iniciar recarga automaticamente?
             // this.startReload();
             return false;
        }
        if (now - this.lastFireTime < this.fireInterval) {
            // log(`Cannot fire: Cooldown active.`);
            return false; // Ainda em cooldown
        }
        return true;
    }

    /**
     * Tenta disparar a arma na direção especificada.
     * Método abstrato a ser implementado pelas subclasses.
     * @param {import('../../physics/vector.js').Vector3} direction - A direção normalizada do tiro.
     * @returns {object | null} Retorna os dados necessários para criar o projétil no servidor
     *                          (ex: { type: 'bullet', ownerId, damage, speed, range, origin, velocity }),
     *                          ou `null` se o tiro falhou (cooldown, sem munição, etc.).
     * @abstract
     */
    fire(direction) {
        throw new Error("Method 'fire(direction)' must be implemented by subclasses.");
        // Exemplo de implementação em subclasse:
        // if (!this.canFire()) {
        //     return null;
        // }
        // this.lastFireTime = Date.now();
        // if(this.maxAmmo !== Infinity) this.ammo--;
        // log(`Player ${this.owner.id} fired ${this.constructor.name}. Ammo left: ${this.ammo}`);
        // // Calcular origem, velocidade
        // // Retornar dados do projétil
        // return { type: 'bullet', ... };
    }

    /**
     * Inicia o processo de recarga (se aplicável).
     */
    startReload() {
        if (this.maxAmmo === Infinity || this.isReloading || this.ammo === this.maxAmmo) {
            return; // Não recarrega se for munição infinita, já recarregando ou com pente cheio
        }
        this.isReloading = true;
        this.reloadStartTime = Date.now();
        log(`Player ${this.owner.id} started reloading ${this.constructor.name}...`);
        // Usar setTimeout ou lógica no update para finalizar a recarga
        setTimeout(() => this.finishReload(), this.reloadTime * 1000);
    }

    /**
     * Finaliza o processo de recarga.
     */
    finishReload() {
        if (!this.isReloading) return;
        this.isReloading = false;
        this.ammo = this.maxAmmo; // Enche o pente
        log(`Player ${this.owner.id} finished reloading ${this.constructor.name}. Ammo: ${this.ammo}`);
    }

    /**
     * Método de atualização da arma (ex: para recarga).
     * @param {number} deltaTime
     */
    update(deltaTime) {
        // A lógica de recarga com setTimeout é mais simples, mas
        // um update() poderia ser usado para animações ou lógicas mais complexas.
        // if (this.isReloading) {
        //     if (Date.now() - this.reloadStartTime >= this.reloadTime * 1000) {
        //         this.finishReload();
        //     }
        // }
    }
}