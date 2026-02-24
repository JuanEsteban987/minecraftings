const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let myId = null;
let jugadores = {};
let mundo = {};
let camera = { x: 0, y: 0 };
const TILE_SIZE = 40;
window.selectedBlock = 1;

const colores = { 1: '#795548', 2: '#4CAF50', 3: '#9e9e9e', 4: '#5D4037', 6: '#ffd600' };

// --- EXPORTAR FUNCIONES AL HTML ---
window.funcionesJuego = {
    unirse: (codigo, nombre) => {
        socket.emit('unirseReino', { codigo, nombre });
    }
};

// --- SOCKETS ---
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

// --- TECLADO ---
const keys = {};
window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;

function update() {
    if (!myId || !jugadores[myId]) return;

    const p = jugadores[myId];
    if (keys['w']) p.y -= 5;
    if (keys['s']) p.y += 5;
    if (keys['a']) p.x -= 5;
    if (keys['d']) p.x += 5;

    socket.emit('move', { x: p.x, y: p.y });

    // La cámara sigue al jugador
    camera.x = p.x - canvas.width / 2;
    camera.y = p.y - canvas.height / 2;
}

function draw() {
    // Cielo
    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Dibujar Bloques
    for (const key in mundo) {
        const [bx, by] = key.split(',').map(Number);
        ctx.fillStyle = colores[mundo[key]];
        ctx.fillRect(bx * TILE_SIZE, by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.strokeRect(bx * TILE_SIZE, by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    // Dibujar Jugadores
    for (const id in jugadores) {
        const j = jugadores[id];
        ctx.fillStyle = j.color;
        ctx.fillRect(j.x, j.y, 30, 30);
        ctx.fillStyle = "white";
        ctx.fillText(j.nombre, j.x, j.y - 5);
    }

    ctx.restore();
    requestAnimationFrame(() => {
        update();
        draw();
    });
}

// --- MOUSE ---
canvas.onmousedown = (e) => {
    if (!myId) return;
    const worldX = e.clientX + camera.x;
    const worldY = e.clientY + camera.y;
    const gx = Math.floor(worldX / TILE_SIZE);
    const gy = Math.floor(worldY / TILE_SIZE);
    
    // Click Izquierdo pone, derecho quita
    const type = e.button === 0 ? window.selectedBlock : null;
    socket.emit('blockUpdate', { key: `${gx},${gy}`, type });
};

canvas.oncontextmenu = (e) => e.preventDefault();

draw();
