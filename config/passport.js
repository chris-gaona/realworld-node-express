var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');
var User = mongoose.model('User');

// advantage to using Passport is that it gives the ability to add other authentication
// strategies such as OAuth in the future

// creating new LocalStrategy
passport.use(new LocalStrategy({
    usernameField: 'user[email]',
    passwordField: 'user[password]'
}, function (email, password, done) {
    // search for user with specific email
    User.findOne({email: email}).then(function (user) {
        // if user does not exist or does not provide valid password
        if (!user || !user.validPassword(password)) {
            // return validation error
            return done(null, false, {errors: {'email or password': 'is invalid'}});
        }

        return done(null, user);
    }).catch(done);
}));