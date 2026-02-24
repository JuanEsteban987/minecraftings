const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- CONFIGURACIÓN ---
const TILE_SIZE = 32;
const GRAVITY = 0.4;
const WORLD_WIDTH = 200; // Mundo mucho más grande
const WORLD_HEIGHT = 40;
let selectedBlockType = 1;

// Bloques: 0:Aire, 1:Tierra, 2:Césped, 3:Piedra, 4:Madera, 5:Hojas, 6:Oro
const BLOCK_COLORS = {
    1: '#5d4037', 2: '#4CAF50', 3: '#808080', 
    4: '#5D4037', 5: '#228B22', 6: '#FFD700'
};

let world = [];
let myPlayer = {
    id: null, name: "Steve", x: 500, y: 100, vx: 0, vy: 0,
    color: '#' + Math.floor(Math.random()*16777215).toString(16)
};
let otherPlayers = {};

// --- GENERACIÓN DE MUNDO ---
function initWorld() {
    for (let x = 0; x < WORLD_WIDTH; x++) {
        world[x] = [];
        let groundLevel = 20 + Math.floor(Math.sin(x * 0.1) * 3);
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            if (y > groundLevel + 4) world[x][y] = 3; // Piedra
            else if (y > groundLevel) world[x][y] = 1; // Tierra
            else if (y === groundLevel) world[x][y] = 2; // Césped
            else world[x][y] = 0;
        }
        // Generar Árboles aleatorios
        if (x % 15 === 0 && x > 5) {
            createTree(x, groundLevel - 1);
        }
    }
}

function createTree(x, y) {
    for(let i=0; i<4; i++) if(world[x] && y-i >= 0) world[x][y-i] = 4; // Tronco
    // Hojas
    for(let ix=-1; ix<=1; ix++){
        for(let iy=-4; iy<=-2; iy++){
            if(world[x+ix] && y+iy >= 0) world[x+ix][y+iy] = 5;
        }
    }
}
initWorld();

// --- MULTIJUGADOR (PEERJS) ---
const peer = new Peer();
peer.on('open', id => { 
    myPlayer.id = id; 
    document.getElementById('my-id').innerText = id; 
});

peer.on('connection', conn => {
    conn.on('data', data => handleData(data, conn));
    setTimeout(() => conn.send({type:'world', world: world}), 1000);
});

function connectToHost() {
    const hostId = document.getElementById('peer-id-input').value;
    const conn = peer.connect(hostId);
    conn.on('data', data => handleData(data, conn));
}

function handleData(data, conn) {
    if (data.type === 'pos') otherPlayers[data.id] = data;
    if (data.type === 'world') world = data.world;
    if (data.type === 'block') world[data.x][data.y] = data.v;
    
    // Relay si eres host
    if (peer.connections[conn.peer]) {
        broadcast(data, conn.peer);
    }
}

function broadcast(data, exclude = null) {
    for (let id in peer.connections) {
        peer.connections[id].forEach(c => {
            if (c.open && c.peer !== exclude) c.send(data);
        });
    }
}

// --- JUEGO ---
function update() {
    // Física
    myPlayer.vy += GRAVITY;
    if (keys['KeyA']) myPlayer.vx = -4;
    else if (keys['KeyD']) myPlayer.vx = 4;
    else myPlayer.vx = 0;

    if (keys['Space'] && isGrounded()) myPlayer.vy = -8;

    // Colisiones
    if (!checkCollision(myPlayer.x + myPlayer.vx, myPlayer.y)) myPlayer.x += myPlayer.vx;
    if (!checkCollision(myPlayer.x, myPlayer.y + myPlayer.vy)) {
        myPlayer.y += myPlayer.vy;
    } else { myPlayer.vy = 0; }

    broadcast({
        type: 'pos', id: myPlayer.id, name: myPlayer.name,
        x: myPlayer.x, y: myPlayer.y, color: myPlayer.color
    });

    draw();
    requestAnimationFrame(update);
}

function checkCollision(px, py) {
    let gx = Math.floor((px + 8) / TILE_SIZE);
    let gy = Math.floor((py + 31) / TILE_SIZE);
    return world[gx] && world[gx][gy] > 0;
}

function isGrounded() { return checkCollision(myPlayer.x, myPlayer.y + 2); }

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Cámara simple (centrada en jugador)
    let camX = -myPlayer.x + canvas.width/2;
    ctx.save();
    ctx.translate(camX, 0);

    // Dibujar Mundo
    for (let x = 0; x < WORLD_WIDTH; x++) {
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            if (world[x][y] > 0) {
                ctx.fillStyle = BLOCK_COLORS[world[x][y]];
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // Dibujar Jugadores (Local y Otros)
    drawPlayer(myPlayer);
    for (let id in otherPlayers) drawPlayer(otherPlayers[id]);

    ctx.restore();
}

function drawPlayer(p) {
    // Skin (Cuerpo)
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 20, 32);
    // Cabeza
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(p.x + 2, p.y - 10, 16, 16);
    // Nametag
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(p.name || "Jugador", p.x + 10, p.y - 15);
}

// --- INPUTS & UI ---
const keys = {};
window.onkeydown = e => keys[e.code] = true;
window.onkeyup = e => keys[e.code] = false;

function updateMyName(val) { myPlayer.name = val; }
function selectBlock(type, el) {
    selectedBlockType = type;
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
}

canvas.onmousedown = e => {
    let camX = -myPlayer.x + canvas.width/2;
    let gx = Math.floor((e.clientX - camX) / TILE_SIZE);
    let gy = Math.floor(e.clientY / TILE_SIZE);
    let val = (e.button === 0) ? selectedBlockType : 0;
    if(world[gx]) {
        world[gx][gy] = val;
        broadcast({type:'block', x:gx, y:gy, v:val, id:myPlayer.id});
    }
};
canvas.oncontextmenu = e => e.preventDefault();

update();
