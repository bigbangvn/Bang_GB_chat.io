'use strict';

var express	 	= require('express');
var router 		= express.Router();
var passport 	= require('passport');

var User = require('../models/user');
var Room = require('../models/room');

// Home page
router.get('/', function(req, res, next) {
	// If user is already logged in, then redirect to rooms page
	if(req.isAuthenticated()){
		console.log('Authenticated, user: ', req.user);
		res.redirect('/rooms');
	}
	else{
		res.render('login', {
			success: req.flash('success')[0],
			errors: req.flash('error'), 
			showRegisterForm: req.flash('showRegisterForm')[0]
		});
	}
});

// Login
// For Web
router.post('/login', passport.authenticate('local', { 
	successRedirect: '/rooms', 
	failureRedirect: '/',
	failureFlash: true
}));

//For mobile
router.post('/mobileLogin', function(req, res) {
	console.log("Login: ", req.body);
    passport.authenticate('local', function(err, user, info) {
        if (err) {
            return res.end(err);
        }
        if(!user) {
            return res.status(400).json({errCode: 1, msg: "Wrong Credentials"});
        }
        req.logIn(user, function(err) {
            if (err)
                return res.end(err);
            user.password = undefined //clear unnecessary info
            return res.json({ errCode: 0, msg: "Logged in!", user: user});    
        });
    })(req, res);
});

//Just for testing authenticated
router.get('/user/profile', function(req, res) {
	console.log('get user/profile:', req.session, req.cookies);

	if (req.isAuthenticated()) {
		console.log('Authenticated, user: ', req.user);
		res.end('{"msg": "Ok, already logined"}');
	} else {
		console.log('Not logined');
		res.end('{"msg:" "Not logined"}');
	}
});

// Register via username and password
router.post('/register', function(req, res, next) {

	var credentials = {'username': req.body.username, 'password': req.body.password };

	if(credentials.username === '' || credentials.password === ''){
		req.flash('error', 'Missing credentials');
		req.flash('showRegisterForm', true);
		res.redirect('/');
	}else{

		// Check if the username already exists for non-social account
		User.findOne({'username': new RegExp('^' + req.body.username + '$', 'i'), 'socialId': null}, function(err, user){
			if(err) throw err;
			if(user){
				req.flash('error', 'Username already exists.');
				req.flash('showRegisterForm', true);
				res.redirect('/');
			}else{
				User.create(credentials, function(err, newUser){
					if(err) throw err;
					req.flash('success', 'Your account has been created. Please log in.');
					res.redirect('/');
				});
			}
		});
	}
});

// Social Authentication routes
// 1. Login via Facebook
router.get('/auth/facebook', passport.authenticate('facebook'));
router.get('/auth/facebook/callback', passport.authenticate('facebook', {
		successRedirect: '/rooms',
		failureRedirect: '/',
		failureFlash: true
}));

//Facebook login for Mobile
router.post('/auth/facebook/token',
  passport.authenticate('facebook-token'),
  function (req, res) {
    let status = req.user? 200 : 401;
    req.user.password = undefined //clear unnecessary info
    res.status(status).json({errCode: 0, msg: 'success', user: req.user});
  }
);

// 2. Login via Twitter
router.get('/auth/twitter', passport.authenticate('twitter'));
router.get('/auth/twitter/callback', passport.authenticate('twitter', {
		successRedirect: '/rooms',
		failureRedirect: '/',
		failureFlash: true
}));

// Rooms
router.get('/rooms', [User.isAuthenticated, function(req, res, next) {
	Room.find(function(err, rooms){
		if(err) throw err;
		res.render('rooms', { rooms });
	});
}]);

// Chat Room 
router.get('/chat/:id', [User.isAuthenticated, function(req, res, next) {
	var roomId = req.params.id;
	Room.findById(roomId, function(err, room){
		if(err) throw err;
		if(!room){
			return next(); 
		}
		res.render('chatroom', { user: req.user, room: room });
	});
	
}]);

// Logout
router.get('/logout', function(req, res, next) {
	// remove the req.user property and clear the login session
	req.logout();

	// destroy session data
	req.session = null;

	// redirect to homepage
	res.redirect('/');
});

module.exports = router;