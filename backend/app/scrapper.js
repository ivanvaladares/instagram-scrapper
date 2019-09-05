const phantom = require('phantom');
const jsdom = require("jsdom");
const moment = require("moment");
const cheerio = require('cheerio');
const dbProfile = require("./models/profile-model.js");
const dbProfileQueue = require("./models/profile-queue-model.js");
const dbProfileHistory = require("./models/profile-history-model.js");
const dbPost = require("./models/post-model.js");
const dbPostQueue = require("./models/post-queue-model.js");
const dbPostHistory = require("./models/post-history-model.js");
const logger = require("./logger.js");
const uuidv1 = require('uuid/v1');
const sleep = require('util').promisify(setTimeout);

const instanceId = uuidv1();
const { JSDOM } = jsdom;

let maxProfiles;
let maxDownloads;
let openedProfiles = 0;
const maxMinutesToScrapProfile = 120;
const notFoundCountLimit = 10;
const historyCalcDays = -7;

const calcPercentage = (vOld, vNew) => {
  try {
    return vOld > 0 ? ((vNew - vOld) / vOld) * 100 : 0;
  } catch (error) {
    return 0;
  }
};

const extractTextFromSource = (html, lookFor) => {
  let res = html.match(lookFor);
  if (res && res.length > 0){
    return res[1];
  }
  return "";
};

const extractNumberFromSource = (html, lookFor) => {
  let res = html.match(lookFor);
  if (res && res.length > 0){
    return parseInt(res[1], 10);
  }
  return 0;
};

const addPostHistoryData = (post) => {

  return new Promise(resolve => {

    let data = { 
      path: post.path,
      likeCount: post.likeCount, 
      commentCount: post.commentCount,
      date: new Date()
    };

    dbPostHistory.find({ path: post.path }, { date: -1 }, 1).then(previousHistory => {

      if (previousHistory.length === 0 ||
        ((previousHistory[0].likeCount !== data.likeCount ||
          previousHistory[0].commentCount !== data.commentCount) &&
          moment.duration(moment(new Date()).diff(moment(previousHistory[0].date))).asMinutes() > 60)
      ) {

        return dbPostHistory.save(data).then(() => {

          return dbPostHistory.find({ path: post.path, date: { $gt: moment().add(historyCalcDays, "day").toDate() } }, { date: 1 }, 1).then(hist => {

            if (hist.length > 0) {
              post.likePercentage = calcPercentage(hist[0].likeCount, data.likeCount);
              post.commentPercentage = calcPercentage(hist[0].commentCount, data.commentCount);
            }

            resolve(post);
          });

        });

      } else {
        resolve(post);
      }

    }).catch(err => {
      resolve(post);
      logger.error("Error on addPostHistoryData", { path: post.path, err });
    });

  });

};

const addProfileHistoryData = (profile) => {

  return new Promise(resolve => {

    if (!profile.scanned) {
      return resolve(profile);
    }

    let data = {
      followCount: profile.followCount,
      followedByCount: profile.followedByCount,
      mediaCount: profile.mediaCount,
      likeCount: profile.likeCount,
      commentCount: profile.commentCount,
      username: profile.username,
      date: new Date()
    };

    dbProfileHistory.find({ username: profile.username }, { date: -1 }, 1).then(lastHistory => {

      if (lastHistory.length === 0 ||
        ((lastHistory[0].followCount !== data.followCount ||
          lastHistory[0].followedByCount !== data.followedByCount ||
          lastHistory[0].mediaCount !== data.mediaCount ||
          lastHistory[0].likeCount !== data.likeCount ||
          lastHistory[0].commentCount !== data.commentCount) &&
          moment.duration(moment(new Date()).diff(moment(lastHistory[0].date))).asMinutes() > 60)
      ) {

        return dbProfileHistory.save(data).then(() => {

          return dbProfileHistory.find({ username: profile.username, date: { $gt: moment().add(historyCalcDays, "day").toDate() } }, { date: 1 }, 1).then(hist => {

            if (hist.length > 0) {
              profile.followPercentage = calcPercentage(hist[0].followCount, data.followCount);
              profile.followedByPercentage = calcPercentage(hist[0].followedByCount, data.followedByCount);
              profile.mediaPercentage = calcPercentage(hist[0].mediaCount, data.mediaCount);
              profile.likePercentage = calcPercentage(hist[0].likeCount, data.likeCount);
              profile.commentPercentage = calcPercentage(hist[0].commentCount, data.commentCount);
            }

            resolve(profile);
          });

        });

      } else {
        resolve(profile);
      }

    }).catch(err => {
      resolve(profile);
      logger.error("Error on addProfileHistoryData", { username: profile.username, err });
    });

  });

};

const saveProfile = (profile) => {
  return new Promise((resolve, reject) => {

    dbProfile.find({ username: profile.username }, {}, 1).then(savedProfile => {
      if (savedProfile.length > 0) {
        return dbProfile.replace({ username: profile.username }, profile).then(() => {
          resolve();
        });
      } else {
        resolve();
      }
    }).catch(err => {
      reject(err);
    });
  });
};

const refreshProfilesState = (profile) => {
  return new Promise(resolve => {
    let criteria = [
      {
        $match: {
          "username": profile.username,
          "scrapped": true,
          "likeCount": { $gte: 0 },
          "commentCount": { $gte: 0 }
        }
      },
      {
        $group: {
          _id: "$username",
          likes: {
            $sum: "$likeCount"
          },
          comments: {
            $sum: "$commentCount"
          },
          scrapped: {
            $sum: 1
          }
        }
      }
    ];

    return dbPost.aggregate(criteria).then(totals => {
      
      if (totals.length > 0) {
        profile.likeCount = totals[0].likes;
        profile.commentCount = totals[0].comments;
        profile.postsScrapped = totals[0].scrapped;
      }

      return addProfileHistoryData(profile).then(profile => {

        return saveProfile(profile).then(() => {
          resolve();
        });

      });

    });

  }).catch(err => {
    logger.error("Error on refreshProfilesState", { username: profile.username, err });
  });
};

const insertPost = (post) => {
  return new Promise(resolve => {

    dbPost.save(post).then(() => {
      return resolve(1);
    }).catch(() => {
      return resolve(0);
    });

  });
};

const scrapPostHtml = (post, html) => {
  return new Promise(resolve => {

    try {
      let $ = cheerio.load(html);

      let title = $('title').text();
      let image = $('meta[property="og:image"]').attr('content');
      let description = $('meta[property="og:description"]').attr('content');

      let likeCount = extractNumberFromSource(html, /edge_media_preview_like"[^0-9]+([0-9]+)/);
      let commentCount = extractNumberFromSource(html, /edge_media_to_comment"[^0-9]+([0-9]+)/);

      if (commentCount === 0) {
        commentCount = extractNumberFromSource(html, /edge_media_to_parent_comment"[^0-9]+([0-9]+)/);
      }

      let uploadDate = extractNumberFromSource(html, /taken_at_timestamp"[^0-9]+([0-9]+)/);

      if (!isNaN(likeCount) && !isNaN(commentCount) && !isNaN(uploadDate)) {

        post.image = image;
        post.likeCount = likeCount;
        post.commentCount = commentCount;
        post.description = description;
        post.lastScrapDate = new Date();
        post.scrapped = true;
        post.removed = false;
        post.notFoundCount = 0;
        post.uploadDate = moment(new Date(uploadDate * 1000)).toDate();

        return addPostHistoryData(post).then(post => {

          return dbPost.replace({ _id: post._id }, post).then(() => {
            resolve();
          });

        });

      } else {

        if (title.toLowerCase().indexOf("restricted") >= 0) {        
         
          post.lastScrapDate = new Date();
          post.notFoundCount = post.notFoundCount ? post.notFoundCount + 1 : 1;
          post.scrapped = true;
          post.removed = true;

          return dbPost.replace({ _id: post._id }, post).then(() => {
            resolve();
          });

        } else {
          logger.error("Could not parse post HTML", { path: post.path, html }, true);
          resolve();
        }

      }

    } catch (err) {
      logger.error("Error during post scrapp", { path: post.path, html, err }, true);
      resolve();
    }
  });
};

const downloadPostHtml = (post) => {
  return new Promise(resolve => {

    const request = require('request');

    let options = {
      url: 'https://www.instagram.com/p/' + post.path + "/",
      method: 'GET',
      timeout: 10000,
      followRedirect: false
    };

    request(options, (err, response, html) => {

      if (err) {
        return resolve();
      }

      dbPostQueue.remove({ path: post.path }).catch(err => {
        logger.error("Error removing post from queue", err);
      });

      if (response.statusCode === 200) {

        return scrapPostHtml(post, html).then(() => {
          resolve();
        });

      } else {

        post.notFoundCount = post.notFoundCount ? post.notFoundCount + 1 : 1;
        post.lastScrapDate = new Date();
        post.removed = true;

        return dbPost.replace({ path: post.path }, post).then(() => {
          resolve();
        });

      }

    }).catch(err => {
      logger.error("Error on downloadPostHtml", { username: post.username, path: post.path, err }, true);
      resolve();
    });

  });
};

const scrappPosts = () => {

  dbPostQueue.find({ instanceId }, { date: 1 }, maxDownloads).then(queue => {

    if (queue.length <= 0) {
      setTimeout(scrappPosts, 1000);
      return;
    }

    let arrPaths = queue.map(item => {
      return item.path;
    });

    return dbPost.find({ path: { $in: arrPaths } }, {}, maxDownloads).then(posts => {

      if (posts.length > 0) {

        logger.info("Downloading posts", posts.length);

        let arrInsertPostPromises = posts.map(post => {
          return downloadPostHtml(post);
        });

        return Promise.all(arrInsertPostPromises).then(() => {
          setTimeout(scrappPosts, 5000);
        });

      } else {
        setTimeout(scrappPosts, 5000);
      }

    });

  }).catch(() => {
    setTimeout(scrappPosts, 10000);
  });

};

const scrapProfile = async (state) => {

  state.startDateScrappingProfile = state.startDateScrappingProfile || new Date();
  state.listPostsScrapped = state.listPostsScrapped || {};
  state.stuckCount = state.stuckCount || 0;
  state.rounds = state.rounds || 0;
  state.rounds++;

  let arrInsertPostPromises = [];
  let arrPostsScrapped = [];

  let arrPaths = await state.pageInstance.evaluate(function () {
    var postsLinks = window.document.querySelectorAll("a");
    var arrPaths = [];
    var i;

    for (i = 0; i < postsLinks.length; i++) {
      if (postsLinks[i].pathname.indexOf("/p/") === 0) {
        arrPaths.push(postsLinks[i].pathname.substring(3).replace(/\//gi, ""));
      }
    }

    return arrPaths;
  });

  if (arrPaths !== null) {
    arrInsertPostPromises = arrPaths.map(path => {
      arrPostsScrapped.push(path);
      return insertPost({
        username: state.profile.username,
        path: path,
        image: "",
        description: "",
        likeCount: 0,
        commentCount: 0,
        uploadDate: null,
        lastScrapDate: null,
        scrapped: false,
        removed: false
      });
    });
  }

  Promise.all(arrInsertPostPromises).then(arrInsertPostPromiseResult => {
    let capturedPosts = false;
    let savedPosts = false;

    state.pageInstance.evaluate(function () {
      window.scrollTo(0, 0);
      setTimeout(window.scrollTo, 500, 0, document.body.scrollHeight);
    });

    arrPostsScrapped.forEach(path => {
      if (state.listPostsScrapped[path] === undefined) {
        state.listPostsScrapped[path] = 1;
        capturedPosts = true;
      }
    });

    if (!capturedPosts) {
      state.stuckCount++;
    } else {
      state.stuckCount = 0;
    }

    if (arrInsertPostPromiseResult.length > 0) {
      let countSaved = arrInsertPostPromiseResult.reduce((accumulator, currentValue) => accumulator + currentValue);
      savedPosts = countSaved > 0;
    }

    return dbPost.count({ username: state.profile.username, removed: false, scrapped: true }).then(totalPostsSaved => {

      return dbProfile.get(state.profile.username).then(profileExist => {

        if (profileExist.length === 0) {
          setTimeout(() => state.phantomInstance.exit(), 1000);
          return;
        }

        let postsSavedPercentage = (totalPostsSaved / state.profile.mediaCount);
        let closeProfile = state.profile.scanned && (capturedPosts && !savedPosts);

        if (totalPostsSaved >= state.profile.mediaCount) {
          if (!state.profile.scanned){
            state.profile.scanned = true;
          }
          closeProfile = true;
        }

        if (moment.duration(moment(new Date()).diff(moment(state.startDateScrappingProfile))).asMinutes() > maxMinutesToScrapProfile) {
          logger.warn("Took too long to capture profile", state.profile.username);
          closeProfile = true;

          if (postsSavedPercentage >= 0.99 && !state.profile.scanned) {
            state.profile.scanned = true;
          }
        }

        if (closeProfile) {
          setTimeout(() => state.phantomInstance.exit(), 1000);
          return;
        }

        if (state.stuckCount > 5) {
          state.stuckCount = 0;
          setTimeout(scrapProfile, 60000, state);
          logger.info("Scrapper is stuck", state.profile.username);
          return;
        }

        return refreshProfilesState(state.profile).then(() => {
          setTimeout(scrapProfile, 1000, state);
        });

      });

    });

  }).catch(err => {
    logger.error("Error on scrapProfile", err);
    setTimeout(scrapProfile, 10000, state);
  });

};

const openProfile = async () => {

  if (openedProfiles >= maxProfiles) {
    return;
  }

  let username = await dbProfileQueue.find({ instanceId }, { date: 1 }, 1).then(queue => {
    return (queue.length > 0) ? queue[0].username : null;
  }).catch(err => {
    logger.error("Error at openProfile", { username, err });
  });

  if (!username) {
    return;
  }

  let profile = await dbProfile.find({ username, scrapping: false }, {}, 1).then(profiles => {
    return profiles.length > 0 ? profiles[0] : null;
  }).catch(err => {
    logger.error("Error at openProfile", { username, err });
  });

  if (!profile) {
    return;
  }

  profile.lastScrapDate = new Date();
  profile.scrapping = true;

  let canProceed = true;

  await saveProfile(profile).then(() => {
    logger.info("Scrapping profile", profile.username);
  }).catch(err => {
    canProceed = false;
    logger.error("Error updating lastScrapDate", { username: profile.username, err });
  });

  if (!canProceed) {
    return;
  }

  const pageURL = 'https://www.instagram.com/' + profile.username + "?t=" + new Date().getTime();

  const phantomInstance = await phantom.create();
  const pageInstance = await phantomInstance.createPage();
  pageInstance.setting('userAgent', "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.97 Safari/537.11");
  const status = await pageInstance.open(pageURL);

  dbProfileQueue.remove({ username: profile.username }).catch(err => {
    logger.error("Error removing profile from queue", { username: profile.username, err });
  });

  await pageInstance.on('onClosing', () => {

    profile.lastScrapDate = new Date();
    profile.scrapping = false;

    refreshProfilesState(profile).then(() => {
      logger.info("Profile saved", profile.username);
    }).catch(err => {
      logger.error("Error on saveProfile", { username: profile.username, err });
    });

    if (openedProfiles > 0) {
      openedProfiles--;
    }
  });

  openedProfiles++;

  if (status !== "success") {
    setTimeout(() => phantomInstance.exit(), 1000);
    logger.error("Error on open page", { pageURL, status });
    return;
  }

  await pageInstance.evaluate(function () {
    window.scrollTo(100, 0);
  });

  await sleep(1000);

  await pageInstance.evaluate(function () {
    window.scrollTo(0, 0);
  });

  await sleep(1000);

  const pageContent = await pageInstance.property('content');
  const pageDOM = new JSDOM(pageContent, { runScripts: "dangerously" });

  if (pageDOM.window._sharedData === undefined) {
    setTimeout(() => phantomInstance.exit(), 1000);

    if (!profile.scanned && pageContent.indexOf("Page Not Found") > 0) {
      profile.notFound = true;
      logger.error("Could not find profile", { pageURL });
    }
    return;
  }

  let followCount = extractNumberFromSource(pageContent, /edge_follow"[^0-9]+([0-9]+)/);
  let followedByCount = extractNumberFromSource(pageContent, /edge_followed_by"[^0-9]+([0-9]+)/);
  let mediaCount = extractNumberFromSource(pageContent, /edge_owner_to_timeline_media"[^0-9]+([0-9]+)/);

  if (followCount === 0 && followedByCount === 0 && mediaCount === 0) {
    logger.info("Could not capture profile page", { username: profile.username, pageContent });
    setTimeout(() => phantomInstance.exit(), 1000);
    return;
  }

  profile.fullName = pageDOM.window.document.title.match(/([^(]+)/)[1];
  profile.followCount = followCount;
  profile.followedByCount = followedByCount;
  profile.mediaCount = mediaCount;
  profile.isPrivate = extractTextFromSource(pageContent, /is_private":([^,]+)/) === "true";
  profile.notFound = false;

  if (profile.isPrivate) {
    logger.info("private profile", { username: profile.username });
    setTimeout(() => phantomInstance.exit(), 1000);
    return;
  }

  setTimeout(scrapProfile, 1000, { pageInstance, phantomInstance, profile });

};

const queuePosts = async () => {

  let arrQueue = await dbPostQueue.find({}, {}, 0).then(queue => {
    if (queue.length > 0) {
      return queue.map(item => {
        return item.path;
      });
    }
    return [];
  });

  let limit = maxDownloads * 10;
  limit = limit > 500 ? 500 : limit;

  dbPost.find(
  {
    $or:
      [
        {
          scrapped: false,
          removed: false
        },
        {
          uploadDate: { $gt: moment().add(-1, "day").toDate() },
          lastScrapDate: { $lt: moment().add(-60, "minutes").toDate() },
          removed: false
        },
        {
          uploadDate: { $gt: moment().add(-5, "day").toDate() },
          lastScrapDate: { $lt: moment().add(-120, "minutes").toDate() },
          removed: false
        },
        {
          uploadDate: { $gt: moment().add(-10, "day").toDate() },
          lastScrapDate: { $lt: moment().add(-180, "minutes").toDate() },
          removed: false
        },
        {
          uploadDate: { $gt: moment().add(-20, "day").toDate() },
          lastScrapDate: { $lt: moment().add(-240, "minutes").toDate() },
          removed: false
        },
        {
          uploadDate: { $gt: moment().add(-30, "day").toDate() },
          lastScrapDate: { $lt: moment().add(-300, "minutes").toDate() },
          removed: false
        },
        {
          lastScrapDate: { $lt: moment().add(-720, "minutes").toDate() },
          removed: false
        },
        {
          removed: true,
          lastScrapDate: { $lt: moment().add(-300, "minutes").toDate() },
          notFoundCount: { $lt: notFoundCountLimit }
        }
      ]
  },
  { scrapped: 1, lastScrapDate: 1 }, limit).then(async posts => {

    let postsQueued = 0;

    for await (const post of posts) {
      if (postsQueued < maxDownloads && arrQueue.indexOf(post.path) < 0) {
        postsQueued += await dbPostQueue.save({ instanceId, path: post.path, date: new Date() })
          .then(() => {
            return 1;
          })
          .catch(() => {
            return 0;
          });
      }
      if (postsQueued >= maxDownloads) {
        break;
      }
    }

    setTimeout(queuePosts, postsQueued > 0 ? 5000 : 2000);

  }).catch(err => {
    logger.error("Error on queuePosts", err);
    setTimeout(queuePosts, 5000);
  });

};

const queueProfiles = async () => {

  if (openedProfiles >= maxProfiles) {
    setTimeout(queueProfiles, 5000);
    return;
  }

  let arrQueue = await dbProfileQueue.find({}, {}, 0).then(queue => {
    if (queue.length > 0) {
      return queue.map(item => {
        return item.username;
      });
    }
    return [];
  });

  dbProfile.find({
    $or: [
      { lastScrapDate: null, scrapping: false },
      { lastScrapDate: { $lt: moment().add(-10, "minutes").toDate() }, scrapping: false }
    ]
  }, { lastScrapDate: 1 }, 0).then(async profiles => {

    let profileQueue = false;

    for await (const profile of profiles) {
      if (arrQueue.indexOf(profile.username) < 0 && !profileQueue) {
        profileQueue = await dbProfileQueue.save({ instanceId, username: profile.username, date: new Date() }).then(() => {
          return true;
        }).catch(() => {
          return false;
        });
      }
      if (profileQueue) {
        break;
      }
    }

    setTimeout(queueProfiles, profileQueue ? 10000 : 5000);

  }).catch(err => {
    logger.error("Error on queueProfiles", err);
    setTimeout(queueProfiles, 5000);
  });

};

const cleanQueues = () => {

  dbProfileQueue.remove({ date: { $lt: moment().add(-1, "minutes").toDate() } }).then(numRemoved => {
    if (numRemoved > 0) {
      logger.info("Cleaning profile queue");
    }
  }).catch(err => {
    logger.error("Error cleaning profile queue", err);
  });

  dbPostQueue.remove({ date: { $lt: moment().add(-1, "minutes").toDate() } }).then(numRemoved => {
    if (numRemoved > 0) {
      logger.info("Cleaning post queue");
    }
  }).catch(err => {
    logger.error("Error cleaning post queue", err);
  });

  dbProfile.update({ lastScrapDate: { $lt: moment().add(((maxMinutesToScrapProfile + 10) * -1), "minutes").toDate() } }, 
                  { $set: { scrapping: false } }).then(() => {
    //ignore
  }).catch(err => {
    logger.error("Error reseting scrapping flag", err);
  });

};

const init = (options) => {

  options = options || {};

  maxProfiles = options.maxProfiles || 3;
  maxDownloads = options.maxDownloads || 30;

  maxProfiles = parseInt(maxProfiles, 10);
  maxDownloads = parseInt(maxDownloads, 10);

  logger.warn("Starting scrapper!", { instanceId });

  queueProfiles();
  queuePosts();

  setInterval(cleanQueues, 10000);
  setInterval(openProfile, 10000);

  scrappPosts();

};

exports.init = init;