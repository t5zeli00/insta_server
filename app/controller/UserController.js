var pwdMgr          = require('../lib/password');
var config          = require('../config');
var authentication  = require('../lib/authentication');
var jwt             = require('jsonwebtoken');
var mongojs         = require('mongojs');
var cloudinary      = require('cloudinary');
 
module.exports = function(server, db) {
    cloudinary.config(config.cloudinary);

    // readAll
    server.get('/api/user/all', function (req, res, next) {
        db.users.find(function (err, dbUser) {
            res.send(200, dbUser);
        });
        return next();
    });

    // log in
    server.post('/api/user/auth', function (req, res, next) {
        var user = req.params;

        if (user.email.length === 0 || user.password.length === 0) {
            res.send(403, { message: 'Username or password hasn\'t been input.' });
            return next();
        }

        db.users.findOne({ email: user.email }, function (err, dbUser) {
            if (err) throw err;

            if (!dbUser) {
                res.send(403, { message: 'Authentication failed. User not found.' });
                return next();
            }

            pwdMgr.comparePassword(user.password, dbUser.password, function (err, isPasswordMatch) {
 
                if (isPasswordMatch) {                    
                    var token = jwt.sign(dbUser, config.secret, {
                        expiresInMinutes: 1440 // expires in 24 hours
                    });

                    var sendUser = {
                        userid: dbUser._id,
                        username: dbUser.username,
                        email: dbUser.email,
                        avatar: dbUser.avatar,
                        countFollowers: dbUser.followers.length,
                        countFollowings: dbUser.followings.length,
                        followings: dbUser.followings,
                        followers: dbUser.followers
                    };

                    db.posts.find({ user_id: mongojs.ObjectId(dbUser._id).toString() }, function (err, result) {
                        sendUser.countPosts = result.length;
                        res.send(200, {success: true, token: token, message: 'Login successfully!', user: sendUser});
                    });

                } else {
                    res.send(300, { message: "Authentication failed. Wrong password." });
                }
 
            });
        });
        return next();
    });

    // check Authenticate
    server.get('/api/user/auth', authentication, function (req, res, next) {

        db.users.findOne({ _id: mongojs.ObjectId(req.reqUser._id) }, function (err, dbUser) {
            if (err) throw err;

            if (!dbUser) { // user doesnt exist
                res.send(404, {success: false, message: 'User not found.'});
                return next();
            }

            var sendUser = {
                userid: dbUser._id,
                username: dbUser.username,
                email: dbUser.email,
                avatar: dbUser.avatar,
                countFollowers: dbUser.followers.length,
                countFollowings: dbUser.followings.length,
                followings: dbUser.followings,
                followers: dbUser.followers
            };

            db.posts.find({ user_id: req.reqUser._id }, function (err, result) {
                sendUser.countPosts = result.length;
                res.send(200, {success: true, message: 'Authenticate successfully!', user: sendUser});
            });

        });

        return next();
    });

 
    // create
    server.post('/api/user/', function (req, res, next) {
        var user = req.params;

        if (user.email.length === 0 || user.password.length === 0) {
            res.send(403, { message: 'Username or password hasn\'t been input.' });
            return next();
        }

        db.users.findOne({email: user.email}, function (err, dbUser) {
            if (err) throw err;

            if (!!dbUser) {
                res.send(400, { message: 'A user with this email already exists' });
                return next();
            }

            pwdMgr.cryptPassword(user.password, function (err, hash) {
                user.password = hash;

                // set default value
                user.username = "Instagram User";
                user.avatar = "http://res.cloudinary.com/hoakusa/image/upload/v1444861152/default_avatar_nwif1n.png";
                user.followers = [];
                user.followings = [];

                db.users.insert(user, function (err, dbUser2) {
                    if (err) { // duplicate key error
                        if (err.code == 11000) /* http://www.mongodb.org/about/contributors/error-codes/*/ {
                            res.send(400, { error: err, message: "A user with this email already exists" });
                        }
                    } else {
                        res.send(200, { message: 'Registered successfully!' });
                    }
                });
            });
        });        
        return next();
    });

    //read other profile
    server.get('/api/user/:id', authentication, function (req, res, next) {
        db.users.findOne({ _id: mongojs.ObjectId(req.params.id) }, function (err, dbUser) {
            if (err) throw err;

            if (!dbUser) { // user doesnt exist
                res.send(404, {success: false, message: 'User not found.'});
                return next();
            }

            var sendUser = {};
            sendUser.userid             = dbUser._id;
            sendUser.username           = dbUser.username;
            sendUser.avatar             = dbUser.avatar;
            sendUser.countFollowers     = dbUser.followers.length;
            sendUser.countFollowings    = dbUser.followings.length;
            sendUser.followers          = dbUser.followers;

            db.posts.find({ user_id: req.params.id }, function (err, result) {
                sendUser.countPosts = result.length;
                res.send(200, sendUser);
            });

        });

        return next();
    });

    // read profile
    server.get('/api/user', authentication, function (req, res, next) {
        db.users.findOne({ _id: mongojs.ObjectId(req.reqUser._id) }, function (err, dbUser) {
            if (err) throw err;

            if (!dbUser) { // user doesnt exist
                res.send(404, {success: false, message: 'User not found.'});
                return next();
            }

            res.send(200, dbUser);
        });

        return next();
    });

    // update profile
    server.put('/api/user', authentication, function (req, res, next) {
        var editUser = req.params;

        db.users.findOne({ _id: mongojs.ObjectId(req.reqUser._id) }, function (err, dbUser) {
            if (err) throw err;

            if (!dbUser) { // user doesnt exist
                res.send(404, {success: false, message: 'User not found.'});
                return next();
            }

            var saveUser = dbUser;



            // if (!!req.files &&!!req.files.image) {
            //     cloudinary.uploader.upload(req.files.image.path, function (dbFile) {
            //         saveUser.avatar = dbFile.url;
            //     });
            // }
            var save = function() {
                db.users.update({ _id: mongojs.ObjectId(req.reqUser._id) }, saveUser, function (err, update) {

                    if (err) throw err;
                    db.users.findOne({ _id: mongojs.ObjectId(req.reqUser._id) }, function (err, dbUser2) {
                        var sendUser = {
                            userid: req.reqUser._id,
                            username: dbUser2.username,
                            email: dbUser2.email,
                            avatar: dbUser2.avatar,
                            countFollowers: dbUser2.followers.length,
                            countFollowings: dbUser2.followings.length,
                            followings: dbUser2.followings,
                            followers: dbUser2.followers
                        };
                        db.posts.find({ user_id: req.reqUser._id }, function (err, result) {
                            sendUser.countPosts = result.length;
                            res.send(200, { message: 'Your changed has been saved!', user: sendUser });
                        });
                    })
                    
                });
            }

            if (!!editUser.username && editUser.username !== dbUser.username) {
                saveUser.username = editUser.username;
                save();
            }

            if (!!editUser.newPassword && editUser.newPassword !== "") {
                pwdMgr.comparePassword(editUser.oldPassword, dbUser.password, function (err, isPasswordMatch) {

                    if (isPasswordMatch) {
                        pwdMgr.cryptPassword(editUser.newPassword, function (err, hash) {
                            saveUser.password = hash;
                            save();
                        });                
                    } else {
                        res.send(403, { message: "Authentication failed. Wrong password." });
                        return next();
                    }
     
                });
            }
            
        });

        return next();
    });

    // see followers list
    server.get('/api/followers', authentication, function (req, res, next) {
        db.users.findOne({ _id: mongojs.ObjectId(req.reqUser._id) }, function (err, dbUser) {
            if (err) throw err;

            var sendFollow = [];
            var countTask = dbUser.followers.length;
            function onComplete() {
                countTask--;

                if (countTask <= 0) {
                    res.send(200, sendFollow);
                    callback();
                };
            }

            for (var i = 0; i < dbUser.followers.length; i++) {
                (function(j) {
                    db.users.findOne({ _id: mongojs.ObjectId(dbUser.followers[j]) }, function (err, dbUser2) {
                        var user = {
                            userid: dbUser2._id,
                            username: dbUser2.username,
                            avatar: dbUser2.avatar,
                            followers: dbUser2.followers,
                        };
                        sendFollow.push(user);
                        onComplete();
                    });
                }(i));
            }

        });
        return next();
    });

    // see followings list
    server.get('/api/followings', authentication, function (req, res, next) {
        db.users.findOne({ _id: mongojs.ObjectId(req.reqUser._id) }, function (err, dbUser) {
            if (err) throw err;

            var sendFollow = [];
            var countTask = dbUser.followings.length;
            function onComplete() {
                countTask--;

                if (countTask <= 0) {
                    res.send(200, sendFollow);
                    callback();
                };
            }

            for (var i = 0; i < dbUser.followings.length; i++) {
                (function(j) {
                    db.users.findOne({ _id: mongojs.ObjectId(dbUser.followings[j]) }, function (err, dbUser2) {
                        var user = {
                            userid: dbUser2._id,
                            username: dbUser2.username,
                            avatar: dbUser2.avatar,
                            followers: dbUser2.followers
                        };
                        sendFollow.push(user);
                        onComplete();
                    });
                }(i));
            }
        });
        return next();
    });

    // see followers list - other
    server.get('/api/followers/user/:id', authentication, function (req, res, next) {
        db.users.findOne({ _id: mongojs.ObjectId(req.params.id) }, function (err, dbUser) {
            if (err) throw err;

            if (!dbUser) {
                res.send(404, { message: "User not found!" });
                return next();
            }

            var sendFollow = [];
            var countTask = dbUser.followers.length;
            function onComplete() {
                countTask--;

                if (countTask <= 0) {
                    res.send(200, sendFollow);
                    callback();
                };
            }

            for (var i = 0; i < dbUser.followers.length; i++) {
                (function(j) {
                    db.users.findOne({ _id: mongojs.ObjectId(dbUser.followers[j]) }, function (err, dbUser2) {
                        var user = {
                            userid: dbUser2._id,
                            username: dbUser2.username,
                            avatar: dbUser2.avatar,
                            followers: dbUser2.followers,
                        };
                        sendFollow.push(user);
                        onComplete();
                    });
                }(i));
            }
        });
        return next();
    });

    // see followees list - other
    server.get('/api/followings/user/:id', authentication, function (req, res, next) {
        db.users.findOne({ _id: mongojs.ObjectId(req.params.id) }, function (err, dbUser) {
            if (err) throw err;

            if (!dbUser) {
                res.send(404, { message: "User not found!" });
                return next();
            }

            var sendFollow = [];
            var countTask = dbUser.followings.length;
            function onComplete() {
                countTask--;

                if (countTask <= 0) {
                    res.send(200, sendFollow);
                    callback();
                };
            }

            for (var i = 0; i < dbUser.followings.length; i++) {
                (function(j) {
                    db.users.findOne({ _id: mongojs.ObjectId(dbUser.followings[j]) }, function (err, dbUser2) {
                        var user = {
                            userid: dbUser2._id,
                            username: dbUser2.username,
                            avatar: dbUser2.avatar,
                            followers: dbUser2.followers
                        };
                        sendFollow.push(user);
                        onComplete();
                    });
                }(i));
            }
        });
        return next();
    });

    // Check follow
    server.post('/api/follow/user/:id', authentication, function (req, res, next) {
        db.users.findOne({ _id: mongojs.ObjectId(req.params.id) }, function (err, dbUser) {
            if (err) throw err;

            if (!dbUser) {
                res.send(404, { message: "User not found!" });
                return next();
            }

            var saveUser = dbUser;
            saveUser.followers.push(req.reqUser._id);
            db.users.update({ _id: mongojs.ObjectId(req.params.id) }, saveUser, function (err) {
                if (err) throw err;
            });
        });

        db.users.findOne({ _id: mongojs.ObjectId(req.reqUser._id) }, function (err, dbUser) {
            if (err) throw err;

            if (!dbUser) {
                res.send(404, { message: "User not found!" });
                return next();
            }

            var saveUser = dbUser;
            saveUser.followings.push(req.params.id);            
            db.users.update({ _id: mongojs.ObjectId(req.reqUser._id) }, saveUser, function (err) {
                if (err) throw err;
                res.send(200, { success: true, message: 'Add followings successfully!' });
            });
        });
        return next();
    });

    // UnCheck follow
    server.put('/api/follow/user/:id', authentication, function (req, res, next) {
        db.users.findOne({ _id: mongojs.ObjectId(req.params.id) }, function (err, dbUser) {
            if (err) throw err;

            if (!dbUser) {
                res.send(404, { message: "User not found!" });
                return next();
            }

            var saveUser = dbUser;
            saveUser.followers.splice(saveUser.followers.indexOf(req.reqUser._id), 1);
            db.users.update({ _id: mongojs.ObjectId(req.params.id) }, saveUser, function (err) {
                if (err) throw err;
            });
        });

        db.users.findOne({ _id: mongojs.ObjectId(req.reqUser._id) }, function (err, dbUser) {
            if (err) throw err;

            if (!dbUser) {
                res.send(404, { message: "User not found!" });
                return next();
            }

            var saveUser = dbUser;
            saveUser.followings.splice(saveUser.followings.indexOf(req.params.id), 1);
            db.users.update({ _id: mongojs.ObjectId(req.reqUser._id) }, saveUser, function (err) {
                if (err) throw err;
                res.send(200, { success: true, message: 'Remove followings successfully!' });
            });
        });
        return next();
    });

    // Search
    server.post('/api/search/user', authentication, function (req, res, next) {
        db.users.find( {$text: {$search: req.params.textSearch}}, function (err, result) {
            if (err) throw err;

            if (!result || result.length === 0) { // user doesnt exist
                res.send({status: 205, message: 'User not found!'});
                return next();
            }

            var sendUser = [];
            var countTask = result.length;

            function onComplete() {
                countTask--;

                if (countTask <= 0) {
                    res.send(200, sendUser);
                    callback();
                };
            }

            for (var i = 0; i < result.length; i++) {
                (function(j) {
                    db.users.findOne({ _id: mongojs.ObjectId(result[j]._id) }, function (err, dbUser) {
                        var user = {
                            userid: dbUser._id,
                            username: dbUser.username,
                            avatar: dbUser.avatar,
                            followers: dbUser.followers
                        };
                        sendUser.push(user);
                        onComplete();
                    });
                }(i));
            }
        });
        return next();
    });

    // delete post
    server.del('/api/user/all', function (req, res, next) {

            db.users.remove(function (err) {
                console.log("delete all user");
                res.send({message: "delete"});
            });

        return next();
    });
};