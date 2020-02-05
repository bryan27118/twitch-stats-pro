var mongoose = require("mongoose");
var env = process.env.NODE_ENV || "development";
var Streamer = require("./Streamer");
var StreamData = require("./StreamData");
var StreamerData = require("./StreamerData");
var config = require('../config/' + env + '.js');
var TwitchApi = require('twitch-api');

//Start twitch API
var twitch = new TwitchApi({
    clientId: config.strategies.twitch.clientID,
    clientSecret: config.strategies.twitch.clientSecret,
    redirectUri: config.strategies.twitch.callbackURL,
    scopes: []
  });

var LiveStreamSchema = new mongoose.Schema({
  //ID of the stream (From Twitch API)
  streamID: {
  	type: Number,
  	default: 0
  },
  videoID: {
    type: Number,
    default: 0
  },
  streamerID: {
    type: Number,
    default: 0
  },
  //Stream title
  title: String,
  //thumbnail image
  thumbnail: String,
  //Channel name
  channel: String,
  //List of games played
  games: [{
    name: String,
    startTime: Date
  }],
  //Is the stream live
  live: Boolean,
  //Current viewers
  viewers: Number,
  //Stream start time
  startTime: Date,
  //Stream end time
  endTime: Date,
  //Stream delay (From Twitch API)
  delay: Number,
  //Statistics of the stream
  stats: {
    peakViewers: { type: Number, default: 0 },
    streamLength: { type: Number, get: v => Math.round(v), set: v => Math.round(v), default: 0 }, // In Mins
    avgViewers: { type: Number, get: v => Math.round(v), set: v => Math.round(v), default: 0 },
    newFollowers: { type: Number, get: v => Math.round(v), set: v => Math.round(v), default: 0 },
    newViews: { type: Number, get: v => Math.round(v), set: v => Math.round(v), default: 0 }
  }
});

/**
 * Update the streamer data with the twitch data
 */
LiveStreamSchema.methods.updateStream = function updateStream() {
  var stream = this;

  //Use the twitch API to search for the game
  twitch.getVideo(stream.videoID, function(err, video){
    console.log(stream.videoID);
    console.log(video);
    if(video == null){
      console.log("Null Video");
      stream.thumbnail = "https://static-cdn.jtvnw.net/previews-ttv/live_user_" + stream.channel + "-320x180.jpg";
      stream.save();
    }else{
      stream.thumbnail = video.preview;
      stream.save();
    }
  });
}

/**
 * Ends the stream and calculates the final statistics
 */
LiveStreamSchema.methods.endStream = function endStream(){
  this.endTime = Date.now();
  this.live = false;
  this.save();
  this.calculateStats();
}

/**
 * Calculate all of the stats, average viewers and stream length
 */
LiveStreamSchema.methods.calculateStats = function calculateStats(){
  this.stats.streamLength = (this.endTime - this.startTime)/(1000*60);
  this.save();
  this.calculateAvgViewers();
  this.calculateNewFollowersAndViews();
}

/**
 * Calculate the average viewers throughout the stream
 */
LiveStreamSchema.methods.calculateAvgViewers= function calculateAvgViewers(){
  var totalViewers = 0;
  var stream = this;

  StreamData.find({streamID: this.streamID}, function(err, data){
    if(data == null){
      console.log("No Data");
      return;
    }

    for(var i = 0; i < data.length; i++){
      totalViewers += data[i].viewers;
    }
    stream.stats.avgViewers = totalViewers/data.length;
    stream.save();
  });
}

/**
 * Calculate the average viewers throughout the stream
 */
LiveStreamSchema.methods.calculateNewFollowersAndViews= function calculateNewFollowersAndViews(){
  var stream = this;

  StreamerData.findOne({streamerID: stream.streamerID, timestamp: {'$gte': stream.startTime}}).sort({'timestamp': 1}).exec(function(err, data){
    if(data == null){
      console.log("Start Data error " + stream.channel);
      return;
    }
    var startFollowers = data.followers;
    var startViews = data.views;

    StreamerData.findOne({streamerID: stream.streamerID, timestamp: {'$lte': stream.endTime}}).sort({'timestamp': -1}).exec(function(err, dataEnd){
      if(dataEnd == null){
        console.log("End Data error " + stream.channel);
        return;
      }

      stream.stats.newFollowers = dataEnd.followers - startFollowers;
      stream.stats.newViews = dataEnd.views - startViews;

      stream.save();
    });
  });
}

/**
 * Log stream data
 * @param newTimestamp {Date}: time the data was fetched at
 * @param newViewers {Number}: viewers at the date logged
 */
LiveStreamSchema.methods.logData = function logData(newTimestamp, newViewers, currentGame){
  var stream = this;

  if(stream.games.length == 0){
    stream.games.push({name: currentGame, startTime: newTimestamp});
  } else if(stream.games[stream.games.length - 1].name != currentGame){
    stream.games.push({name: currentGame, startTime: newTimestamp});
  }

  if(newViewers > stream.stats.peakViewers){
    stream.stats.peakViewers = newViewers;
  }

  stream.viewers = newViewers;

  StreamData.create({
    streamID: stream.streamID,
    timestamp: newTimestamp,
    viewers: newViewers
  },function(err,data){
    stream.endTime = newTimestamp;
    stream.save();
    stream.calculateStats();
  });  
}

/**
 * Deletes the stream and all of its data
 */
LiveStreamSchema.methods.deleteStream = function deleteStream(){
  var stream = this;

  StreamData.remove({streamID: stream.streamID},function(err,data){
    stream.remove();
  });
}

var LiveStream = mongoose.model('LiveStream', LiveStreamSchema);

module.exports = LiveStream;