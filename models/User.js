var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var secret = require('../config').secret;

// define mongoose schema
var UserSchema = new mongoose.Schema({
    username: {
        type: String,
        lowercase: true,
        unique: true,
        require: [true, "can't be blank"],
        match: [/^[a-zA-Z0-9]+$/, 'is invalid'],
        // optimize queries that use this field
        index: true
    },
    email: {
        type: String,
        lowercase: true,
        unique: true,
        require: [true, "can't be blank"],
        match: [/\S+@\S+\.\S+/, 'is invalid'],
        // optimize queries that use this field
        index: true
    },
    bio: String,
    image: String,
    hash: String,
    salt: String
}, { timestamps: true });

// utilizes unique validator plugin to make sure username and email are unique
// error is sent if they are not unique
UserSchema.plugin(uniqueValidator, { message: 'is already taken.' });

// Using the crypto library that comes with node to create hash and salt based on user password
// method to set the password and store in mongodb
UserSchema.methods.setPassword = function (password) {
    this.salt = crypto.randomBytes(16).toString('hex');
    this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

// method to validate user entered password
UserSchema.methods.validPassword = function (password) {
    var hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
    // returns true or false if hash equals stored hash which means the password
    // entered by the user is correct
    return this.hash === hash;
};

// method to generate a jwt
// JWT's are the tokens that will be passed to the front-end that will be
// used for authentication. The JWT contains a payload (assertions) that is
// signed by the back-end, so the payload can be read by both the front-end
// and back-end, but can only be validated by the back-end.

// token's payload has 3 fields
    // 1. id which is the database id of the user
    // 2. username which is the username of the user
    // 3. exp which is a UNIX timestamp in seconds that determines when the token
    // will expire. We'll be setting the token expiration to 60 days in the future.
UserSchema.methods.generateJWT = function () {
    var today = new Date();
    var exp = new Date(today);
    // make token set to expire in 60 days
    exp.setDate(today.getDate() + 60);

    return jwt.sign({
        id: this._id,
        username: this.username,
        exp: parseInt(exp.getTime() / 1000) // converts exp to seconds
    }, secret);
};

// method to get JSON representation of the user returned to specific authenticated user
// on the front-end
UserSchema.methods.toAuthJSON = function () {
  return {
      username: this.username,
      email: this.email,
      token: this.generateJWT();
  }
};

mongoose.model('User', UserSchema);