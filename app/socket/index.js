'use strict';

var config 	= require('../config');
var redis 	= require('redis').createClient;
var adapter = require('socket.io-redis');

var Room = require('../models/room');

//BangNT - add message history
var Message = require('../models/message');


/**
 * Encapsulates all code for emitting and listening to socket events
 *
 */
var ioEvents = function(io) {

	// Rooms namespace
	io.of('/rooms').on('connection', function(socket) {

		console.log('rooms connection:');
  		console.dir(socket.request.session);

		// Create a new room
		socket.on('createRoom', function(title) {
			Room.findOne({'title': new RegExp('^' + title + '$', 'i')}, function(err, room){
				if(err) throw err;
				if(room){
					socket.emit('updateRoomsList', { error: 'Room title already exists.' });
				} else {
					Room.create({ 
						title: title
					}, function(err, newRoom){
						if(err) throw err;
						socket.emit('updateRoomsList', newRoom);
						socket.broadcast.emit('updateRoomsList', newRoom);
					});
				}
			});
		});
	});

	// Chatroom namespace
	io.of('/chatroom').on('connection', function(socket) {
        console.log('chatroom connection:');
  		console.dir(socket.request.session);
		console.log("cookies: ", socket.cookies);

		// Join a chatroom
		socket.on('join', function(roomId) {
			console.log("New user join room");
			Room.findById(roomId, function(err, room){
				if(err) throw err;
				if(!room){
					// Assuming that you already checked in router that chatroom exists
					// Then, if a room doesn't exist here, return an error to inform the client-side.
					socket.emit('updateUsersList', { error: 'Room doesnt exist.' });
				} else {
					// Check if user exists in the session
					if(socket.request.session.passport == null){
						console.log('User not logined: ', socket.request.session);
						console.log('isAuthenticated = ', socket.request.isAuthenticated());
						return;
					} else {
						console.log('Found session: ', socket.request.session);
					}

					Room.addUser(room, socket, function(err, newRoom){

						// Join the room channel
						socket.join(newRoom.id);
						console.log("Joined room: ", newRoom.id);

						Room.getUsers(newRoom, socket, function(err, users, cuntUserInRoom){
							if(err) throw err;
							
							// Return list of all user connected to the room to the current user
							socket.emit('updateUsersList', users, true);

							// Return the current user to other connecting sockets in the room 
							// ONLY if the user wasn't connected already to the current room
							if(cuntUserInRoom === 1){
								socket.broadcast.to(newRoom.id).emit('updateUsersList', users[users.length - 1]);
							}
						});
					});
				}
			});
		});

		// When a socket exits
		socket.on('disconnect', function() {

			// Check if user exists in the session
			if(socket.request.session.passport == null){
				return;
			}

			// Find the room to which the socket is connected to, 
			// and remove the current user + socket from this room
			Room.removeUser(socket, function(err, room, userId, cuntUserInRoom){
				if(err) throw err;

				// Leave the room channel
				socket.leave(room.id);

				// Return the user id ONLY if the user was connected to the current room using one socket
				// The user id will be then used to remove the user from users list on chatroom page
				if(cuntUserInRoom === 1){
					socket.broadcast.to(room.id).emit('removeUser', userId);
				}
			});
		});

		// When a new message arrives
		socket.on('newMessage', function(roomId, message) {
			try {
				let parsedMsg = JSON.parse(message);
				message = parsedMsg;
			} catch (e) {
				console.log("No need to parse");
			}
			console.log("Room: ", roomId, ", Received newMessage: ", message);
			// No need to emit 'addMessage' to the current socket
			// As the new message will be added manually in 'main.js' file
			// socket.emit('addMessage', message);
			
			socket.broadcast.to(roomId).emit('addMessage', message);

			//Save message async
			var userId = socket.request.session.passport.user;
			console.log('Save message, room: ', roomId, ' userId: ', userId);
			message.conversationId = roomId;
			message.userId = userId;
			Message.addMessage(message);
		});

		socket.on('newFeed', function(roomId, feed) {
			try {
				let dic = JSON.parse(feed);
				feed = dic;
			} catch (e) {
				console.log("No need to parse");
			}
			console.log('Socket on newFeed: ', feed);

			socket.broadcast.to(roomId).emit('addFeed', feed);

			//Save to DB
		});

	});
}

/**
 * Initialize Socket.io
 * Uses Redis as Adapter for Socket.io
 *
 */
var init = function(app){

	var server 	= require('http').Server(app);
	var io 		= require('socket.io')(server);

	// Force Socket.io to ONLY use "websockets"; No Long Polling. Or safer can just force websockets on client
	//io.set('transports', ['websocket']);

	// Using Redis
	let port = config.redis.port;
	let host = config.redis.host;
	let password = config.redis.password;
	let pubClient = redis(port, host, { auth_pass: password });
	let subClient = redis(port, host, { auth_pass: password, return_buffers: true, });
	io.adapter(adapter({ pubClient, subClient }));

	// Allow sockets to access session data
	io.use((socket, next) => {
		require('../session')(socket.request, {}, next);
	});

	// Define all Events
	ioEvents(io);

	// The server object will be then used to list to a port number
	return server;
}

module.exports = init;