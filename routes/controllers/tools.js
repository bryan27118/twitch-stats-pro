var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt-nodejs');
var utils = require("./utilities.js");
var TwitchApi = require('twitch-api');
var LiveStream = require("../../models/LiveStream");
var Streamer = require("../../models/Streamer");
var Game = require("../../models/Game");
var env = process.env.NODE_ENV || "development";
var workers = require('../../workers.js');
var config = require('../../config/' + env + '.js');

var twitch = new TwitchApi({
    clientId: config.strategies.twitch.clientID,
    clientSecret: config.strategies.twitch.clientSecret,
    redirectUri: config.strategies.twitch.callbackURL,
    scopes: []
  });

/**
 * Crawl Twitch to get new Games and streams for the database
 * Route: ./api/tools/crawlTwitch
 * Permissions: Admin
 * @body numberOfGames {String}: number of top games
 * @body numberOfStreamers {String}: number of streamers in each game
 * @response true or false
 */
router.post('/crawlTwitch', utils.ensureAdmin, function(req, res) {
	var numberOfGames = parseInt(req.body.numberOfGames);
	var numberOfStreamers = parseInt(req.body.numberOfStreamers);

	var gameLimit = 100;
	var gameOffset = 0;
	var moreGames = true;

	var streamerLimit = 100;
	var streamerOffset = 0;
	var moreStreamers = true;

	if(numberOfGames < 100){
		gameLimit = numberOfGames;
	}

	if(numberOfStreamers < 100){
		streamerLimit = numberOfStreamers;
	}

	while(moreGames){

		twitch.getTopGames({limit: gameLimit, offset: gameOffset}, function(err, topGames){
			for(var i = 0; i < topGames.top.length; i++){

				//Create Game
				//console.log("#" + (i+1) + " " + topGames.top[i].game.name);
				//Check if the game is already in the database
	            Game.find({name: topGames.top[i].game.name},function(i, err,docs){
	                if(docs.length != 0){
	                    //Already Exists
	                    return;
	                }
	                //Create Game
					//console.log("#" + (i+1) + " " + topGames.top[i].game.name);
	                //Enter the game into the database
                    Game.create({
                        name: topGames.top[i].game.name,
                        gameID: topGames.top[i].game._id,
                        popularity: topGames.top[i].game.popularity,
                        icon: {
                            small: topGames.top[i].game.box.small,
                            medium: topGames.top[i].game.box.medium,
                            large: topGames.top[i].game.box.large
                        }
                    },function(err, newGame) {
                        //Queue the logging for the game
                        workers.queueFetchGameData(newGame.gameID);
                    });
	            }.bind(Game, i));

				while(moreStreamers){
					twitch.getStreams({game: topGames.top[i].game.name, limit: streamerLimit, offset: streamerOffset},function(err, streams){
						for(var j = 0; j < streams.streams.length; j++){

							//Create Streamer
							//console.log("    #" + (j+1) + " " + streams.streams[j].channel.display_name);
							Streamer.find({streamerID: streams.streams[j]._id}, function(j, err, docs){
				                if(docs.length != 0){
				                    //Already Exists
				                    return;
				                }
				                Streamer.create({
				                    streamerID: streams.streams[j].channel._id,
				                    channel: {
				                        name: streams.streams[j].channel.name,
		                        		display_name: streams.streams[j].channel.display_name,
				                        mature: streams.streams[j].channel.mature,
				                        partner: streams.streams[j].channel.partner,
				                        language: streams.streams[j].channel.broadcaster_language,
				                        logo: streams.streams[j].channel.logo,
				                        video_banner: streams.streams[j].channel.video_banner,
				                        profile_banner: streams.streams[j].channel.profile_banner,
				                        views: streams.streams[j].channel.views,
				                        followers: streams.streams[j].channel.followers,
				                        createdAt: streams.streams[j].channel.created_at
				                      }
				                },function(err, newStream) {
				                    workers.queueFetchStreamData(newStream.streamerID);
				                });

				            }.bind(Streamer, j));

						}
					});

					numberOfStreamers -= 100;
					streamerOffset += 100;

					if(numberOfStreamers <= 0){
						moreStreamers = false;
					} else if(numberOfStreamers < 100){
						streamerLimit = numberOfStreamers;
					}
				}

				streamerLimit = 100;
				streamerOffset = 0;
				moreStreamers = true;
				numberOfStreamers = parseInt(req.body.numberOfStreamers);

				if(numberOfStreamers < 100){
					streamerLimit = numberOfStreamers;
				}
			}
		});

		numberOfGames -= 100;
		gameOffset += 100;

		if(numberOfGames <= 0){
			moreGames = false;
		} else if(numberOfGames < 100){
			gameLimit = numberOfGames;
		}
	}

	res.json({status: true});
});

/**
 * Crawl Twitch to get new Games and streams for the database
 * Route: ./api/tools/crawlTwitch
 * Permissions: Admin
 * @body numberOfStreamers {String}: number of streamers in each game
 * @response true or false
 */
router.post('/crawlTwitch/:gameName', utils.ensureAdmin, function(req, res) {
	var gameName = req.params.gameName;
	var numberOfStreamers = parseInt(req.body.numberOfStreamers);

	var streamerLimit = 100;
	var streamerOffset = 0;
	var moreStreamers = true;

	if(numberOfStreamers < 100){
		streamerLimit = numberOfStreamers;
	}

	    //Use the twitch API to search for the game
    twitch.searchGames({query: gameName, type: "suggest", live: true}, function(err, games){
        if(games.games.length == 0){
            res.json({status: false, error: "Invalid Game Name"});
            return;
        }

		while(moreStreamers){
			twitch.getStreams({game: games.games[0].name, limit: streamerLimit, offset: streamerOffset},function(err, streams){

				for(var j = 0; j < streams.streams.length; j++){

					//Create Streamer
					//console.log("    #" + (j+1) + " " + streams.streams[j].channel.display_name);
					Streamer.find({streamerID: streams.streams[j]._id}, function(j, err, docs){
		                if(docs.length != 0){
		                    //Already Exists
		                    return;
		                }
		                Streamer.create({
		                    streamerID: streams.streams[j].channel._id,
		                    channel: {
		                        name: streams.streams[j].channel.name,
		                        display_name: streams.streams[j].channel.display_name,
		                        mature: streams.streams[j].channel.mature,
		                        partner: streams.streams[j].channel.partner,
		                        language: streams.streams[j].channel.broadcaster_language,
		                        logo: streams.streams[j].channel.logo,
		                        video_banner: streams.streams[j].channel.video_banner,
		                        profile_banner: streams.streams[j].channel.profile_banner,
		                        views: streams.streams[j].channel.views,
		                        followers: streams.streams[j].channel.followers,
		                        createdAt: streams.streams[j].channel.created_at
		                      }
		                },function(err, newStream) {
		                    workers.queueFetchStreamData(newStream.streamerID);
		                });

		            }.bind(Streamer, j));

				}
			});

			numberOfStreamers -= 100;
			streamerOffset += 100;

			if(numberOfStreamers <= 0){
				moreStreamers = false;
			} else if(numberOfStreamers < 100){
				streamerLimit = numberOfStreamers;
			}
		}
	});

	res.json({status: true});
});

/**
 * Recalculate and update all of the game stats
 * Route: ./api/tools/calculateGameStats
 * @response true or false
 */
router.get('/calculateGameStats', utils.ensureAdmin, function(req, res) {

	Game.find({}, 'stats gameID', function(err, games){
		for(var i = 0; i < games.length; i ++){
			games[i].calculateStats();
			games[i].updateGame();
		}
		res.json({status: true});
    });
});

/**
 * Recalculate and update all of the stream stats
 * Route: ./api/tools/calculateStreamStats
 * @response true or false
 */
router.get('/calculateStreamStats', utils.ensureAdmin, function(req, res) {

	LiveStream.find({}, function(err, streams){
		for(var i = 0; i < streams.length; i ++){
			streams[i].calculateStats();
			streams[i].updateStream();
		}
		res.json({status: true});
    });
});

/**
 * Recalculate and update all of the streamer stats
 * Route: ./api/tools/calculateStreamerStats
 * @response true or false
 */
router.get('/calculateStreamerStats', utils.ensureAdmin, function(req, res) {

	Streamer.find({}, function(err, streamers){
		for(var i = 0; i < streamers.length; i ++){
			streamers[i].calculateStats();
			streamers[i].updateStreamer();
		}
		res.json({status: true});
    });
});

/**
 * Verify user email
 * Route: ./api/tools/email/verify
 * Permissions: User
 * @body token {String}: unique email token
 * @response true or false depending if the token was correct
 */
router.post('/email/verify', utils.ensureAuthenticated, function(req, res) {
	//console.log(req.user.token);
	//console.log(req.body.token);
	if(req.user.token == req.body.token){
	    User.update({
	        _id: req.user._id
	    }, {
	        verifiedEmail: true
	    }, function(err, numberAffected, doc) {
	    	res.send("true");
	    });
	}else{
		res.send("Error");
	}
});

/**
 * Send verify email to the user with a unique token
 * Route: ./api/tools/email/reverify
 * Permissions: User
 * @response true or false if there was an error
 */
router.post('/email/reverify', utils.ensureAuthenticated, function(req, res) {
	if(req.user.verifiedEmail == false){
		var token = bcrypt.genSaltSync(10);
		utils.sendEmailtoUser(req.user._id, "Verify your email address - MEAN", "Thanks for signing up! Click the following link to verify your email address: " + config.hostname + "/verify?token=" + token + "");
	    User.update({
	        _id: req.user._id
	    }, {
	        token: token
	    }, function(err, numberAffected, doc) {
	    	res.send("true");
	    });
	}else{
		res.send("Error");
	}
});

/**
 * Email all subscribed users
 * Route: ./api/tools/email/all
 * Permissions: Admin
 * @body subject {String}: subject of the email
 * @body message {String}: message in the email
 * @response true
 */
router.post('/email/all', utils.ensureAdmin, function(req, res) {
	utils.sendEmailtoAll(req.body.subject, req.body.message);
	res.send("true");
});

/**
 * Email a specific user
 * Route: ./api/tools/email/user/{id}
 * Permissions: Admin
 * @param id {String}: user's id
 * @body subject {String}: subject of the email
 * @body message {String}: message in the email
 * @response true
 */
router.post('/email/user/:id', utils.ensureAdmin, function(req, res) {
	var id = req.params.id;
	utils.sendEmailtoUser(id, req.body.subject, req.body.message);
	res.send("true");
});

module.exports = router;