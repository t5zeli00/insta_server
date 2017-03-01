module.exports = function(server, db) {
    // route
    require('./controller/User')(server, db);
    require('./controller/Post')(server, db);
    require('./controller/Comment')(server, db);
};