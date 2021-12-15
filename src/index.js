const path = require('path');
const http = require('http');
//Loading in the core NodeJS HTTP module for Express to integrate with SocketIO
const express = require('express');
const socketio = require('socket.io'); //Loading in the server-side socket.io module
const Filter = require('bad-words');
const {generateMessage, generateLocationMessage} = require('./utils/message');
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users');

const app = express();
const server = http.createServer(app); 
//Express actually automatically helps us set up a server, but since we require the server variable, we will
//create the server by ourselves using the HTTP module
const io = socketio(server);
//We create a new instance of the socket.io, calling it 'io' which takes in the HTTP server as an argument
//Hence, the need for the server variable. Now our server supports web sockets functionality

const port = process.env.PORT || 3000;
const publicStaticDirectory = path.join(__dirname, '..', 'public');
app.use(express.static(publicStaticDirectory));


io.on('connection', (socket) => { 
    //Parameter includes socket which is an object containing information about the new connection from the client
    //We can call various methods on the socket object to communicate with the specific client
    //'on': Adds the listener function which is the 2nd argument for the named event which is the 1st argument
    //'connection': A built-in name for when a user connects (client establishing connection with server)
    //Hence, we call the 'on' method for all clients (io NOT socket) to listen for a built-in 'connection' event
    //If such a connection event happens (when a client connects to the server), the callback function will run
    console.log('New Web Socket connection.');

    socket.on('join', ({username, room}, callback) => {
        const {error, user} = addUser({ //Using the addUser function to add the user when server receives 'join' event
            id: socket.id, //socket.id is the in-build id of the client's socket
            username,
            room,
        })
        //We extract the error OR user object and add the error to the callback if there is an error
        //Otherwise callback will be empty and client will receive no error
        if (error) {
            return callback(error);
        }

        socket.join(user.room); //Built-in socket event for the creation and joining of a room

        //FOR BASIC WELCOME MESSAGE & MESSAGE SENDING ACROSS ALL CLIENTS
        //Follow the steps mentioned in index.js and chat.js
        socket.emit('message', generateMessage('admin', 'Welcome ' + user.username + '!'));
        //STEP 1: When a new client connects to the server, the single socket connecting the server to the single
        //client emits an event (server --> client) titled 'message' (1st argument), sending the content in the
        //2nd agument

        socket.broadcast.to(user.room).emit('message', generateMessage('admin', user.username + ' has joined!'));
        //We call broadcast.emit on the single client which will emit an event (sending of the user joining message)
        //to all other clients except for the client who emitted the event
        //NOTE: Use broadcast.to().emit OR io.to().emit if we want to emit events to certain rooms only

        io.to(user.room).emit('roomData', { 
            //When a new user joins or leaves the room, this event will run to send updated users array to the 
            //client to display
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    
    socket.on('sendUserMsg', (userMessage, callback) => {
        //Server has a callback function which can send acknowledgement back to the client
        //In this case, we check if the message has profanity. If it does, the callback function will send 
        //a message back to the client to state the use of profanity.
        const filter = new Filter(); //Refer to the NPM bad-words documentation to see the usage
        if (filter.isProfane(userMessage)) {
            return callback('Profane language is not allowed!'); 
        }

        const user = getUser(socket.id);
        io.to(user.room).emit('message', generateMessage(user.username, userMessage));
        callback(); 
        //If no profanity has been detected, callback function will send back an empty response to the client
    })
    //STEP 4: The server listens for events emitted from the client via the 'on' method. In this case, if the 
    //client does indeed emit an event (sending a user message), the server will access the content in the callback
    //function and send the user message to ALL clients by calling 'io.emit' (NOTE: Calling socket.emit will only
    //send the user message back to the same single client which defeats the purpose of a chat room!)


    socket.on('sendLocation', (coord, callback) => {
        const user = getUser(socket.id);
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, "https://google.com/maps?q=" + coord.lat + "," + coord.long));
        callback();
    })
    //Server listens for 'sendLocation' event from its clients and takes the coord object sent over to generate
    //a Google Maps query URL to get the location of the client who emitted the 'sendLocation' event
    //Includes a callback function which send an acknowledgment back to the client 

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        if (user) {
            io.to(user.room).emit('message', generateMessage('admin', user.username + ' has left.'));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    });
    //We call the 'on' method on the single socket to listen for a built-in 'disconnect' event which happens
    //when a single client disconnects from the server. Takes in a callback function which will cause a message
    //to be sent to ALL clients notifying about the user leaving the chat room
})


server.listen(port, () => { //Remember to change from 'app' to 'server'
    console.log('Server is up and running on port ' + port);
})