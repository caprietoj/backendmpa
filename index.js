var PORT = 3000
var app = require('./api/app');
var http = require('http');
var httpServer = http.createServer(app);
var io = require('socket.io')(httpServer);

httpServer.listen(PORT);

io.on('connection', function (socket) {
    socket.on('room', room => {
        socket.join(room)
        socket.on('message', (message) => {
            socket.broadcast.to(room).emit('message', message);
        });
    })
});