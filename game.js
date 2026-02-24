const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io(); // Conexión al servidor socket.io

// Configuración del Mundo y Cámara
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const TILE_SIZE = 40;
let camera = { x: 0, y: 0 };
let myId = null;
let jugadores = {};
let mundo = {};
let seleccionado = 1; // Bloque por defecto (Tierra)

// Datos del jugador local
let miJugador = {
    x: 400,
    y: 300,
    nombre: "Invitado",
    ancho: 32,
    alto: 48,
    color: '#ffca28'
};

// Colores de los bloques (Minecraft Style)
const blockColors = {
    1: '#795548', // Tierra
    2: '#4CAF50', // Grama
    3: '#9e9e9e', // Piedra
    4: '#5D4037', // Madera
    5: '#2e7d32', // Hojas
    6: '#ffd600'  // Oro
};

// --- LÓGICA DE CONEXIÓN ---

function connectToHost() {
    const codigo = document.getElementById('peer-id-input').value;
    const nombre = document.getElementById('name-input').value || "Jugador";
    if (codigo) {
        socket.emit('unirseReino', { codigo, nombre });
        document.getElementById('my-id').innerText = codigo;
    } else {
        alert("Introduce un ID de Mundo");
    }
}

function updateMyName(val) {
    miJugador.nombre = val;
}

function selectBlock(id, el) {
    seleccionado = id;
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
}

// --- SOCKET EVENTS ---

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

// --- CONTROLES Y CÁMARA ---

const keys = {};
window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;

function update() {
    let movido = false;
    if (keys['w'] || keys['arrowup']) { miJugador.y -= 5; movido = true; }
    if (keys['s'] || keys['arrowdown']) { miJugador.y += 5; movido = true; }
    if (keys['a'] || keys['arrowleft']) { miJugador.x -= 5; movido = true; }
    if (keys['d'] || keys['arrowright']) { miJugador.x += 5; movido = true; }

    if (movido) {
        socket.emit('move', { x: miJugador.x, y: miJugador.y });
    }

    // LÓGICA DE LA CÁMARA: Centrar en el jugador
    camera.x = miJugador.x - canvas.width / 2;
    camera.y = miJugador.y - canvas.height / 2;
}

// --- RENDERIZADO ---

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Aplicamos la traslación de la cámara
    ctx.translate(-camera.x, -camera.y);

    // 1. Dibujar Mundo
    for (let key in mundo) {
        const [x, y] = key.split(',').map(Number);
        ctx.fillStyle = blockColors[mundo[key]];
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    // 2. Dibujar Otros Jugadores
    for (let id in jugadores) {
        if (id === myId) continue;
        const p = jugadores[id];
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, miJugador.ancho, miJugador.alto);
        ctx.fillStyle = "white";
        ctx.fillText(p.nombre, p.x, p.y - 10);
    }

    // 3. Dibujar Mi Jugador
    ctx.fillStyle = miJugador.color;
    ctx.fillRect(miJugador.x, miJugador.y, miJugador.ancho, miJugador.alto);
    ctx.fillStyle = "white";
    ctx.fillText(miJugador.nombre + " (Tú)", miJugador.x, miJugador.y - 10);

    ctx.restore();

    requestAnimationFrame(() => {
        update();
        draw();
    });
}

// --- INTERACCIÓN CON BLOQUES ---

canvas.addEventListener('mousedown', (e) => {
    // Ajustar clic del mouse a la posición del mundo (clic + cámara)
    const worldX = e.clientX + camera.x;
    const worldY = e.clientY + camera.y;
    
    const gridX = Math.floor(worldX / TILE_SIZE);
    const gridY = Math.floor(worldY / TILE_SIZE);
    const key = `${gridX},${gridY}`;

    if (e.button === 0) { // Click izquierdo: Poner
        socket.emit('blockUpdate', { key: key, type: seleccionado });
    } else { // Click derecho: Quitar
        socket.emit('blockUpdate', { key: key, type: null });
    }
});

// Prevenir menú contextual en click derecho
canvas.oncontextmenu = (e) => e.preventDefault();

// Iniciar juego
draw();
