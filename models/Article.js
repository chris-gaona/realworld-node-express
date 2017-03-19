var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var slug = require('slug');

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
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

// plugin to validate the slug
ArticleSchema.plugin(uniqueValidator, { message: 'is already taken' });

// method used to create the unqiue url slug
ArticleSchema.methods.slugify = function () {
    // 36 possible characters in a string 6 characters long puts the odds of a title collision at 1 in over 2.17 billion (36^6), and that's assuming that the article title is exactly the same as an existing article
    // Math.pow() function returns the base to the exponent power, that is, base exponent
    // Math.pow(base, exponent)
    // Math.random() function returns a floating-point, pseudo-random number in the range [0, 1) that is, from 0 (inclusive) up to but not including 1 (exclusive)
    // numObj.toString([radix])
    // For radixes above 10, the letters of the alphabet indicate numerals greater than 9
    this.slug = slug(this.title) + '-' + (Math.random() * Math.pow(36, 6) | 0).toString(36);
};

// mongoose middleware pre mongoose validation to create the slug
ArticleSchema.pre('validate', function (next) {
   this.slugify();

   // pass next in order the the validation to continue
   next();
});

ArticleSchema.methods.toJSONFor = function (user) {
    return {
      slug: this.slug,
      title: this.title,
      description: this.description,
      body: this.body,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      tagList: this.tagList,
      favoritesCount: this.favoritesCount,
      // we can call the toProfileJSONFor() function because it's on the User model
      author: this.author.toProfileJSONFor(user)
    };
};

mongoose.model('Article', ArticleSchema);