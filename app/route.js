module.exports = function(server, db) {
    // route
    require('./controller/UserController')(server, db);
    require('./controller/PostController')(server, db);
    require('./controller/CommentController')(server, db);
};