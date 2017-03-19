var router = require('express').Router();
var passport = require('passport');
var mongoose = require('mongoose');
var Article = mongoose.model('Article');
var Comment = mongoose.model('Comment');
var User = mongoose.model('User');
var auth = require('../auth');

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

///////////////////
// list all articles
///////////////////
router.get('/', auth.optional, function (req, res, next) {
    // define variables / default query values
   var query = {};
   var limit = 20;
   var offset = 0;

   // if limit query is not undefined
   if (typeof req.query.limit !== 'undefined') {
       // override default
       limit = req.query.limit;
   }

   // if offset query is not undefined
   if (typeof req.query.offset !== 'undefined') {
       // override default
       offset = req.query.offset;
   }

   // filter articles by tags passed in
    if (typeof req.query.tag !== 'undefined') {
       query.tagList = {"$in": [req.query.tag]};
    }

    // Promise.all() method takes an array of promises, which will then try to resolve the array of promises, and then pass an array of resolved values to the attached .then handler
    // filter articles by author and favoriter
    Promise.all([
        // PROMISE #1
        // if req.query.author exists, find the username, else return null
        req.query.author ? User.findOne({username: req.query.author}) : null,
        // PROMISE #2
        // if req.query.favorited exists, find the username, else return null
        req.query.favorited ? User.findOne({username: req.query.favorited}) : null
        // handle the results
    ]).then(function (results) {
        // author stores Promise #1
        var author = results[0];
        // favoriter stores Promise #2
        var favoriter = results[1];

        // if author exists
        if (author) {
            // add author for the query below
           query.author = author._id;
        }

        // if favoriter exists
        if (favoriter) {
            // add favoriter id for the query below
            // check for id in favorites array
           query._id = {$in: favoriter.favorites};
           // else if no favoriter found but query passed with favoriter
        } else if (req.query.favorited) {
            // add favoriter query with nothing
           query._id = {$in: []};
        }

       // Promise.all() method takes an array of promises, which will then try to resolve the array of promises, and then pass an array of resolved values to the attached .then handler
       return Promise.all([
           // PROMISE #1
           // query defaults to empty objects which queries all articles
           Article.find(query)
               // Number JavaScript object is a wrapper object allowing you to work with numerical values
               // limit defaults to 20 if no query added
               .limit(Number(limit))
               // Number JavaScript object is a wrapper object allowing you to work with numerical values
               // offset defaults to 0 if no query added
               .skip(Number(offset))
               .sort({ createdAt: 'desc' })
               // populate author from User model
               .populate('author')
               .exec(),
           // PROMISE #2
           // get total article count based on query passed in
           Article.count(query).exec(),
           // PROMISE #3
           // if req.payload exists, find the user, else return null
           req.payload ? User.findById(req.payload.id) : null
           // handle results in .then handler
       ]).then(function (results) {
           // articles connected to Promise #1
           var articles = results[0];
           // article count connected to Promise #2
           var articlesCount = results[1];
           // user info connected to Promise #3
           // if no user is logged in, it is null
           var user = results[2];

           // return the results to the front end
           return res.json({
               // map each article to a specific json format on Article mongoose method
               // return the new array of articles to front end
               articles: articles.map(function (article) {
                   return article.toJSONFor(user);
               }),
               articlesCount: articlesCount
           });
       });
   }).catch(next);
});

///////////////////
// articles authored by users being followed
///////////////////
router.get('/feed', auth.required, function (req, res, next) {
   var limit = 20;
   var offset = 0;

   if (typeof req.query.limit !== 'undefined') {
       limit = req.query.limt;
   }

   if (typeof req.query.offset !== 'undefined') {
       offset = req.query.offset;
   }

   User.findById(req.payload.id).then(function (user) {
       if (!user) return res.statusCode(401);

       Promise.all([
           Article.find({author: {$in: user.following}})
               .limit(Number(limit))
               .skip(Number(offset))
               .populate('author')
               .exec(),
           Article.count({author: {$in: user.following}})
       ]).then(function (results) {
          var articles = results[0];
          var articlesCount = results[1];

          return res.json({
              articles: articles.map(function (article) {
                return article.toJSONFor(user);
              }),
              articlesCount: articlesCount
          });
       }).catch(next)
   });
});

///////////////////
// creating new articles
///////////////////
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

///////////////////
// reading articles
///////////////////
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

///////////////////
// updating articles
///////////////////
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

///////////////////
// deleting articles
///////////////////
router.delete('/:article', auth.required, function (req, res, next) {
    // find the user
    User.findById(req.payload.id).then(function () {
        // if article author is the same as logged in user
        if (req.article.author._id.toString() === req.payload.id.toString()) {
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
    });
});

///////////////////
// favorite an article
///////////////////
router.post('/:article/favorite', auth.required, function (req, res, next) {
    // assign article id to variable
    var articleId = req.article._id;

    // find user in mongodb
    User.findById(req.payload.id).then(function (user) {
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

///////////////////
// unfavorite an article
///////////////////
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

///////////////
// COMMENTS ENDPOINTS
///////////////

// router param middleware to resolve /:comment parameter
// find the comment
router.param('comment', function (req, res, next, id) {
    // find the comment
    Comment.findById(id).then(function (comment) {
        // if no comment send not found 404 status code
        if (!comment) return res.sendStatus(404);

        // assign comment to request object under comment key
        req.comment = comment;

        // pass this along to the next handler
        return next();
    }).catch(next);
});

///////////////////
// create comments on article
///////////////////
router.post('/:article/comments', auth.required, function (req, res, next) {
    // find the user
    User.findById(req.payload.id).then(function (user) {
        // if no user found send unauthorized 401 status code
        if (!user) return res.sendStatus(401);

        // create the new comment with form data passed in req.body
        var comment = new Comment(req.body.comment);
        // add article id reference
        comment.article = req.article;
        // add author id reference
        comment.author = user;

        // save the comment
        return comment.save().then(function () {
            // push the comment reference id to the article
            req.article.comments.push(comment);

            // save the article
            return req.article.save().then(function (article) {
                // return the comment to the front end
               res.json({comment: comment.toJSONFor(user)});
            });
        });
    }).catch(next);
});

///////////////////
// list all comments associated with an article
///////////////////
router.get('/:article/comments', auth.optional, function (req, res, next) {
    // Promise.resolve(value)
    // value: Argument to be resolved by this Promise. Can also be a Promise or a thenable to resolve.
    // create promise that resolves with either finding the current user or null
   Promise.resolve(req.payload ? User.findById(req.payload.id) : null).then(function (user) {
       // populate the comments of article
      return req.article.populate({
          path: 'comments',
          // populate the author of each comment
          populate: {
              path: 'author'
          },
          // sort by descending order using createdAt
          options: {
              sort: {
                  createdAt: 'desc'
              }
          }
          // execute the populate
      }).execPopulate().then(function (article) {
          // for each comment map it to its own JSON object to return to client
          // will be {comments: "comment"} object for each object returned in array
          return res.json({comments: req.article.comments.map(function (comment) {
              return comment.toJSONFor(user);
          })});
      });
   }).catch(next);
});

///////////////////
// delete a comment
///////////////////
router.delete('/:article/comments/:comment', auth.required, function (req, res, next) {
    // if comment author is the same as current user
    if (req.comment.author.toString() === req.payload.id.toString()) {
        // remove the comment reference from the article
        req.article.comments.remove(req.comment._id);

        // save the article
        req.article.save()
            // find the comment and remove it
            .then(Comment.find({_id: req.comment._id}).remove().exec())
            // then send a no content 204 status code
            .then(function () {
                res.sendStatus(204);
            });
        // if comment author is NOT the same as current user
    } else {
        // send forbidden 403 status code
        res.sendStatus(403);
    }
});

module.exports = router;