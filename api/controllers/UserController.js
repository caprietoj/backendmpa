var JWT = require('jsonwebtoken');
var { JWT_SECRET } = require('../config');
var crypto = require('crypto');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var User = require('../models/UserModel');
var Action = require('../models/ActionModel');
var nodemailer = require('nodemailer');
//Mailing
var transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true, //ssl
    auth: {
      user: 'notificaciones@mpaarchivodigital.com',
      pass: 'Mpa2020!'
    }
});
const domain = "https://www.mpaarchivodigital.com"

module.exports = {

    get: async (req, res, next) => {
        var filter = {}
        if(req.query.superadmin == false || req.query.superadmin == "false"){
            filter.rol = ["admin","regular"]
        }
        await User.paginate(filter, {
          page: req.query.page ? req.query.page : 1,
          limit: req.query.pageSize ? Number(req.query.pageSize) : 10,
          sort: req.query.sort ? req.query.sort : 'name',
          populate: "created_by"
        })
        .then((result) =>
          res.status(200).json({
            docs: result.docs,
            total: result.total,
          }))
        .catch((err) => res.status(500).json({ error: err.message }))
    },

    getActivity: async (req, res, next) => {
        var filter = {}

        await Action.paginate(filter, {
          page: req.query.page ? req.query.page : 1,
          limit: req.query.pageSize ? Number(req.query.pageSize) : 10,
          sort: req.query.sort ? req.query.sort : '-_id',
          populate: ["created_by", "user"]
        })
        .then((result) =>
          res.status(200).json({
            docs: result.docs,
            total: result.total,
          }))
        .catch((err) => res.status(500).json({ error: err.message }))
    },

    getById: async (req, res, next) => {
        await User.findById(req.params.id)
        .then(user=>{
            return res.status(200).send({user})
        })
        .catch(e=>{
            console.log(e)
            return res.status(500).send({error: e.message})
        })
    },

    deleteUser: async (req, res, next) => {
        await User.findByIdAndDelete(req.params.id)
        .then(user=>{
            return res.status(200).send({user})
        })
        .catch(e=>{
            console.log(e)
            return res.status(500).send({error: e.message})
        })
    },

    editUser: async (req, res, next) => {
        await User.findByIdAndUpdate(req.params.id, req.body, {new: true})
        .then(user=>{
            return res.status(200).send({user})
        })
        .catch(e=>{
            console.log(e)
            return res.status(500).send({error: e.message})
        })
    },

    logIn: async (req, res, next) => {
        console.log("kevin")
        await User.findOne({ email: req.body.email })
        .then(async (foundUser) => {
            if(!foundUser) throw new Error("El usuario no se encuentra registrado");
            //Validate Password
            const validate = await foundUser.isValidPassword(req.body.password)
            if(validate){
                if(req.body.ip === foundUser.ip){
                    const token = signToken(foundUser);
                    if(req.body.trust){
                        await User.findByIdAndUpdate(foundUser._id, {ip: req.body.ip}, {new: true})
                    }
                    return res.status(200).send({message: "Logged in", name: foundUser.name, email: foundUser.email, authorizationMPA: token, rol: foundUser.rol, id: foundUser._id});
                }else{
                    var code = await generateCode()
                    transporter.sendMail({
                        from: {
                          name: "Notificaciones MPA Archivo Digital",
                          address: "notificaciones@mpaarchivodigital.com"
                        },
                        to: foundUser.email,
                        subject: `Código de verificación`,
                        html: 
                        `<div>
                            <p>El código de verificación es:</p> 
                            <br/><br/>
                            <strong>${code}</strong>
                            <br/><br/>
                            <br/>
                        </div>`,
                       }, (error, info) => {
                        console.log(error, info)
                    })
                    await User.findOneAndUpdate({ email: req.body.email }, {otp: code}, {new: true})
                    return res.status(200).send({title: "Verificación de dos pasos", code, message: "Se ha enviado un código de verificación a tu correo"});
                }
            }else{
                throw new Error("La contraseña es incorrecta")
            }
        })
        .catch(e=>{
            return res.status(500).send({error: e.message})
        })
              
    },

    validateCode: async (req, res, next) => {
        await User.findOne({ email: req.body.email })
        .then(async (foundUser) => {
            if(!foundUser) throw new Error("El usuario no se encuentra registrado");
            //Validate Password
            const validate = await foundUser.isValidPassword(req.body.password)
            if(validate){
                if(req.body.code === foundUser.otp){
                    const token = signToken(foundUser);
                    if(req.body.trust){
                        await User.findByIdAndUpdate(foundUser._id, {ip: req.body.ip, otp: null}, {new: true})
                    }
                    return res.status(200).send({message: "Logged in", email: foundUser.email, name: foundUser.name, authorizationMPA: token, rol: foundUser.rol, id: foundUser._id});
                }else{
                    throw new Error("El código de verificación es incorrecto")
                }
            }else{
                throw new Error("La contraseña es incorrecta")
            }
        })
        .catch(e=>{
            return res.status(500).send({error: e.message})
        })
    },

    signUp: async (req, res, next) =>{
        var pswdToken = ObjectId().toHexString()
        var newUser = new User({...req.body, pswdToken})
        await newUser.save()
        .then(saved=>{
            transporter.sendMail({
                from: {
                  name: "Notificaciones MPA Archivo Digital",
                  address: "notificaciones@mpaarchivodigital.com"
                },
                to: saved.email,
                subject: `¡Activa tu cuenta para MPA Archivo Digital!`,
                html: 
                `<div>
                    <p>MPA Archivo Digital te está invitando a activar tu cuenta:</p> 
                    <br/><br/>
                    <a href="${domain}/register?token=${saved.pswdToken}">Activar ahora</a>
                    <br/><br/>
                    <br/>
                </div>`,
               }, (error, info) => {
                console.log(error, info)
              })
            return res.status(200).json({message: "Se ha creado el usuario con éxito"});
        })
        .catch(e=>{
            return res.status(500).send({error: e.message})
        })
    },
    
    recoveryEmail: async (req, res, next) => {
        var pswdToken = ObjectId().toHexString()
        var filter = {}
        if(req.body.id) filter._id = req.body.id
        if(req.body.email) filter.email = req.body.email
        console.log(filter)
    
        await User.findOneAndUpdate(filter, {pswdToken}, {new: true})
        .then(updatedUser=>{
            console.log(updatedUser)
            if(updatedUser){
                transporter.sendMail({
                    from: {
                      name: "Notificaciones MPA Archivo Digital",
                      address: "notificaciones@mpaarchivodigital.com"
                    },
                    to: updatedUser.email,
                    subject: `Reestablezca su contraseña`,
                    html: 
                        `<div>
                            <p>Utilice el siguiente link para reestablecer su contraseña:</p> 
                            <br/><br/>
                            <a href="${domain}/register?token=${updatedUser.pswdToken}">Reestablecer</a>
                            <br/><br/>
                            <br/><br/>
                        </div>`,
                   }, (error, info) => {
                    console.log(error, info)
                })
                return res.status(200).send({message: "Se ha enviado un link de recuperación de contraseña al correo"})
            }else{
                throw new Error("No se ha encontrado este usuario")
            }
        })
        .catch(e=>{
          console.log(e)
          return res.status(500).send({error: e.message})
        })
    
    },

    mails: async (req, res, next) =>{
        var newUser = { pswdToken: "Kevin", email: "desarrollo@punitech.com.co"}
        transporter.sendMail({
            from: {
              name: "Notificaciones MPA Archivo Digital",
              address: "notificaciones@mpaarchivodigital.com"
            },
            to: newUser.email,
            subject: `¡Activa tu cuenta para MPA Archivo Digital!`,
            html: 
            `<div>
                <p>MPA Archivo Digital te está invitando a activar tu cuenta:</p> 
                <br/><br/>
                <a href="${domain}/register?token=${newUser.pswdToken}">Activar ahora</a>
                <br/><br/>
                <br/>
            </div>`,
           }, (error, info) => {
            console.log(error, info)
          })
    },

    setPassword: async (req, res, next) => {
        await User.findOne({ email: req.body.email, pswdToken: req.body.token })
            .then((user) => {
                if (user) {
                    if(user.pswdToken !== req.body.token){
                        throw new Error("No tiene autorización para realizar esta acción")
                    }else{
                        user.password = req.body.password;
                        user.pswdToken = undefined;
                        return user.save()
                    }
                } else {
                    throw new Error("No se encontró ningún usuario con este correo")
                }
            })
            .then((newUser) => {
                const token = signToken(newUser);
                return res.status(200).send({ message: `Se ha establecido su contraseña!`, token, rol: newUser.rol, id: newUser._id });
            })
            .catch((err) => res.status(500).json({ error: err.message }))
    },

}


//Tokenization
function signToken(user) {
    return JWT.sign({
      iss: 'PDA2020',
      sub: user.id,
      iat: new Date().getTime(),
      exp: new Date().setDate(new Date().getDate() + 1) //Current time +1 day ahead
    }, JWT_SECRET);
}

//Sleep
function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
} 

function generateCode(ms){
    var numbers = '0123456789';
    var code = '';
    for (var i = 0; i < 6; i++) {
        code += numbers[Math.floor(Math.random() * 9)];
    }
    return code;
}



