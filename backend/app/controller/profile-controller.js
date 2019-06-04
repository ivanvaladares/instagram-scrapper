const logger = require("../logger.js");
const eventBus = require("../eventBus");
const profileModel = require("../models/profile-model");
const profileHistoryModel = require("../models/profile-history-model.js");
const postModel = require("../models/post-model");
const postHistoryModel = require("../models/post-history-model");

exports.list = () => {

    return new Promise((resolve, reject) => {

        profileModel.find({}, { fullName: 1, username: 1 }, 0).then(profiles => {
            resolve(profiles);
        }).catch(err => {
            logger.error("Error on list profiles", err);
            reject({ code: 500, "message": err.message });
        });

    });
};

exports.save = (entry) => {

    return new Promise((resolve, reject) => {

        if (entry === undefined || entry.username === undefined) {
            return reject({ code: 400, "message": "Username is a required field!" });
        }

        if (process.env.ISCRAPPER_READONLY !== undefined && process.env.ISCRAPPER_READONLY.toLowerCase() === "true") {
            return reject({ code: 401, "message": "This function is currently disabled on this server." });
        }

        let reg = /^([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)$/g;

        if (!reg.test(entry.username)) {
            return reject({ code: 400, "message": "Usernames can only use letters, numbers, underscores and periods!" });
        }

        profileModel.get(entry.username).then(profile_exists => {

            if (profile_exists.length > 0) {
                throw new Error("Profile already exists!");
            }

            let profile = {
                fullName: "",
                username: entry.username,
                followCount: 0,
                followedByCount: 0,
                postsScrapped: 0,
                likeCount: 0,
                commentCount: 0,
                mediaCount: 0,
                isPrivate: false,
                lastScrapDate: null,
                scrapping: false,
                notFound: false,
                scanned: false
            };

            return profileModel.save(profile).then(savedProfile => {
                eventBus.emit("newMessage", JSON.stringify({ message: "new profile" }));
                resolve(savedProfile);
            });

        }).catch(err => {
            logger.error("Error on save profile", err);
            reject({ code: 500, "message": err.message });
        });

    });
};

exports.remove = (username) => {

    return new Promise((resolve, reject) => {

        if (process.env.ISCRAPPER_READONLY !== undefined && process.env.ISCRAPPER_READONLY.toLowerCase() === "true") {
            return reject({ code: 401, "message": "This function is currently disabled on this server." });
        }

        profileModel.get(username).then(profile_exists => {

            if (profile_exists.length <= 0) {
                return reject({ code: 404, "message": "Profile not found!" });
            }

            if (profile_exists[0].isFixed) {
                return reject({ code: 401, "message": "This profile is fixed!" });
            }

            return profileModel.remove({ username: username }).then(async numRemoved => {

                if (numRemoved === null || numRemoved === 0) {
                    return reject({ code: 404, "message": "Profile not found!" });
                }

                await profileHistoryModel.remove({ username: username }).then(() => {
                    return true;
                });

                let postsPathArray = await postModel.find({ username: username }, {}, 0).then(posts => {
                    return posts.map(post => {
                        return post.path;
                    });
                }).catch(() => {
                    return [];
                });

                await postModel.remove({ path: { $in: postsPathArray } }).then(() => {
                    return true;
                });

                await postHistoryModel.remove({ path: { $in: postsPathArray } }).then(() => {
                    eventBus.emit("newMessage", JSON.stringify({ message: "removed profile" }));
                    resolve("OK");
                });

            });

        }).catch(err => {
            logger.error("Error on remove Profile", err);
            reject({ code: 500, "message": "Please try again!" });
        });

    });
};

exports.getChart = (username) => {

    return new Promise((resolve, reject) => {

        profileHistoryModel.find({ username }, { date: 1 }, 0).then(items => {

            let followArr = [];
            let followedArr = [];
            let mediasArr = [];
            let likesArr = [];
            let commentsArr = [];

            items.forEach(data => {

                let dtTicks = data.date.getTime();

                followArr.push([dtTicks, data.followCount]);
                followedArr.push([dtTicks, data.followedByCount]);
                mediasArr.push([dtTicks, data.mediaCount]);
                likesArr.push([dtTicks, data.likeCount]);
                commentsArr.push([dtTicks, data.commentCount]);

            });

            resolve({ followArr, followedArr, mediasArr, likesArr, commentsArr });

        }).catch(err => {
            logger.error("Error on getChart", err);
            reject({ code: 500, "message": err.message });
        });

    });
};


exports.exportProfile = (res, username, skip, limit) => {

    return new Promise((resolve, reject) => {

        if (!username) {
            return reject({ code: 400, "message": "Username is a required field!" });
        }

        let criteria = [
            {
                "$match":
                {
                    "username": username
                }
            },
            {
                "$lookup": {
                    "from": "is-profile-history",
                    "localField": "username",
                    "foreignField": "username",
                    "as": "profileHistory"
                }
            },
            {
                "$project":
                {
                    "_id": 0,
                    "fullName": 1,
                    "username": 1,
                    "mediaCount": 1,
                    "isPrivate": 1,
                    "notFound": 1,
                    "profileHistory.followCount": 1,
                    "profileHistory.followedByCount": 1,
                    "profileHistory.mediaCount": 1,
                    "profileHistory.likeCount": 1,
                    "profileHistory.commentCount": 1,
                    "profileHistory.date": 1
                }
            }
        ];

        return profileModel.aggregateToStream(criteria, skip, limit).then(cursor => {

            let hasError = false;
            let hasResults = false;

            res.setHeader('Content-type', 'text/json');

            cursor.on('error', err => {
                hasError = true;
                reject({ code: 500, "message": err.message });
            });

            cursor.on('data', doc => {
                hasResults = true;
                res.write(JSON.stringify(doc));
                res.flush();
            });

            cursor.once('end', () => {
                if (!hasError) {

                    if (hasResults) {
                        resolve();
                        res.end();
                    }else{
                        reject({ code: 404, "message": "Profile not found" });
                    }
                }
            });

        }).catch(err => {
            logger.error("Error on export profiles", err);
            reject({ code: 500, "message": err.message });
        });

    });

};