var express = require('express');
var app = express();
var markdown = require('marked');
var http = require('http').Server(app);
var io = require("socket.io")(http);
var storage = require('node-persist');
var chatlog = {
    "ChatAnon": []
};
var connectclients = [];

Colors = {};
Colors.names = {
    red: "#F44336",
    pink: "#E91E63",
    purple: "#9C27B0",
    deeppurple: "#673AB7",
    indigo: "#3F51B5",
    blue: "#2196F3",
    lightblue: "#03A9F4",
    cyan: "#00BCD4",
    teal: "#009688",
    green: "#4CAF50",
    lightgreen: "#8BC34A",
    amber: "#FFC107",
    orange: "#FF9800",
    deeporange: "#FF5722",
    brown: "#795548",
    bluegrey: "#607D8B"
};
Colors.random = function() {
    var result;
    var count = 0;
    for (var prop in this.names)
        if (Math.random() < 1/++count)
           result = prop;
    return result;
};

storage.initSync();
storage.setItem('chatlog', chatlog);

app.use(express.static(__dirname + '/public'));
app.use(function(req, res, next){
  res.sendFile(__dirname + "/public/404.html");
});
app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
    console.log('User Connected. ID: ' + socket.id);
    connectclients.push(socket.id); 
    socket.join("ChatAnon");
    var roomList = io.sockets.adapter.rooms;
    connectclients.forEach(function(client){
        delete roomList[client];
    });
    socket.emit("roomList", Object.keys(roomList));
    socket.emit('localID', socket.id);
    socket.emit('firstjoin', chatlog.ChatAnon);
    io.sockets.in("ChatAnon").emit('ding', true);
    io.sockets.in("ChatAnon").emit('console chat message', "A user connected.");

    socket.on("joinRoom", function(curRoom, nextRoom){
        socket.leave(curRoom);
        socket.join(nextRoom);
        var roomList = io.sockets.adapter.rooms;
        connectclients.forEach(function(client){
            delete roomList[client];
        });
        io.emit("roomList", Object.keys(roomList));
        if (!(nextRoom in chatlog)) {
            chatlog[nextRoom] = [];
        } else {
            socket.emit("firstjoin", chatlog[nextRoom]);
        }
        io.sockets.in(curRoom).emit("updateClientNumber", io.sockets.adapter.rooms[curRoom].length);
        io.sockets.in(nextRoom).emit("updateClientNumber", io.sockets.adapter.rooms[nextRoom].length);
        io.sockets.in(curRoom).emit('ding', true);
        io.sockets.in(curRoom).emit('console chat message', "A user disconnected.");
        io.sockets.in(nextRoom).emit('ding', true);
        io.sockets.in(nextRoom).emit('console chat message', "A user connected.");
    });

    socket.on('disconnect',function(){
        console.log('User Disconnected. ID: ' + socket.id);
    });

	socket.on('chat message', function(text, color, room){
		io.sockets.in(room).emit('chat message', text, color);
	});

    socket.on('pushli', function(text, color, room){
        if (text != undefined && text != null && text != "" && color != undefined && color != null && color != "") {
            if (oldMessages.length < 51) {
                var textobject = [text, color]
                oldMessages.push(textobject);
            } else {
                var textobject = [text, color]
                oldMessages.splice(0,1);
                oldMessages.push(textobject);
            }
            storage.setItem('chatlog', chatlog);
        } 
    });
});


http.listen((process.env.PORT || 3000), function(){
  console.log('listening on *:3000');
});

setInterval(function(){
    var roomList = io.sockets.adapter.rooms;
    connectclients.forEach(function(client){
        delete roomList[client];
    });
    io.emit("roomList", Object.keys(roomList));
}, 1000);