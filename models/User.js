var mongoose = require("mongoose");
var bcrypt = require('bcrypt-nodejs');

var UserSchema = new mongoose.Schema({
  //user's name
  name: String,
  //user's email
  email: String,
  //encrpyted password
  password: String,
  //is the users email verified
  verifiedEmail: {
    type: Boolean,
    default: false
  },
  //Unique token for the user
  token: String,
  //is the user allowed to recive emails from us
  allowEmail: {
    type: Boolean,
    default: true
  },
  //Roles of the user, Current roles: user, admin
  role: {
    type: String,
    default: "user"
  },
  //When the user was created
  createdAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * Check if entered password is correct
 * @param password {String}: password entered by the user.
 * @param done {Function}: callback function that returns the (error, user)
 */
UserSchema.methods.checkPassword = function checkPassword(password, done){
    var user = this;
    bcrypt.compare(password, this.password, function(err, res) {
        if (res == true) {
            return done(null, user);
        } else {
            return done(null, false);
        }
    });
}

/**
 * Sets the users password
 * @param pass {String}: new users password
 */
UserSchema.methods.setPassword = function setPassword(pass){
    var salt = bcrypt.genSaltSync(10);
    this.password = bcrypt.hashSync(pass,salt);
    this.save();
}

/**
 * Sets the users email
 * @param email {String}: new users email
 */
UserSchema.methods.setEmail = function setEmail(email){
    this.verifiedEmail = false;
    this.email = email
    this.save();
}

/**
 * Sets the users role
 * @param role {String}: new users role
 */
UserSchema.methods.setRole = function setRole(role){
    this.role = role;
    this.save();
}

var User = mongoose.model('User', UserSchema);

module.exports = User;