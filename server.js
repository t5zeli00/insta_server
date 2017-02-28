var restify = require('restify');
var mongojs = require('mongojs');
var morgan  = require('morgan');
// var db      = mongojs('instagramdb', ['users', 'posts', 'comments']);
var db      = mongojs('mongodb://instagram:1234@ds039271.mongolab.com:39271/instagram', ['users', 'posts', 'comments'], {authMechanism: 'ScramSHA1'});
var server  = restify.createServer();
var route   = require('./app/route');
var cloudinary = require('cloudinary');

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(morgan('dev')); // LOGGER

// CORS
server.use(function(req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Content-type, x-access-token');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Origin', '*');
    return next();
});

server.opts(/\.*/, function (req, res, next) {
    res.send(200);
    return next();
});

db.users.createIndex({username: 'text'});

route(server, db);

server.listen(process.env.PORT || 3000, function () {
    console.log("Server started @ ",process.env.PORT || 3000);
});

module.exports = server;