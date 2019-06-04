const express = require("express");
const { sanitizeBody } = require('express-validator/filter');
const postController = require("../controller/post-controller");
const router  = express.Router();

const getStats = (req, res) => {

    postController.getStats(req.params.username, req.query.limit).then(result => {
        
        res.json(result);

    }).catch(err => {
        res.status(err.code).json({ "message": err.message });
    });    

};

const getChart = (req, res) => {

    postController.getChart(req.params.path).then(result => {
        
        res.json(result);

    }).catch(err => {
        res.status(err.code).json({ "message": err.message });
    });    

};


const exportPosts = (req, res) => {

    postController.exportPosts(res, req.params.username, req.query.pageSize, req.query.pageNum).then(() => {
        
        //ok

    }).catch(err => {
        res.status(err.code).json({ "message": err.message });
    });    

};

router.get("/getStats/:username", sanitizeBody('*').trim().escape(), getStats);
router.get("/getChart/:path", sanitizeBody('*').trim().escape(), getChart);

/**
 * @route GET /post/export/{username}
 * @group Post 
 * @param {string} username.path.required  
 * @param {integer} pageSize.query - use to paginate (optional)
 * @param {integer} pageNum.query - use to paginate (optional)
 * @produces application/json
 * @consumes application/json
 * @returns {Array.<Post>} Success
 * @returns {Error.model} Error 
 */

 router.get("/export/:username", sanitizeBody('*').trim().escape(), exportPosts);

module.exports = router;