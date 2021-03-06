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
    salt: String,
    // creates reference to Article favorited
    favorites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article'
    }],
    // creates a reference to User who is following
    followings: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

// utilizes unique validator plugin to make sure username and email are unique
// error is sent if they are not unique
UserSchema.plugin(uniqueValidator, { message: 'is already taken.' });


////////////////
// USER SPECIFIC METHODS
////////////////

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
      image: this.image,
      username: this.username,
      email: this.email,
      bio: this.bio,
      token: this.generateJWT()
  }
};

// method to return a user's public profile
UserSchema.methods.toProfileJSONFor = function (user) {
  return {
      username: this.username,
      bio: this.bio,
      image: this.image || 'https://static.productionready.io/images/smiley-cyrus.jpg',
      following: user ? user.isFollowing(this._id) : false
  };
};

////////////////
// FAVORITE AN ARTICLE
////////////////

// method to add a favorite article
UserSchema.methods.favorite = function (id) {
    // check if article has already been made favorite
  if (this.favorites.indexOf(id) === -1) {
      this.favorites.push(id);
  }

  return this.save();
};

// method to remove a favorite article
UserSchema.methods.unfavorite = function (id) {
    this.favorites.remove(id);

    return this.save();
};

// method to check if user has favorited an article for font end to easily add css styles
UserSchema.methods.isFavorite = function (id) {
    // The some() method tests whether some element in the array passes the test implemented by the provided function
    // return true if the callback function returns a truthy value for any array element; otherwise, false
  return this.favorites.some(function (favoriteId) {
      // if favorite id is found in favorites array return truthy value
     return favoriteId.toString() === id.toString();
  });
};

////////////////
// FOLLOWING ANOTHER USER
////////////////

// method to follow another user
UserSchema.methods.follow = function (id) {
    // make sure user is not already in following array
    if (this.followings.indexOf(id) === -1) {
        // if not in array already, push into the array
        this.followings.push(id);
    }

    return this.save();
};

// method to unfollow another user
UserSchema.methods.unfollow = function (id) {
    // mongoose method to remove the subdocument from its parent array
  this.followings.remove(id);

  return this.save();
};

// method to check if a user is following another user for front end css styles
UserSchema.methods.isFollowing = function (id) {
    // The some() method tests whether some element in the array passes the test implemented by the provided function
    // return true if the callback function returns a truthy value for any array element; otherwise, false
    return this.followings.some(function (followId) {
        // if user is found in following array return truthy value
        return followId.toString() === id.toString();
    })
};

mongoose.model('User', UserSchema);
