var Workers = (function () {
	var Threads = require('webworker-threads');
	var Game = require("./models/Game");
	var Streamer = require("./models/Streamer");
	var LiveStream = require("./models/LiveStream");
	var currentDay = new Date().getDay();
	var env = process.env.NODE_ENV || "development";
	var config = require('./config/' + env + '.js');

    //This is the actual singleton instance
    function Singleton() {

    }

    // this is our instance holder
    var instance;

    // this is an emulation of static variables and methods
    var _static = {
        FETCH_GAME_DELAY: config.worker.fetchGameDelay,
        FETCH_STREAMER_DELAY: config.worker.fetchStreamerDelay,
        GameDataThreadPool: Threads.createPool( config.worker.gameDataThreads ),
        StreamerDataThreadPool: Threads.createPool( config.worker.streamerDataThreads ),
        CollectData: true,
        // This is a method for getting an instance
        // It returns the same instance of the singleton object
        getInstance: function () {
            if (instance === undefined) {
                instance = new Singleton();
            }
            return instance;
        },
        start: function (){
			if(_static.CollectData == false){
				return;
			}

			console.log("Starting Game Threads(" + config.worker.gameDataThreads +") with a fetch freqency of " + _static.FETCH_GAME_DELAY/(60*1000) + " min(s).");
			Game.find({}, 'name stats gameID icon popularity', function(err, games){
				for(var i = 0; i < games.length; i ++){
					games[i].calculateStats();
					games[i].updateGame();
					setTimeout(_static.queueFetchGameData.bind(null, games[i].gameID) , i*((_static.FETCH_GAME_DELAY)/games.length));
				}
		    });
				
			console.log("Starting Streamer Threads(" + config.worker.streamerDataThreads +") with a fetch freqency of " + _static.FETCH_STREAMER_DELAY/(60*1000) + " min(s).");
		    Streamer.find({}, 'name channel stats streamerID gameData', function(err, streamers){
				for(var i = 0; i < streamers.length; i ++){
					streamers[i].calculateStats();
					streamers[i].updateStreamer();
					setTimeout(_static.queueFetchStreamData.bind(null, streamers[i].streamerID) , i*((_static.FETCH_STREAMER_DELAY)/streamers.length));
				}
		    });
		},
		queueFetchGameData: function(gameID){
			if(_static.CollectData == false){
				return;
			}

			var t = setTimeout(function(){
				_static.GameDataThreadPool.any.eval(_static.fetchGameData(gameID), function(){
					_static.queueFetchGameData(gameID);
				});
			}, _static.FETCH_GAME_DELAY);
		},
		fetchGameData: function (gameID){
			if(currentDay != new Date().getDay()){
				_static.dataReCalculate();
				currentDay = new Date().getDay();
			}
			Game.findOne({gameID: gameID}, function(err, game){
				if(game == null){
					return;
				}
				game.logData();
			});
		},
		queueFetchStreamData: function(streamerID){
			if(_static.CollectData == false){
				return;
			}

			setTimeout(function(){
				_static.StreamerDataThreadPool.any.eval(_static.fetchStreamData(streamerID), function(){
					_static.queueFetchStreamData(streamerID);
				});
			}, _static.FETCH_STREAMER_DELAY);
		},
		fetchStreamData: function (streamerID){
			Streamer.findOne({streamerID: streamerID},function(err, stream){
				if(stream == null){
					return;
				}

				stream.logData();
			});
		},
		dataReCalculate: function (){
			Game.find({}, 'name stats gameID icon popularity', function(err, games){
				for(var i = 0; i < games.length; i ++){
					games[i].calculateStats();
					games[i].updateGame();
				}
		    });
				
			
		    Streamer.find({}, 'name channel stats streamerID gameData', function(err, streamers){
				for(var i = 0; i < streamers.length; i ++){
					streamers[i].calculateStats();
					streamers[i].updateStreamer();
				}
		    });

		    LiveStream.find({}, 'thumbnail', function(err, streams){
				for(var i = 0; i < streams.length; i ++){
					streams[i].calculateStats();
					streams[i].updateStream();
				}
		    });
		}
    };
    return _static;
})();

module.exports = Workers;