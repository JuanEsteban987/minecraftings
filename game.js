const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Configuración de pantalla
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- VARIABLES DE CÁMARA ---
let camera = {
    x: 0,
    y: 0
};

const TILE_SIZE = 40;
let myId = null;
let jugadores = {};
let mundo = {};
let selectedBlock = 1;

// Colores de bloques
const blockColors = {
    1: '#795548', // Tierra
    2: '#4CAF50', // Hierba
    3: '#9e9e9e', // Piedra
    4: '#5D4037', // Madera
    5: '#2e7d32', // Hojas
    6: '#ffd600'  // Oro
};

// Conexión al servidor (Socket.io)
const socket = io();

// Unirse a un reino (puedes automatizar el código del reino)
const reinoCodigo = "reino-demo"; 
socket.emit('unirseReino', { codigo: reinoCodigo, nombre: "Jugador" });

socket.on('init', (data) => {
    myId = data.id;
    jugadores = data.jugadores;
    mundo = data.mundo;
});

socket.on('nuevoJugador', (data) => { jugadores[data.id] = data.info; });
socket.on('jugadorMovido', (data) => {
    if (jugadores[data.id]) {
        jugadores[data.id].x = data.x;
        jugadores[data.id].y = data.y;
    }
});
socket.on('worldUpdate', (data) => {
    if (data.type) mundo[data.key] = data.type;
    else delete mundo[data.key];
});
socket.on('jugadorSeFue', (id) => { delete jugadores[id]; });

// --- LÓGICA DE MOVIMIENTO ---
const keys = {};
window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;

function update() {
    if (!myId || !jugadores[myId]) return;

    const p = jugadores[myId];
    const speed = 5;

    if (keys['w'] || keys['arrowup']) p.y -= speed;
    if (keys['s'] || keys['arrowdown']) p.y += speed;
    if (keys['a'] || keys['arrowleft']) p.x -= speed;
    if (keys['d'] || keys['arrowright']) p.x += speed;

    // Actualizar posición al servidor
    socket.emit('move', { x: p.x, y: p.y });

    // --- LÓGICA DE LA CÁMARA ---
    // Centramos la cámara en el jugador
    camera.x = p.x - canvas.width / 2;
    camera.y = p.y - canvas.height / 2;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Aplicamos la traslación de la cámara
    // Todo lo que se dibuje después de esto se moverá relativo al jugador
    ctx.translate(-camera.x, -camera.y);

    // 1. Dibujar Mundo (Bloques)
    for (const key in mundo) {
        const [bx, by] = key.split(',').map(Number);
        ctx.fillStyle = blockColors[mundo[key]];
        ctx.fillRect(bx * TILE_SIZE, by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.strokeRect(bx * TILE_SIZE, by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    // 2. Dibujar Jugadores
    for (const id in jugadores) {
        const j = jugadores[id];
        ctx.fillStyle = j.color;
        
        // Cuerpo
        ctx.fillRect(j.x, j.y, 30, 30);
        
        // Nombre
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(j.nombre || "Jugador", j.x + 15, j.y - 10);
    }

    ctx.restore(); // Volver al estado normal (para UI fija)

    requestAnimationFrame(() => {
        update();
        draw();
    });
}

// --- INTERACCIÓN CON EL MUNDO ---
canvas.onmousedown = (e) => {
    if (!myId) return;
    
    // Ajustamos el clic del mouse sumando la posición de la cámara
    const worldX = e.clientX + camera.x;
    const worldY = e.clientY + camera.y;
    
    const gridX = Math.floor(worldX / TILE_SIZE);
    const gridY = Math.floor(worldY / TILE_SIZE);
    const key = `${gridX},${gridY}`;

    const type = e.button === 0 ? selectedBlock : null; // Click izq pone, der quita
    socket.emit('blockUpdate', { key, type });
};

// Evitar menú contextual en click derecho
canvas.oncontextmenu = (e) => e.preventDefault();

draw();
