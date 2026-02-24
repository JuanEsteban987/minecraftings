const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- AJUSTES DE PANTALLA ---
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- CONFIGURACIÓN DE JUEGO ---
const TILE_SIZE = 40;
const GRAVITY = 0.5;
const SPEED = 4;
const JUMP_FORCE = -10;

let world = [];
const worldWidth = 100;
const worldHeight = 30;

// Datos del Jugador Local
let myPlayer = {
    id: null,
    x: 200, y: 100,
    vx: 0, vy: 0,
    color: '#' + Math.floor(Math.random()*16777215).toString(16)
};

let otherPlayers = {}; // Lista de jugadores conectados
const keys = {}; // Estado del teclado

// --- GENERACIÓN INICIAL DEL MUNDO ---
for (let x = 0; x < worldWidth; x++) {
    world[x] = [];
    for (let y = 0; y < worldHeight; y++) {
        // Generar suelo y una pequeña colina aleatoria
        world[x][y] = (y > 15 + Math.sin(x*0.5)*2) ? 1 : 0;
    }
}

// --- LÓGICA DE RED (PEERJS) ---
const peer = new Peer();

peer.on('open', (id) => {
    myPlayer.id = id;
    document.getElementById('my-id').innerText = id;
});

// Cuando alguien se conecta a nosotros (Actuamos como Host)
peer.on('connection', (conn) => {
    setupConnection(conn);
    // Enviar el mapa actual al nuevo jugador después de un segundo
    setTimeout(() => {
        conn.send({ type: 'init_world', world: world });
    }, 1000);
});

// Función para unirse a un Host existente
function connectToHost() {
    const hostId = document.getElementById('peer-id-input').value;
    const conn = peer.connect(hostId);
    setupConnection(conn);
}

function setupConnection(conn) {
    conn.on('data', (data) => {
        if (data.type === 'pos') {
            otherPlayers[data.id] = data;
        } else if (data.type === 'block') {
            if(world[data.x]) world[data.x][data.y] = data.v;
        } else if (data.type === 'init_world') {
            world = data.world;
        }
    });
}

function broadcast(data) {
    // Enviamos nuestros datos a todos los nodos conectados
    for (let conns in peer.connections) {
        peer.connections[conns].forEach(c => {
            if (c.open) c.send(data);
        });
    }
}

// --- FÍSICA Y COLISIONES ---
function checkCollision(px, py) {
    // Calculamos los bordes del jugador en la rejilla (grid)
    let gx = Math.floor((px + 5) / TILE_SIZE);
    let gy = Math.floor((py + 39) / TILE_SIZE);
    
    if (world[gx] && world[gx][gy] === 1) return true;
    
    // Check lado derecho
    let gxRight = Math.floor((px + 25) / TILE_SIZE);
    if (world[gxRight] && world[gxRight][gy] === 1) return true;
    
    return false;
}

function isGrounded() {
    return checkCollision(myPlayer.x, myPlayer.y + 2);
}

// --- BUCLE PRINCIPAL ---
function update() {
    // Movimiento Horizontal
    if (keys['KeyA'] || keys['ArrowLeft']) myPlayer.vx = -SPEED;
    else if (keys['KeyD'] || keys['ArrowRight']) myPlayer.vx = SPEED;
    else myPlayer.vx = 0;

    // Salto
    if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && isGrounded()) {
        myPlayer.vy = JUMP_FORCE;
    }

    // Gravedad
    myPlayer.vy += GRAVITY;
    
    // Aplicar movimiento con validación de colisión
    if (!checkCollision(myPlayer.x + myPlayer.vx, myPlayer.y)) {
        myPlayer.x += myPlayer.vx;
    }
    
    if (!checkCollision(myPlayer.x, myPlayer.y + myPlayer.vy)) {
        myPlayer.y += myPlayer.vy;
    } else {
        myPlayer.vy = 0; // Detener caída al tocar suelo
    }

    // Limites del canvas
    myPlayer.x = Math.max(0, Math.min(myPlayer.x, (worldWidth * TILE_SIZE) - 30));

    // Notificar posición
    if (myPlayer.id) {
        broadcast({ 
            type: 'pos', 
            id: myPlayer.id, 
            x: myPlayer.x, 
            y: myPlayer.y, 
            color: myPlayer.color 
        });
    }

    draw();
    requestAnimationFrame(update);
}

// --- RENDERIZADO ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar Mundo (Bloques)
    for (let x = 0; x < worldWidth; x++) {
        for (let y = 0; y < worldHeight; y++) {
            if (world[x][y] === 1) {
                ctx.fillStyle = '#5d4037'; // Marrón tierra
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#3e2723';
                ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // Dibujar Otros Jugadores
    for (let id in otherPlayers) {
        let p = otherPlayers[id];
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(p.x, p.y, 30, 40);
        ctx.globalAlpha = 1.0;
    }

    // Dibujar Jugador Local
    ctx.fillStyle = myPlayer.color;
    ctx.fillRect(myPlayer.x, myPlayer.y, 30, 40);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(myPlayer.x, myPlayer.y, 30, 40);
}

// --- INPUTS ---
window.onkeydown = (e) => keys[e.code] = true;
window.onkeyup = (e) => keys[e.code] = false;

canvas.onmousedown = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const x = Math.floor(mouseX / TILE_SIZE);
    const y = Math.floor(mouseY / TILE_SIZE);
    
    // Izquierdo (0) pone bloque, Derecho (2) quita
    const val = (e.button === 0) ? 1 : 0;
    
    if (world[x]) {
        world[x][y] = val;
        broadcast({ type: 'block', x: x, y: y, v: val, id: myPlayer.id });
    }
};

// Desactivar menú contextual del click derecho
canvas.oncontextmenu = (e) => e.preventDefault();

// Ajuste de ventana
window.onresize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
};

// Iniciar juego
update();
