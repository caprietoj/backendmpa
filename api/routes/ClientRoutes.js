const router = require('express-promise-router')();
const passport = require('passport');
const ClientController = require('../controllers/ClientController');
const passportJWT = passport.authenticate('jwt', { session: false });

//Unused
const express = require('express');
const passportConf = require('../passport');
const passportSignIn = passport.authenticate('local', { session: false, });

router.route("/")
    .post(passportJWT, ClientController.newClient)
    .put(passportJWT, ClientController.getById)
    .get(passportJWT, ClientController.getAll);

module.exports = router;