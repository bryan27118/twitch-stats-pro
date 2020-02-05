var express = require('express');
var router = express.Router();
var LiveStream = require("../../models/LiveStream");
var StreamData = require("../../models/StreamData");
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

//----------/CREATE----------//

//----------READ----------//

/**
 * Get all of the livestreams
 * Route: ./api/stream/all/{amount}/{offset}
 * Permissions: All
 * @response streams {JSON}: A list of all the streams and all of their data
 */
router.get('/all/:amount/:offset', function(req, res) {
    var offset = parseInt(req.params.offset);
    var amount = parseInt(req.params.amount);

    LiveStream.find({}).sort({'startTime': -1}).skip(offset).limit(amount).exec(function(err, streams){
        res.json(streams);
    });
});

/**
 * Get all of the livestreams from the channel
 * Route: ./api/stream/{channel}/all/{amount}/{offset}
 * Permissions: All
 * @response streams {JSON}: A list of all the streams and all of their data
 */
router.get('/:channel/all/:amount/:offset', function(req, res) {
    var offset = parseInt(req.params.offset);
    var amount = parseInt(req.params.amount);
    var channel = req.params.channel;

    LiveStream.find({channel: channel}).sort({'startTime': -1}).skip(offset).limit(amount).exec(function(err, streams){
        res.json(streams);
    });
});

/**
 * Get stream by ID with all data
 * Route: ./api/stream/{id}
 * Permissions: All
 * @param id {String}: streams's id
 * @response streams {JSON}: A list of all the streams with all data
 */
router.get('/:id', function(req, res) {
	var id = req.params.id;

	LiveStream.findOne({streamID: id}, function(err, stream){
		res.json(stream);
	});
});


/**
 * Get a streamer's data
 * Route: ./api/stream/{id}/StreamData/{amount}/{offset}
 * Permissions: All
 * @param id {String}: streams's id
 * @param amount {String}: the amount of days of data
 * @param offset {String}: the amount of days to offset the start point
 * @response data {JSON}: the streams's data
 */
router.get('/:id/StreamData/all', function(req, res) {
    var id = req.params.id;

    StreamData.find({streamID: id}).sort({'timestamp': 1}).exec(function(err,data){
        res.json(data);
    });
});

/**
 * Get stream by ID with partial data (streamData[last])
 * Route: ./api/stream/{id}/StreamData/newest
 * Permissions: All
 * @param id {String}: game's id
 * @response stream {JSON}: The stream object with partial data
 */
router.get('/:id/StreamData/newest', function(req, res) {
    var id = req.params.id;

    StreamData.findOne({streamID: id}, {}, {sort: {'timestamp': -1}}, function(err,data){
        res.json(data);
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
router.delete('/:id/delete', utils.ensureAdmin, function(req, res) {
    var id = req.params.id;

    LiveStream.findOne({streamID: id}, function(err, stream){
        stream.deleteStream();
        res.json({status: true});
    });
});

//----------/DELETE----------//

module.exports = router;