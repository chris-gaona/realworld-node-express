var router = require('express').Router();
var passport = require('passport');
var mongoose = require('mongoose');
var Article = mongoose.model('Article');
var User = mongoose.model('User');
var auth = require('../auth');

// creating new articles
router.post('/', auth.required, function (req, res, next) {
    // check if user exists before we create anything
   User.findById(req.payload.id).then(function (user) {
       // if user does not exist send unauthorized 401 status code
       if (!user) return res.sendStatus(401);

       // otherwise create the article from form data in req.body
       var article = new Article(req.body.article);

       // set the author value to user
       article.author = user;

       // save the article
       return article.save().then(function () {
          console.log(article.author);
          // return the article to the front end
          return res.json({article: article.toJSONFor(user)});
       });
       // catch any errors
   }).catch(next);
});

// middleware to intercept and pre-populate article data in req.article
// looking for article parameters
router.param('article', function (req, res, next, slug) {
    // find the article in mongodb
   Article.findOne({slug: slug})
       // populate the author data from User model
       .populate('author')
       .then(function (article) {
           // if no article send not found 404 status code
           if (!article) return res.sendStatus(404);

           // populate req.article with the article
           req.article = article;

           // pass it along to next handler
           return next();
       }).catch(next);
});

// reading articles
router.get('/:article', auth.optional, function (req, res, next) {
    // Promise.all() method returns a single Promise that resolves when all of the promises in the iterable argument have resolved, or rejects with the reason of the first promise that rejects
    // Promise.all(iterable);
    // An iterable object (such as an Array) of promises
    Promise.all([
        // PROMISE #1 if req.payload exists, find user by id else null
        req.payload ? User.findById(req.payload.id) : null,
        // PROMISE #2 populate user from User model
        req.article.populate('author').execPopulate()
        // once the previous 2 items have resolved...then
    ]).then(function (results) {
       var user = results[0];

       // return the article
       return res.json({article: req.article.toJSONFor(user)});
    }).catch(next);
});

// updating articles
router.put('/:article', auth.required, function (req, res, next) {
    // find the user in mongodb
    User.findById(req.payload.id).then(function (user) {
        // if article author is the same as logged in user
        if (req.article.author._id.toString() === req.payload.id.toString()) {
            // only update fields that were actually passed...
            if (typeof req.body.article.title !== 'undefined') {
                req.article.title = req.body.article.title;
            }

            if (typeof req.body.article.description !== 'undefined') {
                req.article.description = req.body.article.description;
            }

            if (typeof req.body.article.body !== 'undefined') {
                req.article.body = req.body.article.body;
            }

            // save the article
            req.article.save().then(function (article) {
                // return the edited article to front end
                return res.json({article: article.toJSONFor(user)});
            }).catch(next);
        } else {
            // if article author is NOT same as logged in user
            // send Forbidden 403 status code
            return res.sendStatus(403);
        }
    });
});

// deleting articles
router.delete('/:article', auth.required, function (req, res, next) {
    // find the user
    User.findById(req.payload.id).then(function () {
        // if article author is the same as logged in user
        if (req.article.author.toString() === req.payload.id.toString()) {
            // remove the article from mongodb
            return req.article.remove().then(function () {
                // send no content 204 status code
                return res.sendStatus(204);
            });
        } else {
            // if article author is NOT same as logged in user
            // send forbidden 403 status code
            return res.sendStatus(403);
        }
    }).catch(next);
});

// favorite an article
router.post('/:article/favorite', auth.required, function (req, res, next) {
    // assign article id to variable
    var articleId = req.article._id;

    // find user in mongodb
    User.findById(req.body.id).then(function (user) {
        // if no user send unauthorized 401 status code
        if (!user) return res.sendStatus(401);

        // add article id to favorites array in User model
        return user.favorite(articleId).then(function () {
            // update the total favorite count for the article
           return req.article.updateFavoriteCount().then(function (article) {
               // return the article in json format
              return res.json({article: article.toJSONFor(user)});
           });
        });
        // catch any error and send them to the error handler
    }).catch(next);
});

// unfavorite an article
router.delete('/:article/favorite', auth.required, function (req, res, next) {
    // assign article id to variable
    var articleId = req.article._id;

    // find user in mongodb
    User.findById(req.payload.id).then(function (user) {
        // if no user send unauthorized 401 status code
        if (!user) return res.sendStatus(401);

        // remove article id from favorites array in User model
        return user.unfavorite(articleId).then(function () {
            // update total favorite count for the article
            return req.article.updateFavoriteCount().then(function (article) {
                // return the article in json format
                return res.json({article: article.toJSONFor(user)});
            });
        });
        // catch any error and send them to the error handler
    }).catch(next);
});

module.exports = router;