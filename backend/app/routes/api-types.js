
/**
 * @typedef Profile
 * @property {string} fullName
 * @property {string} username
 * @property {number} mediaCount
 * @property {boolean} isPrivate
 * @property {boolean} notFound
 * @property {Array.<ProfileHistory>} history
 */

/**
 * @typedef ProfileHistory
 * @property {number} followCount
 * @property {number} followedByCount
 * @property {number} mediaCount
 * @property {number} likeCount
 * @property {number} commentCount
 * @property {string} date
 */

/**
 * @typedef Post
 * @property {string} path
 * @property {string} image
 * @property {string} description
 * @property {Array.<PostHistory>} history
 */


/**
 * @typedef PostHistory
 * @property {number} likeCount
 * @property {number} commentCount
 * @property {string} date
 */

/**
 * @typedef Error
 * @property {number} code 
 * @property {string} message 
 */

/**
 * @typedef Error
 * @property {number} code 
 * @property {string} message 
 */