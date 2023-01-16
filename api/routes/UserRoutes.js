const router = require('express-promise-router')();
const passport = require('passport');
const UserController = require('../controllers/UserController');
const passportJWT = passport.authenticate('jwt', { session: false });

//Unused
const express = require('express');
const passportConf = require('../passport');
const passportSignIn = passport.authenticate('local', { session: false, });


router.route("/")
    .post(UserController.signUp)
    .get(passportJWT, UserController.get);

router.route("/activity")
    .get(passportJWT, UserController.getActivity);

router.route("/session")
    .put(UserController.recoveryEmail)
    .post(UserController.logIn);

router.route("/session/validate")
    .patch(UserController.validateCode);

router.route("/session/recover")
    .post(UserController.setPassword);

router.route("/session/:id")
    .get(passportJWT, UserController.getById)
    .delete(passportJWT, UserController.deleteUser)
    .patch(passportJWT, UserController.editUser);


module.exports = router;