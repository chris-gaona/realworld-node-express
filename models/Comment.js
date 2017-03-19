var mongoose = require('mongoose');

// define the mongoose schema
var CommentSchema = new mongoose.Schema({
    body: String,
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    article: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article'
    }
}, { timestamps: true });

// method to populate author
CommentSchema.methods.toJSONFor = function (user) {
  return {
      id: this._id,
      body: this.body,
      createdAt: this.createdAt,
      author: this.author.toProfileJSONFor(user)
  }
};

mongoose.model('Comment', CommentSchema);