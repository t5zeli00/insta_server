var pwdMgr          = require('../lib/password');
var config          = require('../config');
var authentication  = require('../lib/authentication');
var jwt             = require('jsonwebtoken');
var mongojs         = require('mongojs');
var cloudinary      = require('cloudinary');
 
module.exports = function(server, db) {

    cloudinary.config(config.cloudinary);

    // readAll
    server.get('/api/post/all', function (req, res, next) {
        db.posts.find()
                .sort({ createdTime: -1 },
                function (err, dbPost) {
            res.send(200, dbPost);
        });
        return next();
    });

    // delete all
    server.del('/api/post/all', function (req, res, next) {
            db.posts.remove(function (err) {
                res.send({message: "delete"});
            });

        return next();
    });

    // readAll - user
    server.get('/api/post/user/:id', authentication, function (req, res, next) {
        db.posts.find({ user_id: req.params.id })
                .sort({ createdTime: -1 },
                function (err, dbPost) {

            var sendPosts = [];

            if (err) throw err;

            if (!dbPost || dbPost.length == 0) {
                res.send(200, sendPosts);
                return next();
            }

            var countTask = dbPost.length;

            function onComplete() {
                countTask--;

                if (countTask <= 0) {
                    res.send(200, sendPosts);
                    callback();
                };
            }

            for (var i = 0; i < dbPost.length; i++) {
                (function(j) {
                    var post = {
                        id: dbPost[j]._id,
                        userid: dbPost[j].user_id,
                        image: dbPost[j].image,
                        caption: dbPost[j].caption,
                        likes: dbPost[j].likes
                    };

                    sendPosts.push(post);
                    onComplete();
                }(i));
            }
        });
        return next();
    });

    // readAll - reqUser
    server.get('/api/post', authentication, function (req, res, next) {
        db.posts.find({ user_id: req.reqUser._id })
                .sort({ createdTime: -1 },
                function (err, dbPost) {
            var sendPosts = [];

            if (err) throw err;

            if (!dbPost || dbPost.length == 0) {
                res.send(200, sendPosts);
                return next();
            }

            var countTask = dbPost.length;

            function onComplete() {
                countTask--;

                if (countTask <= 0) {
                    res.send(200, sendPosts);
                    callback();
                };
            }

            for (var i = 0; i < dbPost.length; i++) {
                (function(j) {
                    var post = {
                        id: dbPost[j]._id,
                        userid: dbPost[j].user_id,
                        image: dbPost[j].image,
                        caption: dbPost[j].caption,
                        likes: dbPost[j].likes
                    };

                    sendPosts.push(post);
                    onComplete();
                }(i));
            }
        });
        return next();
    });

    // read Newfeeds
    server.get('/api/post/newfeeds', authentication, function (req, res, next) {
        var userfeeds = [];

        db.users.findOne({ _id: mongojs.ObjectId(req.reqUser._id) }, function (err, dbUser) {
            if (err) throw err;

            if (!dbUser) {
                res.send(404, { message: "User not found!" });
                return next();
            }

            userfeeds = dbUser.followings;
            userfeeds.push(req.reqUser._id);

            db.posts.find({ user_id: {$in: userfeeds} })
                    .sort({ createdTime: -1 },
                    function (err, dbPost) {

                var sendPost = [];
                if (err) throw err;

                if (!dbPost || dbPost.length == 0) {
                    res.send(200, sendPost);
                    return next();
                }

                var countTask = dbPost.length;
                function onComplete() {
                    countTask--;

                    if (countTask <= 0) {
                        res.send(200, sendPost);
                        return next();
                    };
                }

                for (var i = 0; i < dbPost.length; i++) {
                    (function(j) {

                        var post = {};

                        post.id = dbPost[j]._id;
                        post.userid = dbPost[j].user_id;
                        post.image = dbPost[j].image;
                        post.caption = dbPost[j].caption;
                        post.likes = dbPost[j].likes;
                        post.createdTime = dbPost[j].createdTime;

                        sendPost.push(post);                     

                        onComplete();
                    }(i));
                }
            });
        });
        return next();
    });

    // create
    server.post('/api/post', authentication, function (req, res, next) {
        var newPost = req.params;

        if (!req.files || !req.files.image) {
            res.send(403, { message: 'Upload image failed!' });
            return next();
        }

        if (!newPost.caption) {
            newPost.caption = "";
        }

        newPost.user_id = req.reqUser._id;
        newPost.likes   = [];
        newPost.createdTime = Date.now();

        cloudinary.uploader.upload(req.files.image.path, function (dbFile) {
            newPost.image = dbFile.url;

            db.posts.insert(newPost, function (err, dbPost) {
                if (err) throw err;
                res.send(200, { message: 'New file uploaded!', post: dbPost });
            })
            return next();
        });
    });

    // read post
    server.get('/api/post/:id', authentication, function (req, res, next) {
        db.posts.findOne({ _id: mongojs.ObjectId(req.params.id) }, function (err, dbPost) {
            if (err) throw err;

            if (!dbPost) { // user doesnt exist
                res.send(404, {success: false, message: 'Image not found.'});
                return next();
            }

            res.send(200, dbPost);
        });

        return next();
    });

    // update post
    server.put('/api/post/:id', authentication, function (req, res, next) {
        var editPost = req.params;

        db.posts.findOne({ _id: mongojs.ObjectId(req.params.id) }, function (err, dbPost) {
            if (err) throw err;

            if (!dbPost) { // user doesnt exist
                res.send(404, {success: false, message: 'Image not found.'});
                return next();
            }

            var savePost = dbPost;

            if (!!editPost.caption) {
                savePost.caption = editPost.caption; 
            };

            db.posts.update({ _id: mongojs.ObjectId(req.params.id) }, savePost, function (err, dbPost2) {
                if (err) throw err;
                res.send(200, { success: true, message: 'Post updated!' });
            });
        });
        return next();
    });

    // delete post
    server.del('/api/post/:id', authentication, function (req, res, next) {
        db.posts.findOne({ _id: mongojs.ObjectId(req.params.id) }, function (err, dbPost) {
            if (err) throw err;

            if (!dbPost) { // user doesnt exist
                res.send(404, {success: false, message: 'Image not found.'});
                return next();
            }

            db.posts.remove({ _id: mongojs.ObjectId(req.params.id) }, function (err) {
                if (err) throw err;
                res.send(200, { success: true, message: 'Post deleted!' });
            });
        });
        return next();
    });

    //like post
    server.post('/api/like/post/:id', authentication, function (req, res, next) {
        db.posts.findOne({ _id: mongojs.ObjectId(req.params.id) }, function (err, dbPost) {
            if (err) throw err;

            if (!dbPost) {
                res.send(404, { message: "Image not found!" });
                return next();
            }

            var savePost = dbPost;
            savePost.likes.push(req.reqUser._id);

            db.posts.update({ _id: mongojs.ObjectId(req.params.id) }, savePost, function (err) {
                if (err) throw err;
                res.send(200, { success: true, message: 'Like post successfully!' });
            });
        });
        return next();
    });

    // Unlike
    server.put('/api/like/post/:id', authentication, function (req, res, next) {
        db.posts.findOne({ _id: mongojs.ObjectId(req.params.id) }, function (err, dbPost) {
            if (err) throw err;

            if (!dbPost) {
                res.send(404, { message: "Image not found!" });
                return next();
            }

            var savePost = dbPost;
            savePost.likes.splice(savePost.likes.indexOf(req.reqUser._id), 1);

            db.posts.update({ _id: mongojs.ObjectId(req.params.id) }, savePost, function (err) {
                if (err) throw err;
                res.send(200, { success: true, message: 'Unlike post successfully!' });
            });
        });
        return next();
    });

};