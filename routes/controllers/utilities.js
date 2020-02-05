'use strict';

var nodemailer = require('nodemailer');
var env = process.env.NODE_ENV || "development";
var config = require('../../config/' + env + '.js');
var User = require("../../models/User");
var jade = require('jade');
var fs = require('fs');
var Utilities = {};

var transporter = nodemailer.createTransport({
        service: config.mailer.service,
        auth: {
            user: config.mailer.auth.user,
            pass: config.mailer.auth.pass
        }
    });

/**
 * Check if the user is logged in
 * @params req {JSON} request
 * @params res {JSON} response 
 * @params next {Function} callback function
 * @return if user is logged in then it calls the next callback
 */
Utilities.ensureAuthenticated = function(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

/**
 * Check if the user is an admin
 * @params req {JSON} request
 * @params res {JSON} response 
 * @params next {Function} callback function
 * @return if user is an admin then it calls the next callback
 */
Utilities.ensureAdmin = function(req, res, next) {
    if (req.isAuthenticated() && req.user.role == "admin") {
        return next();
    }
    res.redirect('/');
}

/**
 * Send an email to all subscribed users
 * @params subject {String} email subject
 * @params message {String} email message 
 */
Utilities.sendEmailtoAll = function(subject, message) {
    var mailOptions = [];

    this.jadeToHtml("layouts/emailTemplate.jade",{app: config.app, message: message}, function(template){
	    User.find({}, function(err, users) {
	        for (var i = 0; i < users.length; i++) {
	            if (users[i].email != "" && users[i].email != null && users[i].allowEmail == true) {
	                mailOptions = {
	                    from: config.app.name + '<' + config.emailFrom + '>', // sender address
	                    to: users[i].email, // list of receivers
	                    subject: subject, // Subject line
	                    html: template // html body
	                };

	                // send mail with defined transport object
	                transporter.sendMail(mailOptions, function(error, info) {
	                    if (error) {
	                        return console.log(error);
	                    }
	                    return;
	                });
	            }
	        }
	    });    	
    });
}

/**
 * Send an email to a user
 * @params id {Function} users id
 * @params subject {String} email subject
 * @params message {String} email message 
 */
Utilities.sendEmailtoUser = function(id, subject, message) {
    var mailOptions = [];

    this.jadeToHtml("layouts/emailTemplate.jade",{app: config.app, message: message}, function(template){
	    User.findOne({_id: id}, function(err, user) {
            if (user.email != "" && user.email != null && user.allowEmail == true) {
                mailOptions = {
                    from: config.app.name + '<' + config.emailFrom + '>', // sender address
                    to: user.email, // list of receivers
                    subject: subject, // Subject line
                    html: template // html body
                };

                // send mail with defined transport object
                transporter.sendMail(mailOptions, function(error, info) {
                    if (error) {
                        return console.log(error);
                    }
                    return;
                });
            }
	    });    	
    });
}

/**
 * Converts a jade file into html
 * @params jadeFile {String} file path
 * @params jadeData {JSON} data used for the file
 * @params callback {Function} callbackfunction
 * @return html {String} converted html string
 */
Utilities.jadeToHtml = function(jadeFile, jadeData, callback){
	fs.readFile(jadeFile, 'utf8', function (err, data) {
	    if (err) throw err;
	    var fn = jade.compile(data);
	    var html = fn(jadeData);
	    callback(html);
	});
}

module.exports = Utilities;