const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const TILE_SIZE = 36;
const GRAVITY = 0.45;
const WORLD_WIDTH = 250; 
const WORLD_HEIGHT = 50;
let selectedBlockType = 1;

const BLOCK_DATA = {
    1: { name: 'Dirt', col: '#795548', dark: '#5d4037' },
    2: { name: 'Grass', col: '#4CAF50', dark: '#388E3C' },
    3: { name: 'Stone', col: '#9e9e9e', dark: '#757575' },
    4: { name: 'Wood', col: '#5D4037', dark: '#3E2723' },
    5: { name: 'Leaves', col: '#2e7d32', dark: '#1b5e20' },
    6: { name: 'Gold', col: '#ffd600', dark: '#ffab00' }
};

let world = [];
let myPlayer = {
    id: null, name: "Explorador", x: 600, y: 100, vx: 0, vy: 0,
    color: '#' + Math.floor(Math.random()*16777215).toString(16)
};
let otherPlayers = {};

// --- GENERACIÓN ---
function initWorld() {
    for (let x = 0; x < WORLD_WIDTH; x++) {
        world[x] = [];
        let ground = 25 + Math.floor(Math.sin(x * 0.15) * 4);
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            if (y > ground + 6) world[x][y] = 3; 
            else if (y > ground) world[x][y] = 1; 
            else if (y === ground) world[x][y] = 2; 
            else world[x][y] = 0;
        }
        if (x % 12 === 0 && x > 10) createTree(x, ground - 1);
    }
}

function createTree(x, y) {
    for(let i=0; i<5; i++) if(world[x] && y-i >= 0) world[x][y-i] = 4;
    for(let ix=-2; ix<=2; ix++){
        for(let iy=-6; iy<=-3; iy++){
            if(world[x+ix] && y+iy >= 0 && Math.random() > 0.2) world[x+ix][y+iy] = 5;
        }
    }
}
initWorld();

// --- RED ---
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
    if (peer.connections[conn.peer]) broadcast(data, conn.peer);
}
function broadcast(data, exclude = null) {
    for (let id in peer.connections) {
        peer.connections[id].forEach(c => { if (c.open && c.peer !== exclude) c.send(data); });
    }
}

// --- CORE ---
const keys = {};
window.onkeydown = e => keys[e.code] = true;
window.onkeyup = e => keys[e.code] = false;

function update() {
    myPlayer.vy += GRAVITY;
    if (keys['KeyA']) myPlayer.vx = -5;
    else if (keys['KeyD']) myPlayer.vx = 5;
    else myPlayer.vx = 0;

    if (keys['Space'] && isGrounded()) myPlayer.vy = -10;

    if (!checkCollision(myPlayer.x + myPlayer.vx, myPlayer.y)) myPlayer.x += myPlayer.vx;
    if (!checkCollision(myPlayer.x, myPlayer.y + myPlayer.vy)) {
        myPlayer.y += myPlayer.vy;
    } else { myPlayer.vy = 0; }

    if(myPlayer.id) broadcast({
        type: 'pos', id: myPlayer.id, name: myPlayer.name,
        x: myPlayer.x, y: myPlayer.y, color: myPlayer.color
    });

    draw();
    requestAnimationFrame(update);
}

function checkCollision(px, py) {
    let gx = Math.floor((px + 10) / TILE_SIZE);
    let gy = Math.floor((py + 35) / TILE_SIZE);
    return world[gx] && world[gx][gy] > 0;
}
function isGrounded() { return checkCollision(myPlayer.x, myPlayer.y + 3); }

// --- RENDERIZADO MEJORADO ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let camX = Math.floor(-myPlayer.x + canvas.width/2);
    ctx.save();
    ctx.translate(camX, 0);

    for (let x = 0; x < WORLD_WIDTH; x++) {
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            let b = world[x][y];
            if (b > 0) {
                let info = BLOCK_DATA[b];
                // Sombra lateral para efecto 3D
                ctx.fillStyle = info.dark;
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                // Cara principal del bloque
                ctx.fillStyle = info.col;
                ctx.fillRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                // Brillo superior
                ctx.fillStyle = "rgba(255,255,255,0.1)";
                ctx.fillRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, TILE_SIZE - 4, 4);
            }
        }
    }

    drawPlayer(myPlayer, true);
    for (let id in otherPlayers) drawPlayer(otherPlayers[id], false);

    ctx.restore();
}

function drawPlayer(p, isMe) {
    // Sombra del jugador
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(p.x + 4, p.y + 4, 24, 40);

    // Cuerpo (Skin)
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 24, 40);
    
    // Cabeza Detallada
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(p.x + 2, p.y - 12, 20, 20);
    // Ojos
    ctx.fillStyle = 'white';
    ctx.fillRect(p.x + 5, p.y - 6, 4, 4);
    ctx.fillRect(p.x + 15, p.y - 6, 4, 4);
    ctx.fillStyle = 'black';
    ctx.fillRect(p.x + 6, p.y - 5, 2, 2);
    ctx.fillRect(p.x + 16, p.y - 5, 2, 2);

    // Nametag Estilo RPG
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    let tw = ctx.measureText(p.name).width;
    ctx.fillRect(p.x + 12 - tw/2 - 4, p.y - 32, tw + 8, 16);
    ctx.fillStyle = isMe ? "#00ff00" : "white";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(p.name, p.x + 12, p.y - 20);
}

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
