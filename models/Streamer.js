var mongoose = require("mongoose");
var LiveStream = require("./LiveStream");
var StreamerData = require("./StreamerData");
var env = process.env.NODE_ENV || "development";
var config = require('../config/' + env + '.js');
var TwitchApi = require('twitch-api');
var workers = require('../workers.js');

//Start twitch API
var twitch = new TwitchApi({
	clientId: config.strategies.twitch.clientID,
	clientSecret: config.strategies.twitch.clientSecret,
	redirectUri: config.strategies.twitch.callbackURL,
	scopes: []
});

var StreamerSchema = new mongoose.Schema({
	//ID of the streamer (From Twitch API)
	streamerID: {
		type: Number,
		default: 0
	},
	//If the streamers is online or not
	isOnline:{
		type: Boolean,
		default: false
	},
	//Channel informtion (From Twitch API)
	channel: {
		name: String,
		display_name: String,
		mature: Boolean,
		partner: Boolean,
		language: String,
		logo: String,
		video_banner: String,
		profile_banner: String,
		views: Number,
		followers: Number,
		createdAt: Date
	},
	//Streamers Statistics such as Stream Length, Total Stream Time, and Average Viewers
	stats: {
		peakViewers: { type: Number, get: v => Math.round(v), set: v => Math.round(v), default: 0},
		avgStreamLengthWeek: { type: Number, get: v => Math.round(v), set: v => Math.round(v), default: 0},
		avgStreamLengthMonth: { type: Number, get: v => Math.round(v), set: v => Math.round(v), default: 0},
		avgStreamLengthAll: { type: Number, get: v => Math.round(v), set: v => Math.round(v), default: 0},
		totalStreamTimeWeek: { type: Number, get: v => Math.round(v), set: v => Math.round(v), default: 0},
		totalStreamTimeMonth: { type: Number, get: v => Math.round(v), set: v => Math.round(v), default: 0},
		totalStreamTimeAll: { type: Number, get: v => Math.round(v), set: v => Math.round(v), default: 0},
		avgViewersWeek: { type: Number, get: v => Math.round(v), set: v => Math.round(v), default: 0},
		avgViewersMonth: { type: Number, get: v => Math.round(v), set: v => Math.round(v), default: 0},
		avgViewersAll: { type: Number, get: v => Math.round(v), set: v => Math.round(v), default: 0}
	},
	//Amount of time played on each game
	gameData: [{
		name: String,
  		playtime: Number //mins
	}],
	//Date of when the streamer was entered into the database
	createdAt: {
		type: Date,
		default: Date.now
	}
});

/**
 * Update the streamer data with the twitch data
 */
StreamerSchema.methods.updateStreamer = function updateStreamer() {
	var streamer = this;

	//Use the twitch API to search for the game
    twitch.getChannel(streamer.channel.name, function(err, channel){
    	if(channel == null){
    		return;
    	}

    	streamer.channel.display_name = channel.display_name;
    	streamer.channel.mature = channel.mature;
    	streamer.channel.partner = channel.partner;
    	streamer.channel.language = channel.language;
    	streamer.channel.logo = channel.logo;
    	streamer.channel.video_banner = channel.video_banner;
    	streamer.channel.profile_banner = channel.profile_banner;

    	streamer.save();
    });
}

/**
 * Calcualte all of the statistics
 */
StreamerSchema.methods.calculateStats = function calculateStats(){
	var streamer = this;

	LiveStream.find({streamerID: streamer.streamerID}, function(err, streams){
		if(streams == null || streams == null){
			return;
		}
		streamer.calculateAvgStreamLength(streams);
		streamer.calculateTotalStreamTime(streams);
		streamer.calculateAvgViewers(streams);
		streamer.sortGameData();
	});
}

/**
 * Calculate the average stream length in past month, week, and all time
 * @param streams {JSON Array}: array of all the streams data
 */
StreamerSchema.methods.calculateAvgStreamLength = function calculateAvgStreamLength(streams){

	var totalStreamTime = 0;

	//ALL
	for(var i = 0; i < streams.length; i++){
		totalStreamTime += streams[i].stats.streamLength;
	}
	this.stats.avgStreamLengthAll = (totalStreamTime/streams.length);

	totalStreamTime = 0;

	//MONTH
	for(var i = 0; i < streams.length; i++){
		if((Date.now() - streams[i].endTime) <= 30*24*60*60*1000){
			totalStreamTime += streams[i].stats.streamLength;
		}else if((Date.now() - streams[i].startTime) <= 30*24*60*60*1000){
			totalStreamTime += ((Date.now() - 30*24*60*60*1000) - streams[i].startTime)/(1000*60);
		}
	}
	this.stats.avgStreamLengthMonth = (totalStreamTime/streams.length);

	totalStreamTime = 0;

	//WEEK
	for(var i = 0; i < streams.length; i++){
		if((Date.now() - streams[i].endTime) <= 7*24*60*60*1000){
			totalStreamTime += streams[i].stats.streamLength;
		}else if((Date.now() - streams[i].startTime) <= 7*24*60*60*1000){
			totalStreamTime += ((Date.now() - 7*24*60*60*1000) - streams[i].startTime)/(1000*60);
		}
	}
	this.stats.avgStreamLengthWeek = (totalStreamTime/streams.length);

	this.save();
}

/**
 * Calculate the total stream time in past month, week, and all time
 * @param streams {JSON Array}: array of all the streams data
 */
StreamerSchema.methods.calculateTotalStreamTime = function calculateTotalStreamTime(streams){

	var totalStreamTime = 0;
	
	//ALL
	for(var i = 0; i < streams.length; i++){
		totalStreamTime += streams[i].stats.streamLength;
	}
	this.stats.totalStreamTimeAll = (totalStreamTime);

	totalStreamTime = 0;

	//MONTH
	for(var i = 0; i < streams.length; i++){
		if((Date.now() - streams[i].endTime) <= 30*24*60*60*1000){
			totalStreamTime += streams[i].stats.streamLength;
		}else if((Date.now() - streams[i].startTime) <= 30*24*60*60*1000){
			totalStreamTime += ((Date.now() - 30*24*60*60*1000) - streams[i].startTime)/(1000*60);
		}
	}
	this.stats.totalStreamTimeMonth = (totalStreamTime);

	totalStreamTime = 0;

	//WEEK
	for(var i = 0; i < streams.length; i++){
		if((Date.now() - streams[i].endTime) <= 7*24*60*60*1000){
			totalStreamTime += streams[i].stats.streamLength;
		}else if((Date.now() - streams[i].startTime) <= 7*24*60*60*1000){
			totalStreamTime += ((Date.now() - 7*24*60*60*1000) - streams[i].startTime)/(1000*60);
		}
	}
	this.stats.totalStreamTimeWeek = (totalStreamTime);

	this.save();
}

/**
 * Calculate the average viewers in past month, week, and all time
 * @param streams {JSON Array}: array of all the streams data
 */
StreamerSchema.methods.calculateAvgViewers = function calculateAvgViewers(streams){

	var totalViewers = 0;
	
	//ALL
	for(var i = 0; i < streams.length; i++){
		totalViewers += streams[i].stats.avgViewers;
	}

	this.stats.avgViewersAll = (totalViewers/streams.length);

	totalViewers = 0;

	//MONTH
	for(var i = 0; i < streams.length; i++){
		if((Date.now() - streams[i].endTime) <= 30*24*60*60*1000){
			totalViewers += streams[i].stats.avgViewers;
		}
	}
	this.stats.avgViewersMonth = (totalViewers/streams.length);

	totalViewers = 0;

	//WEEK
	for(var i = 0; i < streams.length; i++){
		if((Date.now() - streams[i].endTime) <= 7*24*60*60*1000){
			totalViewers += streams[i].stats.avgViewers;
		}
	}
	this.stats.avgViewersWeek = (totalViewers/streams.length);

	this.save();
}

/**
 * Sorts the games based on playtime in descending order.
 */
StreamerSchema.methods.sortGameData = function sortGameData(){
	if(this.gameData == null){
		return;
	}

	this.gameData.sort(function(a,b){
		return b.playtime - a.playtime;
	});

	this.save();
}

/**
 * Increments the playtime for the game (data is pulled ever 5 mins, so 5 mins of play time is added each call)
 * @param gameName {String}: name of the game
 */
StreamerSchema.methods.incrementGameData = function incrementGameData(gameName){
	var data = this.gameData;
	var index = -1;
	var FREQ = config.worker.fetchStreamerDelay/(60*1000); //5 mins

	if(data.length == 1){
		if(data[0].name == gameName){
			index = 0;
		}
	}else{
		for(var i = 0; i < data.length; i++){
			if(data[i].name == gameName){
				index = i;
			}
		}
	}

	if(index == -1){
		this.gameData[0] = {name: gameName, playtime: FREQ};
	}else{
		this.gameData[index].playtime = (data[index].playtime + FREQ);
	}

	index = -1;
	this.save();
}

/**
 * Pulls the streamers stats and information from the twitch api and logs it into the database.
 */
StreamerSchema.methods.logData = function logData(){
	var streamer = this;
	console.log("Streamer - " + this.channel.name);

	//Get stream data
	twitch.getChannelStream(streamer.channel.name,function(err, data){
		if(data == null){
			console.log("Failed to fetch stream " + streamer.channel.name);
			return;
		}

		//Check if streamer is not Live
		if(data.stream == null || data.stream.stream_type != "live"){
			//Check if streamer was online last time it was checked
			if(streamer.isOnline){

				//Find the last stream and end it.
				LiveStream.findOne({streamerID: streamer.streamerID}).sort({'startTime': -1}).exec(function(err,liveStream){
					liveStream.endStream();

					//Check if this streams peak viewer is higher than the channel has ever had
					if(liveStream.stats.peakViewers > streamer.stats.peakViewers){
						streamer.stats.peakViewers = liveStream.stats.peakViewers;
					}

					streamer.calculateStats();
					streamer.isOnline = false;
					streamer.save();
				});
			}
			return;
		}

		//Check if steam is not set to online and its online now
		if(!streamer.isOnline){

			LiveStream.findOne({streamID: data.stream._id}, function(err,liveStream){
				//Check if stream alraedy exists
				if(liveStream != null){
					console.log("Stream Already exists " + liveStream.streamID);
					streamer.isOnline = true;
					streamer.save();
					return;
				}

				//Create new Stream Model
				LiveStream.create({
					streamID: data.stream._id,
					streamerID: streamer.streamerID,
					title: data.stream.channel.status,
					channel: streamer.channel.name,
					live: true,
					viewers: data.stream.viewers,
					startTime: Date.now(),
					endTime: Date.now(),
					delay: data.stream.delay
				}, function(err, newLiveStream){
					streamer.isOnline = true;
					streamer.save();
					twitch.getChannelVideos(streamer.channel.name,{limit: 1, broadcasts: true}, function(err, videos){
						newLiveStream.videoID = parseInt(videos.videos[0]._id.replace('v',''));
						newLiveStream.thumbnail = videos.videos[0].preview;
						newLiveStream.save();
						newLiveStream.logData(Date.now(), data.stream.viewers, data.stream.game);
					});
				});
			});
		}

		//Check if streamer is online
		if(streamer.isOnline){

			//Log Game Data
			streamer.incrementGameData(data.stream.game);

			//Log Viewer Data
			LiveStream.findOne({streamerID: streamer.streamerID}).sort({'startTime': -1}).exec(function(err,liveStream){
				if(liveStream == null){
					streamer.isOnline = false;
					streamer.save();
					return;
				}
				//Check if this streams peak viewer is higher than the channel has ever had
				if(liveStream.stats.peakViewers > streamer.stats.peakViewers){
					streamer.stats.peakViewers = liveStream.stats.peakViewers;
					streamer.save();
				}

				liveStream.title = data.stream.channel.status;
				liveStream.save();

				liveStream.logData(Date.now(), data.stream.viewers, data.stream.game);
			});
		}

		streamer.save();
	});

	//Get streamer data
	twitch.getChannel(streamer.channel.name, function(err, channel){
		if(channel == null){
			console.log("Failed to fetch channel");
			return;
		}

		StreamerData.findOne({streamerID: streamer.streamerID}, {}, {sort: {'timestamp': -1}}, function(err,data){
			if(data != null){
				if(data.views > channel.views){
					channel.views = data.views;
				}

				if(data.followers > 0 && channel.followers == 0){
					channel.followers = data.followers;
				}
			}

			StreamerData.create({
				streamerID: streamer.streamerID,
				timestamp: Date.now(),
				views: channel.views,
				followers: channel.followers
			},function(err,data){

			});

			streamer.channel.views = channel.views;
			streamer.channel.followers = channel.followers;
			streamer.save();

	    });
	});
}

/**
 * Removes all data assocaicated with this streamer
 */
StreamerSchema.methods.deleteStreamer = function deleteStreams(){
	var streamer = this;

	LiveStream.find({streamerID: streamer.streamerID}).exec(function(err, streams){
		for(var i = 0; i < streams.length; i ++){
			streams[i].deleteStream();
		}
		StreamerData.remove({streamerID: streamer.streamerID},function(err,data){
			streamer.remove();
		});
	});
}

var Streamer = mongoose.model('Streamer', StreamerSchema);

module.exports = Streamer;