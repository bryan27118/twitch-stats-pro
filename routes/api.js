var express = require('express');
var router = express.Router();
var User = require("../models/User");

//Handle the routing to the correct controller
router.use('/user', require('./controllers/user'));
router.use('/game', require('./controllers/game'));
router.use('/streamer', require('./controllers/streamer'));
router.use('/stream', require('./controllers/stream'));
router.use('/tools', require('./controllers/tools'));

module.exports = router;