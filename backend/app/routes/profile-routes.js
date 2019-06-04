const express = require("express");
const { sanitizeBody } = require('express-validator/filter');
const profileController = require("../controller/profile-controller");
const router  = express.Router();

const listAll = (req, res) => {

    profileController.list({}).then(result => {
        
        res.json(result);

    }).catch(err => {
        res.status(err.code).json({ "message": err.message });
    });    

};

const save = (req, res) => {

    profileController.save(req.body).then(result => {
        
        res.json(result);

    }).catch(err => {
        res.status(err.code).json({ "message": err.message });
    });    

};

const remove = (req, res) => {

    profileController.remove(req.params.username).then(result => {

        res.json(result);

    }).catch(err => {
        res.status(err.code).json({ "message": err.message });
    });    
    
};

const getChart = (req, res) => {

    profileController.getChart(req.params.username).then(result => {

        res.json(result);

    }).catch(err => {
        res.status(err.code).json({ "message": err.message });
    });    
    
};

const exportProfile = (req, res) => {

    profileController.exportProfile(res, req.params.username).then(() => {
        
        //ok

    }).catch(err => {
        res.status(err.code).json({ "message": err.message });
    });    

};

router.get("/listAll", sanitizeBody('*').trim().escape(), listAll);
router.post("/save", sanitizeBody('*').trim().escape(), save);
router.delete("/:username", remove);
router.get("/getChart/:username", sanitizeBody('*').trim().escape(), getChart);


/**
 * @route GET /profile/export/{username}
 * @group Profile
 * @param {string} username.path.required  
 * @produces application/json
 * @consumes application/json
 * @returns {Profile.model} Success
 * @returns {Error.model} Error 
 */

router.get("/export/:username", sanitizeBody('*').trim().escape(), exportProfile);

module.exports = router;