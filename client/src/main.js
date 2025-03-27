// client/src/main.js
import * as logger from '../../shared/utils/logger.js';
import { NetworkManager } from './network/network-manager.js';
import { ClientWorld } from './gameplay/client-world.js';
import { StateSynchronizer } from './network/state-synchronizer.js';
import { Renderer } from './core/renderer.js';
import { SceneManager } from './managers/scene-manager.js';
import { InputController } from './core/input-controller.js';
import { ResourcesManager } from './managers/resources-manager.js';
import gameMap from '../../shared/gameplay/world/map.js';
import { CollisionSystem } from '../../shared/physics/collision-system.js';
// Importa a função de injeção de dependência
import { setClientPlayerDependencies } from './gameplay/client-player.js';
// import { UIManager } from './ui/ui-manager.js';

/**
 * Classe principal do cliente que inicializa e gerencia os sistemas do jogo.
 */
class GameClient {
    logger;
    networkManager;
    clientWorld;
    stateSynchronizer;
    renderer;
    sceneManager;
    inputController;
    resourcesManager;
    collisionSystem;
    // uiManager;

    lastFrameTime = 0;
    animationFrameId = null;

    // --- NOVO: Referências aos elementos da mira ---
    crosshairHorizontalEl = null;
    crosshairVerticalEl = null;

    constructor() {
        this.logger = this.createClientLogger();

        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) {
            throw new Error("Fatal Error: #game-container element not found in DOM.");
        }

        // --- NOVO: Obter referências da mira ---
        this.crosshairHorizontalEl = document.getElementById('crosshair-h');
        this.crosshairVerticalEl = document.getElementById('crosshair-v');
        if (!this.crosshairHorizontalEl || !this.crosshairVerticalEl) {
             this.logger.warn("Crosshair elements not found in DOM.");
        }
        // --- FIM NOVO ---

        try {
            this.initialize(gameContainer);
            this.startGameLoop();
        } catch (error) {
            this.logger.error("Failed to initialize Game Client:", error);
            const body = document.querySelector('body');
            if (body) {
                body.innerHTML = `<div style="color: red; padding: 20px; font-family: sans-serif;">Failed to initialize game: ${error.message}</div>`;
            }
        }
    }

    createClientLogger() {
        const prefix = "[CLIENT]";
        return {
            log: (...args) => logger.log(prefix, ...args),
            warn: (...args) => logger.warn(prefix, ...args),
            error: (...args) => logger.error(prefix, ...args),
        };
    }

    /**
     * Inicializa os sistemas principais do cliente.
     * @param {HTMLElement} gameContainer - O elemento DOM para renderização.
     */
    initialize(gameContainer) {
        this.logger.log('Initializing client application...');

        // 1. Rede e Mundo Base
        this.networkManager = NetworkManager; // Obtém instância Singleton
        this.clientWorld = new ClientWorld();
        this.stateSynchronizer = new StateSynchronizer(this.networkManager, this.clientWorld);

        // 2. Input
        this.inputController = new InputController(gameContainer);

        // 3. Recursos e Física (necessários para predição e renderização)
        this.resourcesManager = new ResourcesManager();
        this.collisionSystem = new CollisionSystem(); // Instância do cliente para predição

        // 4. Renderização
        // MODIFICAÇÃO: Passar clientWorld para o Renderer
        this.renderer = new Renderer(gameContainer, this.clientWorld);
        this.sceneManager = new SceneManager(this.clientWorld, this.renderer);

        // --- Injeção de Dependência para ClientPlayer (TEMPORÁRIO) ---
        // Chama a função importada DEPOIS que os sistemas foram criados.
        setClientPlayerDependencies(
            this.inputController,
            this.collisionSystem,
            gameMap // Passa a instância importada do mapa compartilhado
        );
        // --- Fim da Injeção ---

        // 5. UI (Descomentar quando implementar)
        // this.uiManager = new UIManager(this.clientWorld, this.networkManager);

        // 6. Configuração da Cena Inicial
        // Adicionar listener de clique para Pointer Lock
        gameContainer.addEventListener('click', () => {
            if (!this.inputController.isPointerLocked) {
                this.inputController.requestPointerLock();
            }
        });

        // Carregar e adicionar o mesh do mapa
        const mapMesh = this.resourcesManager.loadMapMesh(gameMap);
        if (mapMesh && this.renderer) {
            this.renderer.scene.add(mapMesh);
            this.logger.log('Map mesh added to the scene.');
        } else {
            this.logger.warn('Could not add map mesh to the scene.');
        }

        this.logger.log('Client application initialized.');
    }

    startGameLoop() {
         if (this.animationFrameId) {
             this.logger.warn("Game loop already running.");
             return;
         }
         this.logger.log("Starting client game loop...");
         this.lastFrameTime = performance.now();
         this.animationFrameId = requestAnimationFrame(this.gameLoopTick.bind(this));
    }

     stopGameLoop() {
         if (this.animationFrameId) {
             cancelAnimationFrame(this.animationFrameId);
             this.animationFrameId = null;
             this.logger.log("Client game loop stopped.");
         }
     }

    /**
     * Função chamada a cada frame pelo requestAnimationFrame.
     * @param {number} currentTime - Timestamp fornecido por requestAnimationFrame.
     */
    gameLoopTick(currentTime) {
        this.animationFrameId = requestAnimationFrame(this.gameLoopTick.bind(this)); // Agenda o próximo frame

        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;

        // Limita o deltaTime para evitar "espiral da morte" se houver lag extremo
        const clampedDeltaTime = Math.min(deltaTime, 0.1); // Max 100ms por frame

        this.update(clampedDeltaTime);
        this.render();
    }


    /**
     * Atualiza o estado do jogo no cliente.
     * @param {number} deltaTime Tempo decorrido desde o último frame em segundos.
     */
    update(deltaTime) {
        // 1. Enviar Input para o Servidor
        if (this.inputController && this.networkManager.socket?.connected) {
            const inputState = this.inputController.getInputState(deltaTime);
            this.networkManager.sendInput(inputState);
        }

        // 2. Atualizar Entidades no Mundo (inclui predição/interpolação)
        // Passa as dependências necessárias (já injetadas via setClientPlayerDependencies)
        if (this.clientWorld) {
            this.clientWorld.update(deltaTime, this.inputController, this.collisionSystem, gameMap);
       }

        // 3. Atualizar Gerenciador de Cena (adicionar/remover meshes, visibilidade)
        if (this.sceneManager) {
             this.sceneManager.update();
        }

        // --- NOVO: Atualizar Visibilidade da Mira ---
        this.updateCrosshairVisibility();
        // --- FIM NOVO ---

        // 4. Atualizar UI (Descomentar quando implementar)
        // if (this.uiManager) this.uiManager.update();

        // Verificar input para toggle do painel (Descomentar quando implementar)
        // if (this.inputController?.didPressAttributePanelKey()) { ... }
    }

    // --- NOVO: Método para atualizar a mira ---
    updateCrosshairVisibility() {
        if (!this.crosshairHorizontalEl || !this.crosshairVerticalEl || !this.clientWorld || !this.networkManager) {
            return; // Não faz nada se elementos ou sistemas não estiverem prontos
        }

        const localPlayer = this.clientWorld.getPlayer(this.networkManager.getLocalPlayerId());

        // Esconde a mira se o jogador local existe E está mirando (isAiming é true)
        const shouldHideCrosshair = localPlayer ? localPlayer.isAiming : false;

        // Aplica display: none ou display: block
        const displayStyle = shouldHideCrosshair ? 'none' : 'block';
        this.crosshairHorizontalEl.style.display = displayStyle;
        this.crosshairVerticalEl.style.display = displayStyle;
    }
    // --- FIM NOVO ---

    /**
     * Renderiza a cena do jogo.
     */
    render() {
        if (this.renderer) {
            // Atualiza a câmera com base no jogador local e input
            const localPlayer = this.clientWorld?.getPlayer(this.networkManager.getLocalPlayerId());
            this.renderer.updateCamera(localPlayer, this.inputController);

            // Renderiza a cena (agora com processamento de efeitos de impacto integrado)
            this.renderer.render();
        }
    }
}

// --- Inicialização Global ---
// Instancia o cliente principal quando o script carrega
window.gameClient = new GameClient(); // Atribui a window para debug, se necessário