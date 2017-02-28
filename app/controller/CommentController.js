var pwdMgr          = require('../lib/password');
var config          = require('../config');
var authentication  = require('../lib/authentication');
var jwt             = require('jsonwebtoken');
var mongojs         = require('mongojs');
 
module.exports = function(server, db) {

    // readAll
    server.get('/api/comment/all', function (req, res, next) {
        db.comments.find()
                   .sort({ createdTime: 1 },
                    function (err, dbComment) {
            res.send(200, dbComment);
        });
        return next();
    });

    // delete all
    server.del('/api/comment/all', function (req, res, next) {
            console.log('got request');
            db.comments.remove(function (err) {
                console.log("delete all post");
                res.send({message: "delete"});
            });

        return next();
    });

    // readAll - post
    server.get('/api/comment/post/:id', authentication, function (req, res, next) {
        db.comments.find({ post_id: req.params.id })
                   .sort({ createdTime: 1 },
                    function (err, dbComment) {
            var sendComments = [];
            if (err) throw err;

            if (!dbComment || dbComment.length == 0) {
                console.log("no comment to show");
                res.send(200, sendComments);
                return next();
            }
            
            res.send(200, dbComment);

        });
        return next();
    });

    // create
    server.post('/api/comment/post/:id', authentication, function (req, res, next) {
        console.log(req.reqUser.username);
        var newComment = {};
        newComment.user_id = req.reqUser._id;
        newComment.post_id = req.params.id;
        newComment.text    = req.params.text;
        newComment.createdTime = Date.now();

        db.users.findOne({ _id: mongojs.ObjectId(req.reqUser._id) }, function (err, dbUser) {
            if (err) throw err;

            if (!dbUser) {
                res.send(404, { message: "User not found!" });
                return next();
            }

            newComment.username = dbUser.username;
            db.comments.insert(newComment, function (err, dbComment) {
                if (err) throw err;
                res.send(200, { message: 'Commented successfully!', comment: dbComment});
            })
        })
        
        return next();
    });

    
};