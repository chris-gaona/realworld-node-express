var router = require('express').Router();
var mongoose = require('mongoose');
var User = mongoose.model('User');
var auth = require('../auth');

// creates middleware to handle routes with :username as parameter
// prepopulates req.profile with user's data
router.param('username', function (req, res, next, username) {
    // find the specific user
   User.findOne({username: username}).then(function (user) {
       // if no user return not found 404 status code
       if (!user) return res.sendStatus(404);

       // assign user to profile on the request object
       req.profile = user;

       // pass it on to the next handler
       return next();
   }).catch(next);
});

// fetch user's profile by their username
router.get('/:username', auth.optional, function (req, res, next) {
    // check if payload exists on request object
    if (req.payload) {
        // find user in mongodb
        User.findById(req.payload.id).then(function (user) {
            // if user does not exist
            if (!user) return res.json({profile: req.profile.toProfileJSONFor(false)});

            // checking if authenticated user if one accessing user info
            return res.json({profile: req.profile.toProfileJSONFor(user)});
        });
    } else {
        return res.json({profile: req.profile.toProfileJSONFor(false)});
    }
});

// follow another user
router.post('/:username/follow', auth.required, function (req, res, next) {
    // assign profile id from params middleware above
   var profileId = req.profile._id;

   // check for user
   User.findById(req.payload.id).then(function (user) {
       // if no users send unauthorized 401 status code
      if (!user) return res.sendStatus(401);

      // follow a user
      return user.follow(profileId).then(function () {
          // return the user profile
         return res.json({profile: req.profile.toProfileJSONFor(user)});
      });
   }).catch(next);
});

// unfollow another user
router.delete('/:username/follow', auth.required, function (req, res, next) {
    // assign profile id from params middleware above
    var profileId = req.profile._id;

    // check for user
    User.findById(req.payload.id).then(function (user) {
        // if no users send unauthorized 401 status code
        if (!user) return res.sendStatus(401);

        // unfollow a user
        return user.unfollow(profileId).then(function () {
            // return the user profile
           return res.json({profile: req.profile.toProfileJSONFor(user)});
        });
    });
});

module.exports = router;