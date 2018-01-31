'use strict';
var Mongoose 	= require('mongoose');
//var ObjectId 	= Mongoose.Schema.Types.ObjectId;

var ConversationSchema = new Mongoose.Schema({ //Maybe convert to Group later, because it's quite similar to group chat
	conversationId: { type: String, default: null },
    name: { type: String, required: true },
    userIds: { type: [String], required: true }
}, 
{
	timestamps: true //will automatically add createdAt and updatedAt
});

ConversationSchema.pre('save', function(next) {
	//Generate conversationId:
	if (!this.conversationId) {

	}
	next();
});

var conversationModel = Mongoose.model('conversation', ConversationSchema);

module.exports = conversationModel;