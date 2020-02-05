var express = require('express');
var router = express.Router();
var User = require("../models/User");

module.exports = function(passport) {
    /**
     * Login a user
     * Route: ./auth/login
     * Permissions: All
     * @response user {JSON}: user object
     */
    router.post('/login', passport.authenticate('local-login'), function(req, res) {
        res.json(req.user);
    });

    /**
     * signup a user
     * Route: ./auth/signup
     * Permissions: All
     * @response user {JSON}: user object
     */
    router.post('/signup', passport.authenticate('local-signup'), function(req, res) {
        res.json(req.user);
    });

    /**
     * Get current users data
     * Route: ./auth/user
     * Permissions: User
     * @response user {JSON}: user object
     */
    router.get('/user', function(req, res) {
        res.json(req.user);
    });

    /**
     * Check if a user is logged in
     * Route: ./auth/loggedin
     * Permissions: All
     * @response user {JSON}: user object or 0 if not logged in
     */
    router.post('/loggedin', function(req, res) {
        res.send(req.isAuthenticated() ? req.user : '0');
    });

    /**
     * Logout a user
     * Route: ./auth/logout
     * Permissions: All
     * @response user {JSON}: user object or 0 if not logged in
     */
    router.post('/logout', function(req, res) {
        req.logOut();
        res.json(req.user);
    });

    return router;
}