// server/server.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import { log, error as logError } from '../shared/utils/logger.js';
import { ConnectionManager } from './src/network/connection-manager.js';
import { initializeServerApp } from './src/main.js'; // Ponto de entrada lógico
import { SessionManager } from './src/managers/session-manager.js';
import { SpawnManager } from './src/gameplay/spawn-manager.js'; // <-- Importar SpawnManager
import gameMapInstance from '../shared/gameplay/world/map.js'; // <-- Importar mapa

// --- Configuração de Caminhos ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Constantes ---
const PORT = process.env.PORT || 3000;
const CLIENT_PUBLIC_PATH = path.join(__dirname, '../client/public');
const CLIENT_SRC_PATH = path.join(__dirname, '../client/src');
const SHARED_PATH = path.join(__dirname, '../shared');
const NODE_MODULES_PATH = path.join(__dirname, '../node_modules');

// --- Inicialização ---
log('Starting server setup...');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    // Opções do Socket.io, se necessário
    // Ex: cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- Middlewares Express ---
// Servir arquivos estáticos
app.use(express.static(CLIENT_PUBLIC_PATH));
log(`Serving static files from: ${CLIENT_PUBLIC_PATH} at /`);
app.use('/src', express.static(CLIENT_SRC_PATH));
log(`Serving static files from: ${CLIENT_SRC_PATH} at /src`);
app.use('/shared', express.static(SHARED_PATH));
log(`Serving static files from: ${SHARED_PATH} at /shared`);
app.use('/node_modules', express.static(NODE_MODULES_PATH));
log(`Serving static files from: ${NODE_MODULES_PATH} at /node_modules`);

// Rotas básicas
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Servir index.html para a rota raiz
app.get('/', (req, res) => {
  const indexPath = path.join(CLIENT_PUBLIC_PATH, 'index.html');
  log(`Serving index.html from: ${indexPath}`);
  res.sendFile(indexPath);
});


// --- Instanciação de Managers Core e Injeção de Dependência ---
log('Instantiating core managers...');
// 1. SpawnManager precisa do mapa
const spawnManager = new SpawnManager(gameMapInstance);
// 2. SessionManager precisa do SpawnManager
const sessionManager = new SessionManager(spawnManager);
// 3. ConnectionManager precisa do io e SessionManager
const connectionManager = new ConnectionManager(io, sessionManager);
log('Core managers instantiated.');

// --- Inicialização da Lógica do Jogo (via main.js) ---
// Passa as dependências que o main.js precisa para orquestrar o restante
const serverAppContext = initializeServerApp(io, sessionManager);
log('Server application logic initialized.');

// --- Iniciar Servidor HTTP ---
server.listen(PORT, () => {
  log(`Server listening on http://localhost:${PORT}`);
});

// --- Tratamento de Erros e Desligamento ---
server.on('error', (err) => {
  logError('Server error:', err);
  // Tentar desligar graciosamente em caso de erro fatal no servidor HTTP
  shutdown();
});

process.on('SIGINT', () => {
    log('Received SIGINT. Server shutting down...');
    shutdown();
});
process.on('SIGTERM', () => {
    log('Received SIGTERM. Server shutting down...');
    shutdown();
});

let isShuttingDown = false;
function shutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;
    log('Closing connections...');
    io.close(() => {
        log('Socket.IO closed.');
        server.close(() => {
            log('HTTP server closed.');
            // Aqui poderíamos fechar conexões de banco de dados, etc.
            log('Shutdown complete.');
            process.exit(0);
        });
        // Força o fechamento do servidor HTTP após um timeout, caso ele não feche sozinho
        setTimeout(() => {
            logError('HTTP server close timed out. Forcing exit.');
            process.exit(1);
        }, 5000); // Timeout de 5 segundos
    });
     // Força o fechamento do Socket.IO após um timeout
     setTimeout(() => {
        logError('Socket.IO close timed out. Forcing exit.');
        process.exit(1);
    }, 5000);
}

log('Server setup complete.');