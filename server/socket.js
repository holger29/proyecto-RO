const { Server } = require("socket.io");

function initializeSocket(server) {
    const io = new Server(server);

    io.on('connection', (socket) => {
        
        // Usuario se une a una sala
        socket.on('join-room', (roomId, userId) => {
            socket.join(roomId);
            // Avisar a los demás que alguien se conectó
            socket.to(roomId).emit('user-connected', userId);

            // Manejar desconexión
            socket.on('disconnect', () => {
                socket.to(roomId).emit('user-disconnected', userId);
            });
        });

        // Señalización WebRTC: Retransmitir mensajes entre pares
        // Nota: En un entorno real, validaríamos que los usuarios estén en la misma sala
        
        socket.on('offer', (payload) => {
            io.to(payload.target).emit('offer', payload);
        });

        socket.on('answer', (payload) => {
            io.to(payload.target).emit('answer', payload);
        });

        socket.on('ice-candidate', (payload) => {
            io.to(payload.target).emit('ice-candidate', payload);
        });
    });
}

module.exports = initializeSocket;