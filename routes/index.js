var express = require("express");
var router = express.Router();
var path = require('path');
//Load Config
var env = process.env.NODE_ENV || "development";
var config = require('../config/' + env + '.js');

module.exports = function(passport) {
    router.use('/api', require('./api'));
    router.use('/auth', require('./auth')(passport));

    //render jade templates
    router.get('/templates/:filename', function(req, res){
      var filename = req.params.filename;
      if(!filename) return;  // might want to change this
      res.render("templates/" + filename + ".jade");
    });

    router.get('*', function(req, res) {
        res.render('layout', {
            app: config.app
        });
    });

    return router;
}