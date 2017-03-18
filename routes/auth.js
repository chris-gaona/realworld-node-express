var jwt = require('express-jwt');
var secret = require('../config').secret;

// create route middleware to handle decoding JWT's
// middleware used to extract JWT token from authorization header
function getTokenFromHeader(req) {
    // if authorization header exists on request and
    // authorization header's key equals 'Token'
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Token') {
        // return the value of 'Token' key...or the token itself
        return req.headers.authorization.split(' ')[1];
    }

    return null;
}

// create auth variable to handle two different authentication cases
// optional or required
// public parts are optional
// user specific parts are required
// only difference is credentialsRequired: false key/value pair
var auth = {
    required: jwt({
        secret: secret,
        userProperty: 'payload',
        getToken: getTokenFromHeader
    }),
    optional: jwt({
        secret: secret,
        userProperty: 'payload',
        credentialsRequired: false,
        getToken: getTokenFromHeader
    })
};

// export auth object
module.exports = auth;