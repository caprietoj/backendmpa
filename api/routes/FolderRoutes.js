const router = require('express-promise-router')();
const passport = require('passport');
const FolderController = require('../controllers/FolderController');
const passportJWT = passport.authenticate('jwt', { session: false });

//Unused
const express = require('express');
const passportConf = require('../passport');
const passportSignIn = passport.authenticate('local', { session: false, });

router.route("/")
    .post(passportJWT, FolderController.new)
    .get(passportJWT, FolderController.getById);

router.route("/file")
    .post(FolderController.addFile)
    .patch(passportJWT, FolderController.moveFile)
    .put(passportJWT,FolderController.deletePublic);

router.route("/file_request/")
    .post(passportJWT, FolderController.createRequest)
    .patch(passportJWT, FolderController.validateCode);

module.exports = router;