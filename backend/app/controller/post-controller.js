const moment = require("moment");
const logger = require("../logger.js");
const postModel = require("../models/post-model");
const postHistoryModel = require("../models/post-history-model");

const projectPost = post => {
    return {
        path: post.path,
        published: moment(new Date()).diff(moment(post.uploadDate), 'days'),
        likeCount: post.likeCount,
        likePercentage: post.likePercentage,
        commentCount: post.commentCount,
        commentPercentage: post.commentPercentage
    };
};

const removeDuplicated = (arr, key) => {
    const map = new Map();
    arr.map(el => {
        if (el !== undefined && !map.has(el[key])) {
            map.set(el[key], el);
        }
    });
    return [...map.values()];
};

exports.getStats = (username, limit) => {

    if (!limit || isNaN(limit)) {
        limit = 10;
    }

    limit = parseInt(limit, 10);

    return new Promise(async (resolve, reject) => {

        try {

            let arrTopLikesPercentage = await postModel.find({ username }, { likePercentage: -1 }, limit).then(posts => {
                return posts.map(post => {
                    if (post.likePercentage >= 0.1 || post.commentPercentage >= 0.1) {
                        return projectPost(post);
                    }
                });
            });

            let arrTopCommentsPercentage = await postModel.find({ username }, { commentPercentage: -1 }, limit).then(posts => {
                return posts.map(post => {
                    if (post.likePercentage >= 0.1 || post.commentPercentage >= 0.1) {
                        return projectPost(post);
                    }
                });
            });

            let arrTopLikesCount = await postModel.find({ username }, { likeCount: -1 }, limit).then(posts => {
                return posts.map(post => {
                    return projectPost(post);
                });
            });

            let arrTopCommentsCount = await postModel.find({ username }, { commentCount: -1 }, limit).then(posts => {
                return posts.map(post => {
                    return projectPost(post);
                });
            });


            let joinedArrays = arrTopCommentsPercentage.concat(arrTopLikesPercentage);
            let arrTopInteraction = removeDuplicated(joinedArrays, "path");

            let responseObj = {
                topInteraction: arrTopInteraction.sort(
                    (a, b) => {
                        return a.likePercentage > b.likePercentage || a.commentPercentage > b.commentPercentage ? -1 : 1;
                    }
                ).splice(0, limit),
                topLikes: arrTopLikesCount,
                topComments: arrTopCommentsCount
            };

            resolve(responseObj);

        } catch (err) {
            logger.error("Error on getChart", err);
            reject({ code: 500, "message": err.message });
        }

    });
};

exports.getChart = (path) => {

    return new Promise((resolve, reject) => {

        postHistoryModel.find({ path }, { date: 1 }, 0).then(items => {

            let likesArr = [];
            let commentsArr = [];

            items.forEach(data => {

                let dtTicks = data.date.getTime();

                likesArr.push([dtTicks, data.likeCount]);
                commentsArr.push([dtTicks, data.commentCount]);

            });

            let responseObj = {
                likesArr,
                commentsArr
            };

            resolve(responseObj);

        }).catch(err => {
            logger.error("Error on getChart", err);
            reject({ code: 500, "message": err.message });
        });

    });
};

exports.exportPosts = (res, username, pageSize, pageNum) => {

    return new Promise((resolve, reject) => {

        if (!username) {
            return reject({ code: 400, "message": "Username is a required field!" });
        }

        if (pageSize !== undefined || pageNum !== undefined){
            if (isNaN(pageSize) || pageSize <= 0) {
                return reject({ code: 401, "message": "PageSize must be a number greater than 0" });
            }
            if (isNaN(pageNum) || pageNum <= 0) {
                return reject({ code: 401, "message": "PageNum must be a number greater than 0" });
            }
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
                    "from": "is-post-history",
                    "localField": "path",
                    "foreignField": "path",
                    "as": "history"
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "path": 1,
                    "image": 1,
                    "description": 1,
                    "history.likeCount": 1,
                    "history.commentCount": 1,
                    "history.date": 1
                }
            }
        ];

        return postModel.aggregateToStream(criteria, pageSize, pageNum).then(cursor => {

            let hasError = false;
            let hasResults = false;

            res.setHeader('Content-type', 'text/json');          

            cursor.on('error', err => {
                hasError = true;
                reject({ code: 500, "message": err.message });
            });

            cursor.on('data', doc => {
                if (!hasResults) {
                    res.write("[");
                }else{
                    res.write(",");
                }

                res.write(JSON.stringify(doc));
                res.flush();

                hasResults = true;
            });

            cursor.once('end', () => {
                if (!hasError) {
                    resolve();
                    if (!hasResults) {
                        res.write("[");
                    }                    
                    res.end("]");
                }
            });

        }).catch(err => {
            logger.error("Error on export posts", err);
            reject({ code: 500, "message": err.message });
        });

    });

};