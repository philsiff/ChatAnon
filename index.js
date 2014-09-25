var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require("socket.io")(http);
var storage = require('node-persist');
var data = {
	users: {}, //two dimensional array, first is id, second is color
	totalUsers: 0,
}
var oldMessages = [];
var roomList = [];

function roomListRemove(member) { //removes member from roomList
    var index = roomList.indexOf(member);
    if (index > -1) {
        roomList.splice(index,1);
    }
}

function roomListPush(member) {
    var index = roomList.indexOf(member);
    if (index == -1) { //if member doesn't already exist
        roomList.push(member);
    }
}

Colors = {};
Colors.names = {
    blue: "#0000ff",
    brown: "#a52a2a",
    darkblue: "#00008b",
    darkcyan: "#008b8b",
    darkgreen: "#006400",
    darkkhaki: "#bdb76b",
    darkmagenta: "#8b008b",
    darkolivegreen: "#556b2f",
    darkorange: "#ff8c00",
    darkorchid: "#9932cc",
    darkred: "#8b0000",
    darksalmon: "#e9967a",
    darkviolet: "#9400d3",
    fuchsia: "#ff00ff",
    green: "#008000",
    indigo: "#4b0082",
    magenta: "#ff00ff",
    maroon: "#800000",
    navy: "#000080",
    olive: "#808000",
    orange: "#ffa500",
    purple: "#800080",
    violet: "#800080",
    red: "#ff0000"
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
storage.setItem('data', data);

app.use(express.static(__dirname + '/public'));
app.get('/', function(req, res){
  res.sendfile(__dirname + '/index.html');
});

io.on('connection', function(socket){
    var userRoom = false;
	console.log('User Connected. ID: ' + socket.id);

    io.emit("roomList", roomList);
    socket.on("joinRoom", function (room) {
        var join = io.sockets.adapter.rooms[room];

        if (!join || Object.keys(join).length < CONST_USER_CAP) {
            if (userRoom != false) {
                socket.leave(userRoom);
                if (io.sockets.adapter.rooms[userRoom].length == 0) {
                    delete io.sockets.adapter.rooms[userRoom];
                    roomListRemove(userRoom);                
                }
            }

            userRoom = room;
            socket.join(userRoom);
            roomListPush(userRoom);

            io.to(userRoom).emit("enterRoom", userRoom);
            io.to(userRoom).emit("userCount", Object.keys(io.sockets.adapter.rooms[userRoom]).length);
            io.emit("roomList", roomList);

        }

    });
    socket.on("disconnect", function(){
        if (userRoom) {
            console.log("User " + socket.id + " left room " + userRoom);

            socket.leave(userRoom);
            io.to(userRoom).emit("userCount", Object.keys(io.sockets.adapter.rooms[userRoom]).length);
            if (io.sockets.adapter.rooms[userRoom].length == 0) {
                delete io.sockets.adapter.rooms[userRoom];
                roomListRemove(userRoom);
            }

            io.emit("roomList", roomList);
        }
    })

	data = storage.getItem('data');
	data.totalUsers += 1;
	data.users[socket.id] = Colors.names[Colors.random()];
	storage.setItem('data', data);


    socket.emit('localID', socket.id);
    socket.emit('firstjoin', oldMessages);
    io.emit('ding', true);
	io.emit('senddata', data);
	io.emit('console chat message', "A user connected.");

	socket.on('disconnect',function(){
		data.totalUsers -= 1;
		storage.setItem('data', data);
		io.emit('senddata', data);
		console.log('User Disconnected. ID: ' + socket.id);
		io.emit('console chat message', "A user disconnected.");
	});

	socket.on('chat message', function(msg, color){
		io.emit('chat message', msg, color);
	});

    socket.on('pushli', function(text, color){
        if (oldMessages.length < 51) {
            var textobject = [text, color]
            oldMessages.push(textobject);
        } else {
            var textobject = [text, color]
            oldMessages.splice(0,1);
            oldMessages.push(textobject);
        }
    });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

function findClientsSocket(roomId, namespace) {
    var res = []
    , ns = io.of(namespace ||"/");    // the default namespace is "/"

    if (ns) {
        for (var id in ns.connected) {
            if(roomId) {
                var index = ns.connected[id].rooms.indexOf(roomId) ;
                if(index !== -1) {
                    res.push(ns.connected[id]);
                }
            } else {
                res.push(ns.connected[id]);
            }
        }
    }
    return res;
}