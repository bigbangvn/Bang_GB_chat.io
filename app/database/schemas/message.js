'use strict';
var Mongoose 	= require('mongoose');


var MessageSchema = new Mongoose.Schema({
    conversationId: { type: String, required: true, default: undefined },
    messageType: { type: Number, required: true, default: 0 },
    username: { type: String, required: true },
    userId: { type: String, required: true },
    userAvatar: { type: String, default: null },
    content: { type: String, required: true }
}, 
{
	timestamps: true //will automatically add createdAt and updatedAt
});

MessageSchema.pre('save', function(next) {
	var message = this;
	if (!message.conversationId) {
		message.conversationId = 'undefined';
		console.log('Error: no conversationId');
	}
	if (!message.username) {
		console.log('Error: no username');
	}
	if (!message.content) {
		console.log('Error: message empty');
	}
	next(); //Remember to call next(), otherwise saving will stuck
});

var messageModel = Mongoose.model('message', MessageSchema);

module.exports = messageModel;