const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const LocalStrategy = require('passport-local').Strategy;

const { ExtractJwt } = require('passport-jwt');
const { JWT_SECRET } = require('./config');
const User = require('./models/UserModel');

// JWT strategy
passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromHeader('authorization'),
    secretOrKey: JWT_SECRET
},
    async (payload, done) => {
        try {
            const user = await User.findById(payload.sub)
            if (!user) {
                return done(null, false)
            }
            done(null, user)
        } catch (error) {
            done(error, false)
        }
    })); 


    
//Local Strategy
passport.use(new LocalStrategy({
    usernameField: 'email'
}, async (email, password, done) => {
    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        //User not found
        if (!user) {
            return done(null, false, { message: 'Incorrect email or password.' });
        }
        //Check if password is correct
        const isMatch = await user.isValidPassword(password);
        if (!isMatch) {
            return done("Contraseña incorrecta", user, { message: 'Incorrect email or password.' });
        }
        done(null, user);
    } catch (error) {
        done(error, false);
    }
}))
