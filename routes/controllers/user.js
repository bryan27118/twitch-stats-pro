var express = require('express');
var router = express.Router();
var User = require("../../models/User");
var utils = require("./utilities.js");

//----------CREATE----------//

//----------/CREATE----------//

//----------READ----------//

/**
 * Get all of the users with all of the data
 * Route: ./api/user/all
 * Permissions: Admin
 * @response users {JSON}: A list of all the users and all of their data
 */
router.get('/all', utils.ensureAdmin, function(req, res) {
    User.find({},function(err, users){
        res.json(users);
    });
});

/**
 * Get a user by id
 * Route: ./api/user/all
 * Permissions: User
 * @param id {String}: user's id
 * @response user {JSON}: user object with all the data
 */
router.get('/:id', utils.ensureAuthenticated, function(req, res) {
   var id = req.params.id;

   User.findOne({_id: id}, 'name', function(err, user){
      res.json(user);
  });
});
//----------/READ----------//

//----------UPDATE----------//

/**
 * Update a users password
 * Route: ./api/user/password
 * Permissions: User
 * @body password {String}: users current password
 * @body newpassword {String}: users new password
 * @response {string}: error message or true
 */
router.post('/password', utils.ensureAuthenticated, function(req, res) {

    if(req.body.newpassword != req.body.newrepassword){
        res.send("Passwords do not match");
        return;
    }

    req.user.checkPassword(req.body.password, function(err, response){
        if(response){
            req.user.setPassword(req.body.newpassword);
            res.send("true");
        }else{
            res.send("Incorrect password");
        }
    });

});

/**
 * Update a users email
 * Route: ./api/user/email
 * Permissions: User
 * @body emailpassword {String}: users current password
 * @body email {String}: users new email
 * @response {string}: error message or true
 */
router.post('/email', utils.ensureAuthenticated, function(req, res) {

    req.user.checkPassword(req.body.emailpassword, function(err, response){
        if(response){
            req.user.setEmail(req.body.email);
            res.send("true");
        }else{
            res.send("Incorrect password");
        }
    });

});

/**
 * Update a users settings
 * Route: ./api/user/settings
 * Permissions: User
 * @body allowemail {Boolean}: if the user wants to subscribe to our email list
 * @response {string}: error message or true
 */
router.post('/settings', utils.ensureAuthenticated, function(req, res) {
    User.update({
        _id: req.user._id
    }, {
        allowEmail: req.body.allowemail
    }, function(err, numberAffected, doc) {
        res.send("true")
    });
});

/**
 * Update a users role
 * Route: ./api/user/email
 * Permissions: Admin
 * @body role {String}: users new role
 * @response user {JSON}: user object
 */
router.post('/role/:id', utils.ensureAdmin, function(req, res) {
    var id = req.params.id;

    User.update({
        _id: id
    }, {
        role: req.body.role
    }, function(err, numberAffected, doc) {
        res.json(doc);
    });

});

/**
 * Update a users email
 * Route: ./api/user/email
 * Permissions: Admin
 * @body role {String}: users new email
 * @response user {JSON}: user object
 */
router.post('/email/:id', utils.ensureAdmin, function(req, res) {
    var id = req.params.id;

    User.update({
        _id: id
    }, {
        email: req.body.email
    }, function(err, numberAffected, doc) {
        res.json(doc);
    });

});
//----------/UPDATE----------//

//----------DELETE----------//

//----------/DELETE----------//

module.exports = router;