const router = require('express-promise-router')();
const passport = require('passport');
const SearchController = require('../controllers/SearchController');
const passportJWT = passport.authenticate('jwt', { session: false });

//Unused
const express = require('express');
const passportConf = require('../passport');
const passportSignIn = passport.authenticate('local', { session: false, });

router.route("/")
  .post(SearchController.testConnection)
  .get(passportJWT, SearchController.simpleSearch);

router.route("/prev")
  .get(passportJWT, SearchController.getPrev);

module.exports = router;