'use strict';

var config 		= require('../config');
var passport 	= require('passport');
var logger 		= require('../logger');

var LocalStrategy 		= require('passport-local').Strategy;
var FacebookStrategy  	= require('passport-facebook').Strategy;
var FacebookTokenStrategy = require('passport-facebook-token'); //for Mobile login
var TwitterStrategy  	= require('passport-twitter').Strategy;

var User = require('../models/user');

/**
 * Encapsulates all code for authentication 
 * Either by using username and password, or by using social accounts
 *
 */
var init = function(){

	// Serialize and Deserialize user instances to and from the session.
	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});

	passport.deserializeUser(function(id, done) {
		User.findById(id, function (err, user) {
			done(err, user);
		});
	});

	// Plug-in Local Strategy
	passport.use(new LocalStrategy(
	  function(username, password, done) {
	  	console.log('Authenticating..');
	    User.findOne({ username: new RegExp(username, 'i'), socialId: null }, function(err, user) {
	      if (err) { 
	      	console.log('Authen failed: ', err);
	      	return done(err); 
	      }

	      if (!user) {
	      	console.log('Can not find user');
	        return done(null, false, { message: 'Incorrect username or password.' });
	      }

	      user.validatePassword(password, function(err, isMatch) {
	        	if (err) {
	        		console.log('Error verify password: ', err);
	        		return done(err);
	        	}
	        	if (!isMatch){
	        		console.log('Incorrect username or password');
	        		return done(null, false, { message: 'Incorrect username or password.' });
	        	}
	        	console.log('Authen ok');
	        	return done(null, user);
	      });

	    });
	  }
	));

	// In case of Facebook, tokenA is the access token, while tokenB is the refersh token.
	// In case of Twitter, tokenA is the token, whilet tokenB is the tokenSecret.
	var verifySocialAccount = function(tokenA, tokenB, data, done) {
		console.log('verifySocialAccount, tokenA:', tokenA, ', tokenB: ', tokenB, ', data: ', data);
		User.findOrCreate(data, function (err, user) {
	      	if (err) { return done(err); }
			return done(err, user); 
		});
	};

	// Plug-in Facebook & Twitter Strategies
	passport.use(new FacebookStrategy(config.facebook, verifySocialAccount));
	passport.use(new TwitterStrategy(config.twitter, verifySocialAccount));

	//Mobile login
	passport.use(new FacebookTokenStrategy({
	    clientID: config.facebook.clientID,
	    clientSecret: config.facebook.clientSecret
	  }, function(accessToken, refreshToken, profile, done) {
	  	console.log('Login facebook from mobile, accessToken: ', accessToken, ', refreshToken: ', refreshToken, ', profile:', profile);
	    User.findOrCreate({id: profile.id}, function (error, user) {
	      return done(error, user);
	    });
	  }
	));

	return passport;
}
	
module.exports = init();