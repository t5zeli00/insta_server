var config = require('../config');
var jwt    = require('jsonwebtoken');

module.exports = function (req, res, next) {
    
    var token = req.headers['x-access-token'];

    if (token) {

        // verifies secret and checks exp
        jwt.verify( token, config.secret, function (err, decoded) {      
            if (err) {
                return res.send(403, { success: false, message: 'You are not authorized to access this application' });    
            } else {
                // if everything is good, save to request for use in other routes
                req.reqUser = decoded;
                next();
            }
        });

    } else {
        // if there is no token
        // return an error
        return res.send(403, { success: false, message: 'No token provided.' });
    }
};