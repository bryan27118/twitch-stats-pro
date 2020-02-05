var express = require('express');
var router = express.Router();
var Streamer = require("../../models/Streamer");
var LiveStream = require("../../models/LiveStream");
var StreamerData = require("../../models/StreamerData");
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
 * Create a new streamer
 * Route: ./api/streamer/create
 * Permissions: Admin
 * @body name {String}: name of the streamer
 * @response {status: {Boolean}, error: {String}}
 */
router.post('/create', utils.ensureAdmin, function(req, res) {
    var name = req.body.name;

    twitch.getChannel(name, function(err, stream){
      
        if(stream == null){
            res.json({status: false, error: "Invalid Channel Name"});
        }else{
            Streamer.find({streamerID: stream._id}, function(err, docs){
                if(docs.length != 0){
                    res.json({status: false, error: "Streamer already exists"});
                    return;
                }
                Streamer.create({
                    streamerID: stream._id,
                    channel: {
                        name: stream.name,
                        display_name: stream.display_name,
                        mature: stream.mature,
                        partner: stream.partner,
                        language: stream.broadcaster_language,
                        logo: stream.logo,
                        video_banner: stream.video_banner,
                        profile_banner: stream.profile_banner,
                        views: stream.views,
                        followers: stream.followers,
                        createdAt: stream.created_at
                      }
                },function(err, newStream) {
                    workers.queueFetchStreamData(newStream.streamerID);
                    res.json({status: true});
                });

            });
        }
    });
});
//----------/CREATE----------//

//----------READ----------//

/**
 * Get all of the streamers with all of the data
 * Route: ./api/streamer/all
 * Permissions: All
 * @response streamers {JSON}: A list of all the streamers and all of their data
 */
router.get('/all/:amount/:offset', function(req, res) {
    var offset = parseInt(req.params.offset);
    var amount = parseInt(req.params.amount);
    Streamer.find({}).sort({'_id': 1}).skip(offset).limit(amount).exec(function(err, streamers){
        res.json(streamers);
    });
});

/**
 * Get all of the streamers with partial data (channel streamerID)
 * Route: ./api/streamer/all/overview
 * Permissions: All
 * @response streamers {JSON}: A list of all the streamers with partial data
 */
 router.get('/all/overview/:amount/:offset', function(req, res) {
    var offset = parseInt(req.params.offset);
    var amount = parseInt(req.params.amount);

    Streamer.find({}).skip(offset).limit(amount).exec(function(err, streamers){
        res.json(streamers);
    });
});

/**
 * Get streamer by ID with all data
 * Route: ./api/streamer/{id}
 * Permissions: All
 * @param id {String}: game's id
 * @response streamers {JSON}: A list of all the streamers with all data
 */
router.get('/:id', function(req, res) {
	var id = req.params.id;

	Streamer.findOne({streamerID: id}, function(err, streamer){
		res.json(streamer);
	});
});

/**
 * Get streamer by ID with partial data (streamerID isOnline channel stats streams gameData)
 * Route: ./api/streamer/{id}/base
 * Permissions: All
 * @param id {String}: game's id
 * @response streamer {JSON}: The streamer object with partial data
 */
router.get('/:id/base', function(req, res) {
    var id = req.params.id;

    Streamer.findOne({streamerID: id},'streamerID isOnline channel stats streams gameData',function(err, streamer){
        res.json(streamer);
    });
});

/**
 * Get a streamer's data
 * Route: ./api/streamer/{id}/StreamerData/{amount}/{offset}
 * Permissions: All
 * @param id {String}: streamer's id
 * @param amount {String}: the amount of days of data
 * @param offset {String}: the amount of days to offset the start point
 * @response data {JSON}: the game's data
 */
router.get('/:id/StreamerData/:amount/:offset', function(req, res) {
    var id = req.params.id;
    var amount = req.params.amount;
    var offset = req.params.offset;
    var newestPossibleTime = Date.now() - offset*24*60*60*1000;
    var oldestPossibleTime = Date.now() - amount*24*60*60*1000;

    StreamerData.find({streamerID: id, timestamp: {'$gt': oldestPossibleTime, '$lt': newestPossibleTime}}).sort({'timestamp': 1}).exec(function(err,data){
        res.json(data);
    });
});

/**
 * Get a Livestreams
 * Route: ./api/streamer/{id}/Streams/{amount}/{offset}
 * Permissions: All
 * @param id {String}: streamer's id
 * @param amount {String}: the amount of days of data
 * @param offset {String}: the amount of days to offset the start point
 * @response data {JSON}: the game's data
 */
router.get('/:id/Streams/:amount/:offset', function(req, res) {
    var id = parseInt(req.params.id);
    var amount = parseInt(req.params.amount);
    var offset = parseInt(req.params.offset);

    LiveStream.find({streamerID: id}).sort({'startTime': 1}).skip(offset).limit(amount).exec(function(err,data){
        res.json(data);
    });
});

/**
 * Get a streamer's data
 * Route: ./api/streamer/{id}/StreamerData/{amount}/{offset}
 * Permissions: All
 * @param id {String}: streamer's id
 * @param amount {String}: the amount of days of data
 * @param offset {String}: the amount of days to offset the start point
 * @response data {JSON}: the game's data
 */
router.get('/:id/StreamerData/all', function(req, res) {
    var id = req.params.id;

    StreamerData.find({streamerID: id}).sort({'timestamp': 1}).exec(function(err,data){
        res.json(data);
    });
});

/**
 * Get streamer by ID with partial data (streamerData[last])
 * Route: ./api/streamer/{id}/StreamerData/newest
 * Permissions: All
 * @param id {String}: streamer's id
 * @response streamer {JSON}: The streamer object with partial data
 */
router.get('/:id/StreamerData/newest', function(req, res) {
    var id = req.params.id;

    StreamerData.findOne({streamerID: id}, {}, {sort: {'timestamp': -1}}, function(err,data){
        res.json(data);
    });
});

router.get('/search/:name', function(req, res) {
    var name = req.params.name;

    twitch.searchChannels({query: name, limit: 5},function(err,results){
        res.json(results.channels);
    });
});

//----------/READ----------//

//----------UPDATE----------//

//----------/UPDATE----------//

//----------DELETE----------//

/**
 * Delete a streamer by id
 * Route: ./api/streamer/delete/{id}
 * Permissions: Admin
 * @param id {String}: streamer's id
 * @response {status: true}
 */
router.delete('/delete/:id', utils.ensureAdmin, function(req, res) {
    var id = req.params.id;

    Streamer.findOne({streamerID: id}, function(err, streamer){
        if(streamer == null){
            return;
        }
        streamer.deleteStreamer();
        res.json({status: true});
    });
});

//----------/DELETE----------//

module.exports = router;