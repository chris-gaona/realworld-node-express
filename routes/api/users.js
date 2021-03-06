var mongoose = require('mongoose');
var router = require('express').Router();
var passport = require('passport');
var User = mongoose.model('User');
var auth = require('../auth');

///////////////////
// registration route
///////////////////
router.post('/users', function (req, res, next) {
   var user = new User();

   // get user submitted data from from through req.body
   user.username = req.body.user.username;
   user.email = req.body.user.email;
   user.setPassword(req.body.user.password);

   user.save().then(function () {
      return res.json({user: user.toAuthJSON()});
   }).catch(next);
});

///////////////////
// login route
///////////////////
router.post('/users/login', function (req, res, next) {
    // validate that user inputted email
    // Unprocessable Entity 422 status code
   if (!req.body.user.email) {
       return res.status(422).json({errors: {email: "can't be blank"}});
   }

    // validate that user inputted password
    // Unprocessable Entity 422 status code
   if (!req.body.user.password) {
       return res.status(422).json({errors: {password: "can't be blank"}});
   }

    // authenticate user via passport
    // set session to false to prevent Passport from serializing the user into the session
    // since we're using JWT instead of sessions
   passport.authenticate('local', {session: false}, function (err, user, info) {
       if (err) return next(err);

       // if the user exists
       if (user) {
           user.token = user.generateJWT();
           return res.json({user: user.toAuthJSON()});
       } else {
           // Unprocessable Entity 422 status code
           return res.status(422).json(info);
       }
   })(req, res, next);
});

///////////////////
// current user's auth payload from their token
///////////////////
router.get('/user', auth.required, function (req, res, next) {
    // check mongodb for user
   User.findById(req.payload.id).then(function (user) {
       // if no user return unauthorized 401 status code
       if (!user) return res.status(401);

       console.log('check out', user);
       return res.json({user: user.toAuthJSON()});
   }).catch(next);
});

///////////////////
// update user info
///////////////////
router.put('/user', auth.required, function (req, res, next) {
    // check mongodb for user
   User.findById(req.payload.id).then(function (user) {
       // if no user return unauthorized 401 status code
      if (!user) return res.sendStatus(401);

      // only update fields that were actually passed...
       if (typeof req.body.user.username !== 'undefined') {
           user.username = req.body.user.username;
       }

       if (typeof req.body.user.email !== 'undefined') {
           user.email = req.body.user.email;
       }

       if (typeof req.body.user.bio !== 'undefined') {
           user.bio = req.body.user.bio;
       }

       if (typeof req.body.user.image !== 'undefined') {
           user.image = req.body.user.image;
       }

       if (typeof req.body.user.password !== 'undefined') {
           user.password = req.body.user.password;
       }

       return user.save().then(function () {
          return res.json({user: user.toAuthJSON()});
       });
   }).catch(next);
});

module.exports = router;
