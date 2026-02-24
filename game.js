const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

// Configuración inicial
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let myId = null;
let jugadores = {};
let mundo = {};
let selectedBlock = 1;
const TILE_SIZE = 40;

// Cámara
let camera = { x: 0, y: 0 };

// Colores de los bloques
const blockColors = {
    1: '#795548', // Tierra
    2: '#4CAF50', // Hierba
    3: '#9e9e9e', // Piedra
    4: '#5D4037', // Madera
    5: '#2e7d32', // Hojas
    6: '#ffd600'  // Oro
};

// --- CONEXIÓN Y REINOS ---
function unirse() {
    const codigo = document.getElementById('realm-input').value || "principal";
    const nombre = document.getElementById('name-input').value || "Jugador";
    
    // Resetear mundo local al cambiar
    mundo = {};
    jugadores = {};
    
    socket.emit('unirseReino', { codigo, nombre });
    document.getElementById('ui').style.display = 'none'; // Ocultar menú
}

socket.on('init', (data) => {
    myId = data.id;
    jugadores = data.jugadores;
    mundo = data.mundo;
});

socket.on('nuevoJugador', (data) => {
    jugadores[data.id] = data.info;
});

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

socket.on('jugadorSeFue', (id) => {
    delete jugadores[id];
});

// --- LÓGICA DE JUEGO ---
const keys = {};
window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;

function update() {
    if (!myId || !jugadores[myId]) return;

    const p = jugadores[myId];
    const speed = 5;

    if (keys['w']) p.y -= speed;
    if (keys['s']) p.y += speed;
    if (keys['a']) p.x -= speed;
    if (keys['d']) p.x += speed;

    // Enviar movimiento al servidor
    socket.emit('move', { x: p.x, y: p.y });

    // LA CÁMARA SIGUE AL JUGADOR
    camera.x = p.x - canvas.width / 2;
    camera.y = p.y - canvas.height / 2;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Aplicar traslación de cámara
    ctx.translate(-camera.x, -camera.y);

    // Dibujar Mundo
    for (const key in mundo) {
        const [bx, by] = key.split(',').map(Number);
        ctx.fillStyle = blockColors[mundo[key]];
        ctx.fillRect(bx * TILE_SIZE, by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        // Bordes opcionales para ver los bloques
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.strokeRect(bx * TILE_SIZE, by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    // Dibujar Jugadores
    for (const id in jugadores) {
        const j = jugadores[id];
        ctx.fillStyle = j.color;
        ctx.fillRect(j.x, j.y, 30, 30); // Jugador de 30x30px
        
        // Nombre arriba del jugador
        ctx.fillStyle = "white";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.fillText(j.nombre, j.x + 15, j.y - 10);
    }

    ctx.restore();

    requestAnimationFrame(() => {
        update();
        draw();
    });
}

// --- INTERACCIÓN ---
canvas.onmousedown = (e) => {
    if (!myId) return;

    // Convertir clic de pantalla a posición real en el mundo usando la cámara
    const worldX = e.clientX + camera.x;
    const worldY = e.clientY + camera.y;

    const gridX = Math.floor(worldX / TILE_SIZE);
    const gridY = Math.floor(worldY / TILE_SIZE);
    const key = `${gridX},${gridY}`;

    // Click Izquierdo (0) pone, Derecho (2) quita
    const type = e.button === 0 ? selectedBlock : null;
    socket.emit('blockUpdate', { key, type });
};

// Evitar menú de click derecho
canvas.oncontextmenu = (e) => e.preventDefault();

// Cambiar bloque seleccionado
window.selectBlock = (id, el) => {
    selectedBlock = id;
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
};

// Ajustar canvas al redimensionar ventana
window.onresize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
};

// Iniciar bucle
draw();
