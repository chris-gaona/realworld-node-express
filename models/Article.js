var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var slug = require('slug');
var User = mongoose.model('User');

// define the article schema with validation
var ArticleSchema = new mongoose.Schema({
    slug: {
        type: String,
        lowercase: true,
        unique: true
    },
    title: String,
    description: String,
    body: String,
    favoritesCount: {
        type: Number,
        default: 0
    },
    tagList: [{ type: String }],
    // reference to user id who wrote the article
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // reference to user id's who wrote comments on the article
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }]
}, { timestamps: true });

// plugin to validate the slug
ArticleSchema.plugin(uniqueValidator, { message: 'is already taken' });

// method used to create the unqiue url slug
ArticleSchema.methods.slugify = function () {
    // // 36 possible characters in a string 6 characters long puts the odds of a title collision at 1 in over 2.17 billion (36^6), and that's assuming that the article title is exactly the same as an existing article
    // // Math.pow() function returns the base to the exponent power, that is, base exponent
    // // Math.pow(base, exponent)
    // // Math.random() function returns a floating-point, pseudo-random number in the range [0, 1) that is, from 0 (inclusive) up to but not including 1 (exclusive)
    // // numObj.toString([radix])
    // // For radixes above 10, the letters of the alphabet indicate numerals greater than 9
    // this.slug = slug(this.title) + '-' + (Math.random() * Math.pow(36, 6) | 0).toString(36);
    this.slug = slug(this.title);
};

// mongoose middleware pre mongoose validation to create the slug
ArticleSchema.pre('validate', function (next) {
   this.slugify();

   // pass next in order the the validation to continue
   next();
});

// method to return article in json ready format or as object
ArticleSchema.methods.toJSONFor = function (user) {
    return {
        slug: this.slug,
        title: this.title,
        description: this.description,
        body: this.body,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        tagList: this.tagList,
        // indicates whether or not current user viewing the article has favorited it
        // if user, check if article is favorite, else return false
        favorited: user ? user.isFavorite(this._id) : false,
        favoritesCount: this.favoritesCount,
        // we can call the toProfileJSONFor() function because it's on the User model
        author: this.author.toProfileJSONFor(user)
    };
};

// method to keep the count of how many users have favorited an article
ArticleSchema.methods.updateFavoriteCount = function () {
    // assign this to article variable so when it's called below, this is the correct scope
    var article = this;
  // utilize mongooses count method
    // count article id's in favorites array
  return User.count({favorites: {$in: [article._id]}}).then(function (count) {
      // assign count to favoritesCount
     article.favoritesCount = count;

     return article.save();
  });
};

mongoose.model('Article', ArticleSchema);
