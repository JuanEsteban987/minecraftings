const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let peer = new Peer(); // Crea un ID aleatorio
let conn;
let players = {}; // Diccionario de jugadores {id: {x, y, color}}
let myId;

// --- RED ---
peer.on('open', (id) => {
    myId = id;
    document.getElementById('my-id').innerText = id;
    players[id] = { x: 100, y: 100, color: 'green' };
});

// Cuando alguien se conecta a ti (Host)
peer.on('connection', (c) => {
    conn = c;
    setupConnection();
});

// Cuando tú te conectas a alguien (Cliente)
function connectToPeer() {
    const peerId = document.getElementById('peer-id').value;
    conn = peer.connect(peerId);
    setupConnection();
}

function setupConnection() {
    conn.on('data', (data) => {
        // Recibir posición del otro jugador
        players[data.id] = data;
    });
}

// --- BUCLE DE JUEGO ---
function update() {
    // Movimiento básico (WASD)
    if (window.keys['w']) players[myId].y -= 5;
    if (window.keys['s']) players[myId].y += 5;
    if (window.keys['a']) players[myId].x -= 5;
    if (window.keys['d']) players[myId].x += 5;

    // Enviar mi posición al otro peer
    if (conn && conn.open) {
        conn.send({ id: myId, x: players[myId].x, y: players[myId].y, color: 'green' });
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar todos los jugadores
    for (let id in players) {
        let p = players[id];
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 40, 40); // Representación simple "cuadrada"
    }
}

// Control de teclas
window.keys = {};
window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;

update();
