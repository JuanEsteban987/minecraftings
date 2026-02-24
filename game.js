const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const TILE_SIZE = 48;
const WORLD_SIZE = 100; 

let world = [];
let myPlayer = { 
    id: null, x: 2400, y: 2400, vx: 0, vy: 0, 
    speed: 5, color: '#ffcc00', name: '', mode: 'creative' 
};
let otherPlayers = {};
let selectedBlock = 1;
let peer, conn;

const BLOCK_TYPES = {
    0: { name: 'Aire', col: '#87CEEB', solid: false },
    1: { name: 'Tierra', col: '#795548', solid: true },
    2: { name: 'Pasto', col: '#4CAF50', solid: true },
    3: { name: 'Piedra', col: '#9e9e9e', solid: true },
    4: { name: 'Madera', col: '#5D4037', solid: true },
    6: { name: 'Oro', col: '#ffd600', solid: true },
    7: { name: 'Bedrock', col: '#222', solid: true } // Indestructible
};

// --- INICIALIZACIÓN DE MUNDO ---
function initWorld(type) {
    for (let x = 0; x < WORLD_SIZE; x++) {
        world[x] = [];
        for (let y = 0; y < WORLD_SIZE; y++) {
            // Bordes de Bedrock
            if (x === 0 || x === WORLD_SIZE-1 || y === 0 || y === WORLD_SIZE-1) {
                world[x][y] = 7;
            } else {
                if (type === 'plano') {
                    world[x][y] = 2; // Todo césped
                } else {
                    // Generación Procedural Simple
                    let noise = Math.sin(x*0.3) * Math.cos(y*0.3);
                    world[x][y] = noise > 0.5 ? 0 : (noise < -0.4 ? 3 : 2);
                }
            }
        }
    }
}

// --- FUNCIONES DEL MENÚ ---
window.startHost = function() {
    setupPlayerDetails();
    initWorld(document.getElementById('world-type').value);
    initPeer();
    showGame();
};

window.startJoin = function() {
    setupPlayerDetails();
    const id = document.getElementById('join-id').value;
    if(!id) return alert("Introduce el ID del Host");
    initPeer();
    peer.on('open', () => {
        conn = peer.connect(id);
        setupConn(conn);
    });
    showGame();
};

function setupPlayerDetails() {
    myPlayer.name = document.getElementById('name-input').value || "Explorador";
    myPlayer.color = document.getElementById('skin-input').value;
    myPlayer.mode = document.getElementById('game-mode').value;
}

function showGame() {
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    document.getElementById('hotbar').style.display = 'flex';
    canvas.style.display = 'block';
    resize();
    update();
}

// --- SISTEMA MULTIJUGADOR ---
function initPeer() {
    peer = new Peer();
    peer.on('open', id => {
        myPlayer.id = id;
        document.getElementById('display-id').innerText = id;
    });
    peer.on('connection', c => {
        setupConn(c);
        // El Host envía el mundo al nuevo jugador
        setTimeout(() => c.send({type:'world', world}), 1000);
    });
}

function setupConn(c) {
    conn = c;
    c.on('data', data => {
        if (data.type === 'pos') otherPlayers[data.id] = data;
        if (data.type === 'block') {
            if(world[data.x]) world[data.x][data.y] = data.v;
        }
        if (data.type === 'world') world = data.world;
        
        // Si soy el host, reenvío los datos a los demás (Relay)
        if (peer.connections[c.peer]) {
            broadcast(data, c.peer);
        }
    });
}

function broadcast(data, exclude = null) {
    for (let id in peer.connections) {
        peer.connections[id].forEach(c => {
            if (c.open && c.peer !== exclude) c.send(data);
        });
    }
}

// --- BUCLE DE JUEGO Y FÍSICA ---
const keys = {};
window.onkeydown = e => keys[e.code] = true;
window.onkeyup = e => keys[e.code] = false;

function update() {
    let nextX = myPlayer.x;
    let nextY = myPlayer.y;

    if (keys['KeyW'] || keys['ArrowUp']) nextY -= myPlayer.speed;
    if (keys['KeyS'] || keys['ArrowDown']) nextY += myPlayer.speed;
    if (keys['KeyA'] || keys['ArrowLeft']) nextX -= myPlayer.speed;
    if (keys['KeyD'] || keys['ArrowRight']) nextX += myPlayer.speed;

    // Colisiones: Si el modo es Survival, bloqueamos el paso por sólidos
    if (myPlayer.mode === 'survival') {
        if (!checkSolid(nextX, myPlayer.y)) myPlayer.x = nextX;
        if (!checkSolid(myPlayer.x, nextY)) myPlayer.y = nextY;
    } else {
        myPlayer.x = nextX;
        myPlayer.y = nextY;
    }

    if(myPlayer.id) {
        broadcast({
            type:'pos', id:myPlayer.id, x:myPlayer.x, y:myPlayer.y, 
            color:myPlayer.color, name:myPlayer.name
        });
    }
    
    draw();
    requestAnimationFrame(update);
}

function checkSolid(px, py) {
    // Verificamos los 4 puntos del personaje para colisión precisa
    const points = [[4, 4], [20, 4], [4, 26], [20, 26]];
    for(let p of points) {
        let gx = Math.floor((px + p[0]) / TILE_SIZE);
        let gy = Math.floor((py + p[1]) / TILE_SIZE);
        if (world[gx] && world[gx][gy] && BLOCK_TYPES[world[gx][gy]].solid) return true;
    }
    return false;
}

// --- RENDERIZADO CON CÁMARA ---
function draw() {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // CÁMARA SEGIDORA
    let camX = Math.floor(-myPlayer.x + canvas.width/2);
    let camY = Math.floor(-myPlayer.y + canvas.height/2);

    ctx.save();
    ctx.translate(camX, camY);

    // Dibujar Mundo Visible
    let startX = Math.max(0, Math.floor((myPlayer.x - canvas.width/2) / TILE_SIZE));
    let endX = Math.min(WORLD_SIZE, startX + Math.ceil(canvas.width / TILE_SIZE) + 1);
    let startY = Math.max(0, Math.floor((myPlayer.y - canvas.height/2) / TILE_SIZE));
    let endY = Math.min(WORLD_SIZE, startY + Math.ceil(canvas.height / TILE_SIZE) + 1);

    for (let x = startX; x < endX; x++) {
        for (let y = startY; y < endY; y++) {
            let b = world[x][y];
            if (b !== undefined) {
                ctx.fillStyle = BLOCK_TYPES[b].col;
                ctx.fillRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
                // Bordes de los bloques para estilo Grid
                ctx.strokeStyle = "rgba(0,0,0,0.1)";
                ctx.strokeRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // Dibujar Jugadores
    drawEntity(myPlayer, true);
    for (let id in otherPlayers) drawEntity(otherPlayers[id], false);

    ctx.restore();
}

function drawEntity(p, isMe) {
    // Sombra circular
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(p.x+12, p.y+28, 10, 5, 0, 0, Math.PI*2);
    ctx.fill();

    // Cuerpo RPG
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 24, 30);
    ctx.strokeStyle = "white";
    if(isMe) ctx.strokeRect(p.x, p.y, 24, 30);
    
    // Nametag
    ctx.fillStyle = isMe ? "#00ff00" : "white";
    ctx.font = "bold 13px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(p.name, p.x + 12, p.y - 12);
}

// --- EVENTOS ---
window.selB = function(v, el) {
    selectedBlock = v;
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
};

canvas.onmousedown = e => {
    let camX = -myPlayer.x + canvas.width/2;
    let camY = -myPlayer.y + canvas.height/2;
    let gx = Math.floor((e.clientX - camX) / TILE_SIZE);
    let gy = Math.floor((e.clientY - camY) / TILE_SIZE);

    if (world[gx] && world[gx][gy] !== undefined) {
        if (world[gx][gy] === 7) return; // No romper Bedrock

        let newVal = (e.button === 0) ? selectedBlock : 0;
        
        // Bloquear construcción dentro del propio jugador
        let myGx = Math.floor((myPlayer.x + 12) / TILE_SIZE);
        let myGy = Math.floor((myPlayer.y + 12) / TILE_SIZE);
        if (newVal !== 0 && gx === myGx && gy === myGy) return;

        world[gx][gy] = newVal;
        broadcast({type:'block', x:gx, y:gy, v:newVal});
    }
};

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.onresize = resize;
canvas.oncontextmenu = e => e.preventDefault();
