var mongoose = require("mongoose");
var env = process.env.NODE_ENV || "development";
var GameData = require("./GameData");
var StreamerGamePoint = require("./StreamerGamePoint");
var config = require('../config/' + env + '.js');
const {API} = require('twitch-toolkit');
const twitchAPI = new API({clientId: config.strategies.twitch.clientID, clientSecret: config.strategies.twitch.clientSecret});

//Start twitch API
/*
var twitch = new TwitchApi({
	clientId: config.strategies.twitch.clientID,
	clientSecret: config.strategies.twitch.clientSecret,
	redirectUri: config.strategies.twitch.callbackURL,
	scopes: []
});*/
var GameSchema = new mongoose.Schema({
	//Name of the Game
	name: String,
	//ID of the Game (From Twitch API)
	gameID: {
		type: Number,
		default: 0
	},
	//Number of live channels currently
	channels: {
		type: Number,
		default: 0,
		get: v => Math.round(v),
		set: v => Math.round(v)
	},
	//Number of viewers currently
	viewers: {
		type: Number,
		default: 0,
		get: v => Math.round(v),
		set: v => Math.round(v)
	},
	//Top 5 streamers of this game
	topStreamers: [{
		channel: String
	}],
	//Statistics of the game such as Average viewers and Average channels in the past 24 hours and past 30 days, Also peak viewers and channels of all time.
	stats: {
		avgViewersDay: { type: Number, get: v => Math.round(v), set: v => Math.round(v) },
		avgChannelsDay: { type: Number, get: v => Math.round(v), set: v => Math.round(v) },
		avgViewersWeek: { type: Number, get: v => Math.round(v), set: v => Math.round(v) },
		avgChannelsWeek: { type: Number, get: v => Math.round(v), set: v => Math.round(v) },
		avgViewersMonth: { type: Number, get: v => Math.round(v), set: v => Math.round(v) },
		avgChannelsMonth: { type: Number, get: v => Math.round(v), set: v => Math.round(v) },
		peakViewers: { timestamp: Date, value: { type: Number, get: v => Math.round(v), set: v => Math.round(v), default: 0} },
		peakChannels: { timestamp: Date, value: { type: Number, get: v => Math.round(v), set: v => Math.round(v), default: 0 } }
	},
	//Popularity of the game (From Twitch API)
	popularity: {
		type: Number,
		default: 0
	},
	//Image icons for the game (From Twitch API)
	icon: {
		small: { type: String },
		medium: { type: String },
		large: { type: String }
	},
	//When the game entered our database
	createdAt: {
		type: Date,
		default: Date.now
	}
});

/**
 * Update the game data with the twitch data
 */
GameSchema.methods.updateGame = function updateGame() {
	var game = this;

	//const twitchAPI = new API({clientId: config.strategies.twitch.clientID, clientSecret: config.strategies.twitch.clientSecret});
	twitchAPI.getAccessToken();

	//Use the twitch API to search for the game
	var gameData = twitchAPI.getGames({name: game.name}).then(games => {
		if(games == null){
    		console.log("Falied to update game " + game.name);
    		console.log(games);
    		return;
    	}

    	game.popularity = 0;
    	game.icon.small = games[0].box_art_url.replace("{width}","52").replace("{height}","72");
    	game.icon.medium = games[0].box_art_url.replace("{width}","136").replace("{height}","190");
    	game.icon.large = games[0].box_art_url.replace("{width}","272").replace("{height}","380");

		game.save();
	},
	reject => {
		console.log(reject);
	});

	/*
    twitch.searchGames({query: game.name, type: "suggest"}, function(err, games){

    	if(games == null || games.games.length == 0){
    		console.log("Falied to update game " + game.name);
    		console.log(games);
    		return;
    	}

    	game.popularity = games.games[0].popularity;
    	game.icon.small = games.games[0].box.small;
    	game.icon.medium = games.games[0].box.medium;
    	game.icon.large = games.games[0].box.large;

    	game.save();
    });*/
}

/**
 * Adds points to the streamers current points in this game.
 * @param name {String}: the channel name of the streamer.
 * @param addPoints {Number}: the number of points you want to add.
 */
GameSchema.methods.incrementStreamerGameData = function incrementStreamerGameData(name, addPoints) {
 	var game = this;
 	var top = [];

 	StreamerGamePoint.findOne({channel: name}, function(err, GamePoint){
 		if(GamePoint == null){
 			StreamerGamePoint.create({
 				gameID: game.gameID,
 				channel: name,
 				points: addPoints
 			},function(err, newGamePoint){

 			});
 			return;
 		}
 		GamePoint.addPoints(addPoints);
 	});
 }

/**
 * Sorts the stearmers by points in decending order.
 */
 
GameSchema.methods.sortStreamerPoints = function sortStreamerPoints() {
	var game = this;
	var top = [];

	StreamerGamePoint.find({gameID: this.gameID}).sort({'points': -1}).limit(5).exec(function(err, gamePoints){
		if(gamePoints == null){
			return;
		}

		for(var i = 0; i < gamePoints.length; i++){
			top.push({channel: gamePoints[i].channel});
		}

		game.topStreamers = top;
		game.save();
	});
 }


/**
 * Pulls the game stats and information from the twitch api and logs it into the database.
 * @return Nothing
 */
 GameSchema.methods.logData = function logData(){
 	var game = this;
 	console.log("Game - " + this.name);

	//Get top 10 live streamers
	twitch.getStreams({game: game.name, limit: 10}, function(err, streams){
		if(streams == null || streams.streams == null){
			console.log("Failed to fetch streams");
			return;
		}

		for(var i = 0; i < streams.streams.length; i++){
			game.incrementStreamerGameData(streams.streams[i].channel.display_name, 10-i);
		}
		game.sortStreamerPoints();
	});

	//Get the game stats
	twitch.getStreamsSummary({game: this.name}, function(err, gameStats){
		if(gameStats == null){
			console.log("Failed to fetch game stats");
			return;
		}

		//Set Peak Values
		if(gameStats.viewers > game.stats.peakViewers.value){
			game.stats.peakViewers.value = gameStats.viewers;
			game.stats.peakViewers.timestamp = Date.now();
		}
		if(gameStats.channels > game.stats.peakChannels.value){
			game.stats.peakChannels.value = gameStats.channels;
			game.stats.peakChannels.timestamp = Date.now();
		}

		//Set Viewer and Channel count Data

		GameData.create({
			gameID: game.gameID,
			timestamp: Date.now(),	
			viewers: gameStats.viewers,
			channels: gameStats.channels
		}, function(err,data){

		});

		//Update current viewer and channel data
		game.viewers = gameStats.viewers;
		game.channels = gameStats.channels;
		game.save();
	});
}

/**
 * Calculates all the stats for the game.
 */
 GameSchema.methods.calculateStats = function calculateStats(){
 	var date30days = Date.now() - 30*24*60*60*1000;
 	var game = this;
 	GameData.find({gameID: this.gameID, timestamp: {'$gt': date30days}},function(err, data){
 		game.calculateAvgVCDay(data);
 		game.calculateAvgVCWeek(data);
 		game.calculateAvgVCMonth(data);
 	});
 }

/**
 * Calculates the average viewers in the past 24 hours
 */
 GameSchema.methods.calculateAvgVCDay = function calculateAvgVCDay(data){
 	if(data.length == 0){
 		return;
 	}
 	var totalViewers = 0;
 	var totalChannels = 0;
 	var numberOfTicks = 0;
 	var startDate = data[data.length - (numberOfTicks+1)].timestamp;
 	var nextDate = startDate;

 	while(((startDate.getTime() - nextDate.getTime())/1000) < 24*60*60){
 		if((data.length - (numberOfTicks+1)) < 0){
 			break;
 		}
 		totalViewers += data[data.length - (numberOfTicks+1)].viewers;
 		totalChannels += data[data.length - (numberOfTicks+1)].channels;
 		nextDate = data[data.length - (numberOfTicks+1)].timestamp;
 		numberOfTicks++;
 	}

 	this.stats.avgViewersDay = (totalViewers/numberOfTicks);
 	this.stats.avgChannelsDay = (totalChannels/numberOfTicks);
 	this.save();
 }

 /**
 * Calculates the average viewers in the past 7 Days
 */
 GameSchema.methods.calculateAvgVCWeek = function calculateAvgVCWeek(data){
 	if(data.length == 0){
 		return;
 	}
 	var totalViewers = 0;
 	var totalChannels = 0;
 	var numberOfTicks = 0;
 	var startDate = data[data.length - (numberOfTicks+1)].timestamp;
 	var nextDate = startDate;

 	while(((startDate.getTime() - nextDate.getTime())/1000) < 7*24*60*60){
 		if((data.length - (numberOfTicks+1)) < 0){
 			break;
 		}
 		totalViewers += data[data.length - (numberOfTicks+1)].viewers;
 		totalChannels += data[data.length - (numberOfTicks+1)].channels;
 		nextDate = data[data.length - (numberOfTicks+1)].timestamp;
 		numberOfTicks++;
 	}

 	this.stats.avgViewersWeek = (totalViewers/numberOfTicks);
 	this.stats.avgChannelsWeek = (totalChannels/numberOfTicks);
 	this.save();
 }

 /**
 * Calculates the average viewers in the past 30 Days
 */
 GameSchema.methods.calculateAvgVCMonth = function calculateAvgVCMonth(data){
 	if(data.length == 0){
 		return;
 	}
 	var totalViewers = 0;
 	var totalChannels = 0;
 	var numberOfTicks = 0;

 	for(var i = 0; i < data.length; i ++){
 		totalViewers += data[data.length - (numberOfTicks+1)].viewers;
 		totalChannels += data[data.length - (numberOfTicks+1)].channels;
 		numberOfTicks++;
 	}

 	this.stats.avgViewersMonth = (totalViewers/numberOfTicks);
 	this.stats.avgChannelsMonth = (totalChannels/numberOfTicks);
 	this.save();
 }

  /**
 * Delete the game from the database
 */
 GameSchema.methods.deleteGame = function deleteGame(){
 	var id = this.gameID;
 	var game = this;
 	StreamerGamePoint.remove({gameID: id}, function(err,data){
 		GameData.remove({gameID: id}, function(err,data){
 			game.remove();
 		});
 	});
 }

 var Game = mongoose.model('Game', GameSchema);

 module.exports = Game;