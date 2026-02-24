const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

// Configuración de pantalla
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- VARIABLES DE ESTADO ---
let myId = null;
let jugadores = {};
let mundo = {};
let camera = { x: 0, y: 0 };
const TILE_SIZE = 40; // Tamaño de cada bloque en píxeles
window.selectedBlock = 1; // Bloque seleccionado por defecto

// Diccionario de colores para los bloques
const colores = { 
    1: '#795548', // Tierra
    2: '#4CAF50', // Hierba
    3: '#9e9e9e', // Piedra
    4: '#5D4037', // Madera
    6: '#ffd600'  // Oro
};

// --- GESTIÓN DE RED ---

// Función global para unirse a un reino desde el HTML
window.unirse = (codigo, nombre) => {
    socket.emit('unirseReino', { codigo, nombre });
};

// Inicialización: recibe el estado completo del reino
socket.on('init', (data) => {
    myId = data.id;
    jugadores = data.jugadores;
    mundo = data.mundo;
});

// Escuchar nuevos jugadores que se conectan
socket.on('nuevoJugador', (data) => { 
    jugadores[data.id] = data.info;
});

// Actualizar posición de otros jugadores
socket.on('jugadorMovido', (data) => {
    if (jugadores[data.id]) {
        jugadores[data.id].x = data.x;
        jugadores[data.id].y = data.y;
    }
});

// Sincronización de bloques del mundo
socket.on('worldUpdate', (data) => {
    if (data.type) {
        mundo[data.key] = data.type;
    } else {
        delete mundo[data.key];
    }
});

// Eliminar jugadores que se desconectan
socket.on('jugadorSeFue', (id) => { 
    delete jugadores[id];
});

// --- LÓGICA DE MOVIMIENTO ---
const keys = {};
window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;

function update() {
    if (!myId || !jugadores[myId]) return;

    const p = jugadores[myId];
    const vel = 5;

    // Movimiento básico
    if (keys['w'] || keys['arrowup']) p.y -= vel;
    if (keys['s'] || keys['arrowdown']) p.y += vel;
    if (keys['a'] || keys['arrowleft']) p.x -= vel;
    if (keys['d'] || keys['arrowright']) p.x += vel;

    // Informar al servidor de nuestro movimiento
    socket.emit('move', { x: p.x, y: p.y });

    // CÁMARA: Centrar la vista en la posición del jugador
    camera.x = p.x - canvas.width / 2;
    camera.y = p.y - canvas.height / 2;
}

// --- RENDERIZADO ---
function draw() {
    // Limpiar pantalla con color cielo
    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Aplicar traslación para que la cámara siga al jugador
    ctx.translate(-camera.x, -camera.y);

    // 1. Dibujar Mundo (Bloques)
    for (const key in mundo) {
        const [bx, by] = key.split(',').map(Number);
        ctx.fillStyle = colores[mundo[key]];
        ctx.fillRect(bx * TILE_SIZE, by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        
        // Cuadrícula sutil
        ctx.strokeStyle = "rgba(0,0,0,0.05)";
        ctx.strokeRect(bx * TILE_SIZE, by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    // 2. Dibujar Jugadores
    for (const id in jugadores) {
        const j = jugadores[id];
        
        // Cuerpo del personaje
        ctx.fillStyle = j.color;
        ctx.fillRect(j.x, j.y, 30, 30);
        
        // Nombre del jugador
        ctx.fillStyle = "white";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(j.nombre || "Steve", j.x + 15, j.y - 10);
    }

    ctx.restore();

    requestAnimationFrame(() => {
        update();
        draw();
    });
}

// --- INTERACCIÓN CON EL MOUSE ---
canvas.onmousedown = (e) => {
    if (!myId) return;

    // Traducir coordenadas de pantalla a coordenadas del mundo real (sumando cámara)
    const worldX = e.clientX + camera.x;
    const worldY = e.clientY + camera.y;

    // Calcular la posición en la rejilla (Grid)
    const gx = Math.floor(worldX / TILE_SIZE);
    const gy = Math.floor(worldY / TILE_SIZE);
    const key = `${gx},${gy}`;

    // Click izquierdo (0) coloca bloque, derecho (2) o cualquier otro lo borra
    const type = e.button === 0 ? window.selectedBlock : null;
    socket.emit('blockUpdate', { key, type });
};

// Desactivar el menú contextual del click derecho para poder borrar bloques
canvas.oncontextmenu = (e) => e.preventDefault();

// Ajustar el tamaño del canvas si se cambia el tamaño de la ventana
window.onresize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
};

// Iniciar el bucle del juego
draw();
