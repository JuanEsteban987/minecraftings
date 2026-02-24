const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let reinos = {}; 

io.on('connection', (socket) => {
    socket.on('unirseReino', (data) => {
        const codigo = (data.codigo || "LOCAL").toUpperCase();
        socket.join(codigo);
        if (!reinos[codigo]) reinos[codigo] = { jugadores: {}, mundo: {} };

        reinos[codigo].jugadores[socket.id] = {
            x: 120, y: 120,
            nombre: data.nombre || "Invitado",
            color: `hsl(${Math.random() * 360}, 70%, 50%)`,
            attacking: false
        };

        socket.emit('init', { id: socket.id, jugadores: reinos[codigo].jugadores, mundo: reinos[codigo].mundo });
        socket.to(codigo).emit('nuevoJugador', { id: socket.id, info: reinos[codigo].jugadores[socket.id] });
        socket.codigoReino = codigo;
    });

    socket.on('move', (data) => {
        const r = reinos[socket.codigoReino];
        if (r && r.jugadores[socket.id]) {
            r.jugadores[socket.id].x = data.x;
            r.jugadores[socket.id].y = data.y;
            socket.to(socket.codigoReino).emit('jugadorMovido', { id: socket.id, x: data.x, y: data.y });
        }
    });

    socket.on('attack', () => io.to(socket.codigoReino).emit('jugadorAtacando', { id: socket.id }));

    socket.on('blockUpdate', (data) => {
        const r = reinos[socket.codigoReino];
        if (r) {
            data.type ? r.mundo[data.key] = data.type : delete r.mundo[data.key];
            io.to(socket.codigoReino).emit('worldUpdate', data);
        }
    });

    socket.on('disconnect', () => {
        const r = reinos[socket.codigoReino];
        if (r) {
            delete r.jugadores[socket.id];
            io.to(socket.codigoReino).emit('jugadorSeFue', socket.id);
        }
    });
});

server.listen(3000, () => console.log('Servidor listo en http://localhost:3000'));
