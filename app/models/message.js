'use strict';

var messageModel = require('../database').models.message;

var addMessage = function (data, callback){
	var newMessage = new messageModel(data);
	console.log('Saving msg: ', data);
	newMessage.save(function(err, msg) {
		if (err) {
			console.log('Error: when save msg: ', data, '\n', err);
		} else {
			console.log('Save msg ok!');
		}
		if (callback) {
			callback(err, msg);
		}
	});
};

module.exports = {
	addMessage
};