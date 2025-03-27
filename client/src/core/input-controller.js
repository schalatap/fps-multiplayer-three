import { log, warn } from '../../../shared/utils/logger.js';
import { clamp } from '../../../shared/utils/math-utils.js';

const MOUSE_SENSITIVITY = 0.002;
const MIN_PITCH = -Math.PI / 2 + 0.01; // Limite para olhar para baixo (quase reto)
const MAX_PITCH = Math.PI / 2 - 0.01;  // Limite para olhar para cima (quase reto)

/**
 * Captura e processa a entrada do usuário (teclado e mouse) para controle do jogo.
 */
export class InputController {
    /**
     * O elemento do DOM que receberá o foco e os eventos (geralmente o container do jogo).
     * @type {HTMLElement}
     */
    targetElement;

    /**
     * Mapa que armazena o estado atual das teclas pressionadas.
     * Ex: { 'W': true, 'A': false, ... }
     * @type {Record<string, boolean>}
     */
    keys;

    /**
     * Rotação horizontal acumulada (olhar para esquerda/direita) em radianos.
     * @type {number}
     */
    yaw;

    /**
     * Rotação vertical acumulada (olhar para cima/baixo) em radianos.
     * @type {number}
     */
    pitch;

    /**
     * Indica se o Pointer Lock está atualmente ativo.
     * @type {boolean}
     */
    isPointerLocked;

    /**
     * Contador sequencial para pacotes de input enviados ao servidor.
     * @type {number}
     */
    inputSequenceNumber = 0;

    /**
     * Estado do botão primário do mouse (clique esquerdo).
     * @type {boolean}
     */
    mouseButton0 = false;
    
    /**
     * Estado do botão secundário do mouse (clique direito).
     * @type {boolean}
     */
    mouseButton2 = false;

    // Handlers de eventos vinculados (para remover listeners corretamente)
    boundOnMouseMove;
    boundOnKeyDown;
    boundOnKeyUp;
    boundOnPointerLockChange;
    boundOnPointerLockError;
    boundOnMouseDown;
    boundOnMouseUp;

    // Flags para rastrear pressionamento único de teclas (ex: painel de atributos)
    attributePanelKeyPressed = false; // Usado na Etapa 22
    attributePanelKeyJustPressed = false; // Para retornar true apenas uma vez

    /**
     * Cria uma instância do InputController.
     * @param {HTMLElement} targetElement - O elemento DOM que receberá os eventos e o pointer lock.
     */
    constructor(targetElement) {
        if (!targetElement) {
            throw new Error("InputController requires a valid target element.");
        }
        this.targetElement = targetElement;
        this.keys = {};
        this.yaw = 0;
        this.pitch = 0;
        this.isPointerLocked = false;

        // Vincula os métodos de evento ao 'this' da instância atual
        this.boundOnMouseMove = this.onMouseMove.bind(this);
        this.boundOnKeyDown = this.onKeyDown.bind(this);
        this.boundOnKeyUp = this.onKeyUp.bind(this);
        this.boundOnPointerLockChange = this.onPointerLockChange.bind(this);
        this.boundOnPointerLockError = this.onPointerLockError.bind(this);
        this.boundOnMouseDown = this.onMouseDown.bind(this);
        this.boundOnMouseUp = this.onMouseUp.bind(this);

        this.addEventListeners();
        log('[CLIENT] InputController initialized.');
    }

    /**
     * Adiciona os listeners de eventos necessários ao documento e ao elemento alvo.
     */
    addEventListeners() {
        document.addEventListener('keydown', this.boundOnKeyDown, false);
        document.addEventListener('keyup', this.boundOnKeyUp, false);
        document.addEventListener('pointerlockchange', this.boundOnPointerLockChange, false);
        document.addEventListener('pointerlockerror', this.boundOnPointerLockError, false);
        this.targetElement.addEventListener('mousedown', this.boundOnMouseDown, false);
        document.addEventListener('mouseup', this.boundOnMouseUp, false);
        // Capture contextmenu para prevenir menu padrão no right click DENTRO do jogo
        this.targetElement.addEventListener('contextmenu', (e) => e.preventDefault());
        // O listener de mousemove é adicionado/removido dinamicamente com o pointer lock
    }

    /**
     * Remove todos os listeners de eventos. Útil para limpeza.
     */
    removeEventListeners() {
        document.removeEventListener('keydown', this.boundOnKeyDown, false);
        document.removeEventListener('keyup', this.boundOnKeyUp, false);
        document.removeEventListener('pointerlockchange', this.boundOnPointerLockChange, false);
        document.removeEventListener('pointerlockerror', this.boundOnPointerLockError, false);
        document.removeEventListener('mousemove', this.boundOnMouseMove, false); // Garante remoção
        this.targetElement.removeEventListener('mousedown', this.boundOnMouseDown, false);
        this.targetElement.removeEventListener('contextmenu', (e) => e.preventDefault());
        document.removeEventListener('mouseup', this.boundOnMouseUp, false);
        log('[CLIENT] InputController listeners removed.');
    }

    /**
     * Handler para o evento 'keydown'. Atualiza o estado da tecla pressionada.
     * @param {KeyboardEvent} event
     */
    onKeyDown(event) {
        const key = event.key.toUpperCase();
        this.keys[key] = true;

        // Lógica para tecla do painel de atributos (Etapa 22)
        if (key === 'P' || key === 'TAB') { // Usar 'P' ou 'Tab' para o painel
            if (!this.attributePanelKeyPressed) { // Só marca como 'just pressed' na primeira vez
                this.attributePanelKeyJustPressed = true;
            }
            this.attributePanelKeyPressed = true;
            event.preventDefault(); // Evita comportamento padrão do Tab
        }
        // Prevenir comportamento padrão para teclas de jogo (como Espaço rolar a página)
         if (['W', 'A', 'S', 'D', ' ', 'SHIFT', 'F', '1', '2'].includes(key)) {
             event.preventDefault();
         }
    }

    /**
     * Handler para o evento 'keyup'. Atualiza o estado da tecla liberada.
     * @param {KeyboardEvent} event
     */
    onKeyUp(event) {
        const key = event.key.toUpperCase();
        this.keys[key] = false;

         // Lógica para tecla do painel de atributos (Etapa 22)
         if (key === 'P' || key === 'TAB') {
            this.attributePanelKeyPressed = false;
            // attributePanelKeyJustPressed será resetado após ser lido
        }
    }

    /**
     * Handler para o evento 'mousemove'. Chamado apenas quando o pointer lock está ativo.
     * Atualiza os ângulos de yaw e pitch com base no movimento do mouse.
     * @param {MouseEvent} event
     */
    onMouseMove(event) {
        if (!this.isPointerLocked) return;

        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        // Atualiza yaw (rotação horizontal)
        this.yaw -= movementX * MOUSE_SENSITIVITY;
        // Mantém yaw entre 0 e 2*PI (opcional, mas pode ajudar a evitar valores muito grandes)
        // this.yaw = (this.yaw + Math.PI * 2) % (Math.PI * 2);

        // Atualiza pitch (rotação vertical) e limita
        this.pitch -= movementY * MOUSE_SENSITIVITY;
        this.pitch = clamp(this.pitch, MIN_PITCH, MAX_PITCH);
    }

    /**
     * Handler para o evento 'mousedown'. Registra o estado do botão.
     * @param {MouseEvent} event
     */
    onMouseDown(event) {
        if (!this.isPointerLocked) return; // Só processa cliques se o ponteiro estiver travado
        if (event.button === 0) { // Botão esquerdo
            this.mouseButton0 = true;
        } else if (event.button === 2) { // Botão direito
            this.mouseButton2 = true;
        }
    }

    /**
     * Handler para o evento 'mouseup'. Registra o estado do botão.
     * @param {MouseEvent} event
     */
    onMouseUp(event) {
        // Mouse up pode acontecer mesmo fora do pointer lock, então processamos sempre
        if (event.button === 0) { // Botão esquerdo
            this.mouseButton0 = false;
        } else if (event.button === 2) { // Botão direito
            this.mouseButton2 = false;
        }
    }

    /**
     * Handler para mudanças no estado do Pointer Lock.
     */
    onPointerLockChange() {
        if (document.pointerLockElement === this.targetElement) {
            log('[CLIENT] Pointer Lock activated.');
            document.addEventListener('mousemove', this.boundOnMouseMove, false);
            this.isPointerLocked = true;
        } else {
            log('[CLIENT] Pointer Lock deactivated.');
            document.removeEventListener('mousemove', this.boundOnMouseMove, false);
            this.isPointerLocked = false;
            // Considerar limpar o estado das teclas se o lock for perdido inesperadamente
            // this.keys = {};
        }
    }

    /**
     * Handler para erros ao tentar ativar o Pointer Lock.
     */
    onPointerLockError() {
        warn('[CLIENT] Pointer Lock error.');
        this.isPointerLocked = false; // Garante que o estado esteja correto
    }

    /**
     * Solicita a ativação do Pointer Lock no elemento alvo.
     */
    requestPointerLock() {
        this.targetElement.requestPointerLock();
    }

    /**
     * Libera o Pointer Lock.
     */
     exitPointerLock() {
         document.exitPointerLock();
     }

    /**
     * Verifica se uma tecla específica está atualmente pressionada.
     * @param {string} key - A tecla a ser verificada (ex: 'W', 'A', 'SHIFT', ' '). Case-insensitive.
     * @returns {boolean} `true` se a tecla estiver pressionada, `false` caso contrário.
     */
    isKeyPressed(key) {
        return !!this.keys[key.toUpperCase()];
    }

    /**
     * Verifica se um botão do mouse está pressionado.
     * @param {number} buttonIndex 0 for left, 2 for right.
     * @returns {boolean}
     */
    isMouseButtonDown(buttonIndex) {
        if (buttonIndex === 0) return this.mouseButton0;
        if (buttonIndex === 2) return this.mouseButton2;
        return false;
    }

    /**
     * Obtém o ângulo de rotação horizontal (yaw) atual.
     * @returns {number} Yaw em radianos.
     */
    getYaw() {
        return this.yaw;
    }

    /**
     * Obtém o ângulo de rotação vertical (pitch) atual.
     * @returns {number} Pitch em radianos.
     */
    getPitch() {
        return this.pitch;
    }

    /**
     * Retorna um objeto com o estado atual das teclas de movimento e ação.
     * Útil para enviar ao servidor (Etapa 10).
     * @returns {{W: boolean, A: boolean, S: boolean, D: boolean, Shift: boolean, Space: boolean, Fire: boolean, Aim: boolean, Cast1: boolean, Cast2: boolean}}
     */
    getActionKeysState() {
        return {
            W: this.isKeyPressed('W'),
            A: this.isKeyPressed('A'),
            S: this.isKeyPressed('S'),
            D: this.isKeyPressed('D'),
            Shift: this.isKeyPressed('SHIFT'),
            Space: this.isKeyPressed(' '), // Barra de espaço
            Fire: this.mouseButton0 || this.isKeyPressed('F'), // Modificado para incluir clique do mouse
            Aim: this.mouseButton2, // Estado do botão direito para mirar
            Cast1: this.isKeyPressed('1'), // Tecla 1 para magia 1
            Cast2: this.isKeyPressed('2'), // Tecla 2 para magia 2
            // Adicionar mais teclas de ação conforme necessário
        };
    }

    /**
     * Verifica se a tecla do painel de atributos foi pressionada desde a última verificação.
     * Reseta o estado após a leitura. Usado na Etapa 22.
     * @returns {boolean}
     */
     didPressAttributePanelKey() {
         if (this.attributePanelKeyJustPressed) {
             this.attributePanelKeyJustPressed = false; // Reseta a flag
             return true;
         }
         return false;
     }

    /**
     * Coleta o estado atual completo do input para envio ao servidor.
     * Incrementa o número de sequência.
     * @param {number} deltaTime - O deltaTime do frame atual do cliente.
     * @returns {import('../../../shared/models/player-input.js').PlayerInput} Objeto de input do jogador.
     */
    getInputState(deltaTime) {
        this.inputSequenceNumber++; // Incrementa a sequência

        const inputState = {
            sequence: this.inputSequenceNumber,
            deltaTime: deltaTime,
            keys: this.getActionKeysState(), // Pega o estado atual das teclas/ações
            lookYaw: this.getYaw(),
            lookPitch: this.getPitch(),
        };

        return inputState;
    }
}