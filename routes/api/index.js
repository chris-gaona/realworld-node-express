var router = require('express').Router();

// registers the users router with the api router
router.use('/', require('./users'));

// registers the profile router with the api router
router.use('/profiles', require('./profiles'));

// creates middleware to handle mongoose validation errors
// middleware defined with 4 arguments like below it is treated as an error handler
router.use(function (err, req, res, next) {
    // if mongoose has any validation errors
   if (err.name === 'ValidationError') {
       // Unprocessable Entity 422 status code
       return res.status(422).json({
           // Object.keys() method returns an array of a given object's own keys
           // reduce() method applies a function against an accumulator and each
           // element in the array (from left to right) to reduce it to a single value
           // errors is array of error keys from Object.keys
           // key is current element being processed in the array
           // initial value is {} empty object
           // following code flattens errors array & returns only the error messages
           errors: Object.keys(err.errors).reduce(function (errors, key) {
                errors[key] = err.errors[key].message;

                return errors;
           }, {})
       });
   }

   return next(err);
});

module.exports = router;
