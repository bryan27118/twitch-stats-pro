var express = require('express');
var router = express.Router();
var Game = require("../../models/Game");
var GameData = require("../../models/GameData");
var env = process.env.NODE_ENV || "development";
var config = require('../../config/' + env + '.js');
var TwitchApi = require('twitch-api');
var utils = require("./utilities.js");
var workers = require('../../workers.js');

//Start twitch API
var twitch = new TwitchApi({
    clientId: config.strategies.twitch.clientID,
    clientSecret: config.strategies.twitch.clientSecret,
    redirectUri: config.strategies.twitch.callbackURL,
    scopes: []
  });

//----------CREATE----------//

/**
 * Create a new game
 * Route: ./api/game/create
 * Permissions: Admin
 * @body name {String}: name of the game
 * @response {status: {Boolean}, error: {String}}
 */
router.post('/create', utils.ensureAdmin, function(req, res) {
    var name = req.body.name;

    //Use the twitch API to search for the game
    twitch.searchGames({query: name, type: "suggest", live: true}, function(err, games){
        if(games.games.length == 0){
            res.json({status: false, error: "Invalid Game Name"});
        }else{

            //Check if the game is already in the database
            Game.find({name: games.games[0].name},function(err,docs){
                if(docs.length != 0){
                    res.json({status: false, error: "Game already exists"});
                    return;
                }
                //Get the game information
                twitch.getStreamsSummary({game: games.games[0].name}, function(err, gameStats){
                    //Enter the game into the database
                    Game.create({
                        name: games.games[0].name,
                        gameID: games.games[0]._id,
                        popularity: games.games[0].popularity,
                        icon: {
                            small: games.games[0].box.small,
                            medium: games.games[0].box.medium,
                            large: games.games[0].box.large
                        },
                        channels: gameStats.channels,
                        viewers: gameStats.viewers
                    },function(err, newGame) {
                        //Queue the logging for the game
                        workers.queueFetchGameData(newGame.gameID);
                        res.json({status: true});
                    });
                });
            });
        }
    });
});

//----------/CREATE----------//

//----------READ----------//

/**
 * Get all of the games with all of the data
 * Route: ./api/game/all/{amount}/{offset}
 * Permissions: All
 * @param amount {String}: the amount of games
 * @param offset {String}: offset of games
 * @response games {JSON}: A list of all the games and all of their data
 */
router.get('/all/:amount/:offset', function(req, res) {
    var offset = parseInt(req.params.offset);
    var amount = parseInt(req.params.amount);
    Game.find({}).sort({'_id': 1}).skip(offset).limit(amount).exec(function(err, games){
        res.json(games);
    });
});

/**
 * Get all of the games with only parital data (name, gameID, and Icon)
 * Route: ./api/game/all/base
 * Permissions: All
 * @response games {JSON}: A list of all the games with partial data
 */

 /*
router.get('/all/base', function(req, res) {
    Game.find({}, 'name gameID icon',function(err, games){
        res.json(games);
    });
});*/

/**
 * Get all of the games with only parital data (name, gameID, and Icon)
 * Route: ./api/game/all/base/{amount}/{offset}
 * Permissions: All
 * @param amount {String}: the amount of games
 * @param offset {String}: offset of games
 * @response games {JSON}: A list of all the games with partial data
 */
router.get('/all/base/:amount/:offset', function(req, res) {
    var offset = parseInt(req.params.offset);
    var amount = parseInt(req.params.amount);
    Game.find({}).sort({'_id': 1}).skip(offset).limit(amount).select('name gameID icon').exec(function(err, games){
        res.json(games);
    });
});


/**
 * Get all of the games with only parital data (name, gameID, and Icon, popularity, channels, viewers)
 * Route: ./api/game/all/overview
 * Permissions: All
 * @response games {JSON}: A list of all the games with partial data
 */

 /*
router.get('/all/overview', function(req, res) {
    Game.find({}, 'name gameID icon popularity channels viewers',function(err, games){
        res.json(games);
    });
});*/

/**
 * Get all of the games with only parital data (name, gameID, and Icon, popularity, channels, viewers)
 * Route: ./api/game/all/overview/{amount}/{offset}
 * Permissions: All
 * @param amount {String}: the amount of games
 * @param offset {String}: offset of games
 * @response games {JSON}: A list of all the games with partial data
 */
router.get('/all/overview/:amount/:offset', function(req, res) {
    var offset = parseInt(req.params.offset);
    var amount = parseInt(req.params.amount);
    Game.find({}).sort({'_id': 1}).skip(offset).limit(amount).select('name gameID icon popularity channels viewers').exec(function(err, games){
        res.json(games);
    });
});


/**
 * Get a game by id with all of the data
 * Route: ./api/game/{id}
 * Permissions: All
 * @param id {String}: game's id
 * @response game {JSON}: game object with all of its data
 */
router.get('/:id', function(req, res) {
	var id = req.params.id;

	Game.findOne({gameID: id}, function(err, game){
		res.json(game);
	});
});

/**
 * Get a game by id with partial data (name gameID channels viewers topStreamers stats popularity icon)
 * Route: ./api/game/{id}/base
 * Permissions: All
 * @param id {String}: game's id
 * @response game {JSON}: game object with partial data
 */
router.get('/:id/base', function(req, res) {
    var id = req.params.id;

    Game.findOne({gameID: id}, 'name gameID channels viewers topStreamers stats popularity icon ', function(err, game){
        res.json(game);
    });
});

/**
 * Get a game's game data
 * Route: ./api/game/{id}/GameData/{amount}/{offset}
 * Permissions: All
 * @param id {String}: game's id
 * @param amount {String}: the amount of days of data
 * @param offset {String}: the amount of days to offset the start point
 * @response data {JSON}: the game's data
 */
router.get('/:id/GameData/:amount/:offset', function(req, res) {
    var id = req.params.id;
    var amount = req.params.amount;
    var offset = req.params.offset;
    var newestPossibleTime = Date.now() - offset*24*60*60*1000;
    var oldestPossibleTime = Date.now() - amount*24*60*60*1000;

    GameData.find({gameID: id, timestamp: {'$gt': oldestPossibleTime, '$lt': newestPossibleTime}}).sort({'timestamp': 1}).exec(function(err,data){
        res.json(data);
    });
});

/**
 * Get a game's game data
 * Route: ./api/game/{id}/GameData/{amount}/{offset}
 * Permissions: All
 * @param id {String}: game's id
 * @param amount {String}: the amount of days of data
 * @param offset {String}: the amount of days to offset the start point
 * @response data {JSON}: the game's data
 */
router.get('/:id/GameData/all', function(req, res) {
    var id = req.params.id;

    GameData.find({gameID: id}).sort({'timestamp': 1}).exec(function(err,data){
        res.json(data);
    });
});

/**
 * Get a game by id with partial data (viewersData[last] channelsData[last])
 * Route: ./api/game/{id}/GameData/newest
 * Permissions: All
 * @param id {String}: game's id
 * @response {viewersData,channelsData}: object with only the newest viewer and channel data
 */
router.get('/:id/GameData/newest', function(req, res) {
    var id = req.params.id;

    GameData.findOne({gameID: id}, {}, {sort: {'timestamp': -1}}, function(err,data){
        res.json(data);
    });
});

/**
 * Get top 25 live streams on the game currently
 * Route: ./api/game/{id}/streams
 * Permissions: All
 * @param id {String}: game's id
 * @response streams {JSON}: list of streams
 */
router.get('/:id/streams', function(req, res) {
    var id = req.params.id;

    Game.findOne({gameID: id}, 'name', function(err, game){
        if(game == null){
            res.json(false);
            return;
        }
        twitch.getStreams({game: game.name, limit: 14}, function(err, streams){
            //TODO: Trim out parts we dont need for performance.
            res.json(streams);
        });
    });
});

/**
 * Get the game with only the top 5 streamers of all time
 * Route: ./api/game/{id}/streams/top
 * Permissions: All
 * @param id {String}: game's id
 * @response game {JSON}: game object with a list of the top 5 streamers
 */
router.get('/:id/streams/top', function(req, res) {
    var id = req.params.id;

    Game.findOne({gameID: id}).select('topStreamers').exec(function(err, game){
        if(game == null){
            res.json(false);
            return;
        }

        res.json(game);
    });
});

router.get('/search/:name', function(req, res) {
    var name = req.params.name;

    twitch.searchGames({query: name, type: 'suggest'},function(err,results){
        res.json(results.games.slice(0,3));
    });
});


//----------/READ----------//

//----------UPDATE----------//

//----------/UPDATE----------//

//----------DELETE----------//

/**
 * Delete a game by id
 * Route: ./api/game/delete/{id}
 * Permissions: Admin
 * @param id {String}: game's id
 * @response {status: true}
 */
router.delete('/delete/:id', utils.ensureAdmin, function(req, res) {
    var id = req.params.id;

    Game.findOne({
        gameID: id
    }, function(err, game) {
        game.deleteGame();
        res.json({status: true});
    });
});
//----------/DELETE----------//

module.exports = router;