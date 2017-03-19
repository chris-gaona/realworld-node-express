var router = require('express').Router();
var mongoose = require('mongoose');
var Article = mongoose.model('Article');

///////////////////
// get the set of tags that have been used by articles
///////////////////
router.get('/', function (req, res, next) {
    // .distinct finds the distinct values for a specified field across a single collection and returns the results in an array
    // find all articles with distinct tagList or tag
    // mongoose & mongodb do all the heavy lifting for us
    // tags are listed in descending order based off of how often they're used
   Article.find().distinct('tagList').then(function (tags) {
       // and then return those tags found to front end
      return res.json({tags: tags});
   }).catch(next);
});

module.exports = router;