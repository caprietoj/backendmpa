var JWT = require('jsonwebtoken');
var { JWT_SECRET } = require('../config');
var crypto = require('crypto');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var Client = require('../models/ClientModel');
var Folder = require('../models/FolderModel');
var Action = require('../models/ActionModel');
var User = require('../models/UserModel');
const fs = require('fs');
const formidable = require('formidable');
const AWS = require('aws-sdk');
const {accessID, secretKey } = require("../config/AWS")
const s3 = new AWS.S3({
    accessKeyId: accessID,
    secretAccessKey: secretKey,
    region: 'us-east-2'
});
var nodemailer = require('nodemailer');
const UserModel = require('../models/UserModel');
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

module.exports = {

    new: async (req, res, next) => {
        await Folder.findOne({ name: req.body.name, parentFolder: req.body.parentFolder })
        .then(async (foundUser) => {
            if(foundUser) throw new Error("Ya existe una carpeta con este nombre");
            
            var parentFolder = await Folder.findById(req.body.parentFolder)
            var path = `${parentFolder.path}`
            
            var newFolder = new Folder({name: req.body.name, parentFolder: req.body.parentFolder})
            await newFolder.save()
            .then(async (savedFolder)=>{
                path = `${parentFolder.path}${savedFolder._id}`
                //Saving path of folder
                await Folder.findByIdAndUpdate(savedFolder._id, {path: `${path}/`}, {new: true})
                
                //Updating parent
                await Folder.findById(parentFolder._id)
                .then(async (newParent)=>{
                    var prevFolders = newParent.folders
                    prevFolders.push({name: req.body.name, id: savedFolder._id})
                    await Folder.findByIdAndUpdate(newParent._id, {folders: prevFolders}, {new: true})
                    .then((resp)=>{
                        console.log("done")
                    })
                    .catch(e=>{
                        throw new Error(e.message);
                    })
                })
                
                //Saving to S3
                var dir = `${__dirname}`
                console.log("path", path)
                await fs.readFile(`${dir}/init.txt`, async (err, data) => {
                    if (err) console.error(err);
                    var base64data = new Buffer(data, 'base64');
                    await s3.upload({
                        Bucket:`mpa-repository/${path}`,
                        Key: "init.txt", 
                        Body: base64data, 
                        ContentEncoding:'base64',
                        ContentType: "txt"
                    }, async function(err, data) {
                        if (err){
                            console.log("error writing in AWS", err);
                        }else{
                            console.log("done")
                        }
                    });
                })

                return res.status(200).send({savedFolder})
            })
            .catch(e=>{
                throw new Error(e.message);
            })

        })
        .catch(e=>{
            return res.status(500).send({error: e.message})
        })
              
    },

    getById: async (req, res, next) =>{
        await Folder.findById(req.query.id)
        .then((folderFound)=>{
            console.log(folderFound)
            return res.status(200).send(folderFound)
        })
        .catch(e=>{
            return res.status(500).send({error: e.message})
        })
    },

    getAll: async (req, res, next) =>{
        var filter = {}
        if(req.query.id) filter._id = req.query.id

        await Client.paginate(filter, {
            limit: req.query.pageSize ? parseInt(req.query.pageSize) : 10,
            page: req.query.page ? parseInt(req.query.page) : 1,
        })
        .then((allClients)=>{
            return res.status(200).send({
                docs: allClients.docs,
                total: allClients.total
            })
        })
        .catch(e=>{
            return res.status(500).send({error: e.message})
        })
    },

    addFile: async (req, res, next) =>{
        try{
            var form = new formidable.IncomingForm();
            var foundFolder = await Folder.findById(req.query.id)
            
            form.parse(req);
            form.on('fileBegin', async function (name, file){
            
                //Saving first locally
                var dir = `${__dirname}/tmp`
                if (!fs.existsSync(dir)){
                    fs.mkdirSync(dir);
                }
                
                //Parsing name
                name = name.replace(/ /g,"_")
                var fileName = name
                var splitName = name.split(".")
                var fileType = splitName[splitName.length-1]

                file.path = `${dir}/${fileName}`
                fileName = `${fileName}`
                
                var nameToStore = {
                    fileName,
                    originalName: name
                }
                
                await sleep(4000)
                //Saving to S3
                var savedFile = await savingInS3(dir, foundFolder, fileName, fileType, nameToStore)
                console.log(savedFile)
                await sleep(1000)

                //Saving
                var prevFiles = foundFolder.files
                prevFiles.push(savedFile)
    
                await Folder.findByIdAndUpdate(foundFolder._id, {files: prevFiles}, {new: true})
                .then(async (updatedFolder)=>{
                    await sleep(2000)
                    var oldPath = `${dir}` 
                    await fs.rmdir(oldPath, { recursive: true }, function (err) {
                        if (err) throw err
                        console.log('Successfully removed - AKA deleted!')
                    })
                    return res.status(200).send(updatedFolder)
                })
                .catch(e=>{
                  console.log(e)
                  return res.status(500).send(e)
                })
            });
           // return res.status(200).send({message: "OK"})
          }catch(e){
                console.log(e)
                return res.status(500).send(e)
          }
    },

    moveFile: async (req, res, next) =>{
        console.log(req.body.location)
        var nameSplit = req.body.location.split("/")
        var params = {Bucket: 'mpa-repository', Key: req.body.location};
        var status = await movingFile(params, nameSplit)
        if(status === "done"){
            return res.status(200).send({link: `https://api.mpaarchivodigital.com/public/${nameSplit[nameSplit.length-1]}`})
        }
    },

    deletePublic: async (req, res, next) =>{
        var dir = `${__dirname}/../../public`
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }

        await fs.unlink(`${dir}/${req.body.lastOpened}`, function (err) {
            if (err) {
                console.log(err)
                return res.status(500).send(err)
                throw new Error("No se ha podido eliminar el archivo");
            }
            else return res.status(200).send({message: "deleted"})
        });
        
    },

    createRequest: async (req, res, next) =>{
        var newAction = new Action(req.body)
        var foundUser = await User.findById(req.body.user)
        newAction.code = await generateCode()

        await newAction.save()
        .then(saved=>{
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
                    <strong>${newAction.code}</strong>
                    <br/><br/>
                    <br/>
                </div>`,
               }, (error, info) => {
                console.log(error, info)
            })
            return res.status(200).send({id : saved._id, message: "Se ha enviado el código de verificación"})
        })
        .catch(e=>{
            console.log(e)
            return res.status(500).send(e)
        })
    },

    validateCode: async (req, res, next) =>{
        var foundFile = await Action.findOne({code: req.body.code, _id: req.body.requestId})
        if(foundFile){
            var path = foundFile.file.path.split("/")
            res.status(200).send({message: "Código validado", link: `https://api.mpaarchivodigital.com/public/${path[path.length-1]}`})
            await sleep(60000)
            var dir = `${__dirname}/../../public`
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            await fs.unlink(`${dir}/${path[path.length-1]}`, function (err) {
                if (err) {
                    console.log(err)
                }
                else console.log({message: "deleted"})
            });
        }else{
            return res.status(200).send({message: "Código incorrecto"})
        }
    },
    
}

//Sleep
function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
} 

async function savingInS3(dir, foundFolder, fileName, fileType, nameToStore){
    return new Promise(async (resolve, reject) => {
        await fs.readFile(`${dir}/${fileName}`, async (err, data) => {
            if (err) console.error(err);
            var base64data = new Buffer(data, 'base64');
            console.log("bucket", `mpa-repository/${foundFolder.path.slice(0, -1)}`)
            await s3.upload({
                Bucket:`mpa-repository/${foundFolder.path.slice(0, -1)}`,
                Key: fileName, 
                Body: base64data, 
                ContentEncoding:'base64',
                ContentType: fileType
            }, async function(err, data) {
                if (err){
                    reject(err);
                }else{
                    nameToStore.path = data.Location
                    console.log("Saved in s3", data)
                    resolve(nameToStore)
                }
            });
        })
    });
}

async function movingFile(params, nameSplit){
    return new Promise(async (resolve, reject) => {
        await s3.getObject(params, async function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else {
                //Saving first locally
                var dir = `${__dirname}/../../public`
                if (!fs.existsSync(dir)){
                    fs.mkdirSync(dir);
                }
    
                await fs.writeFile(`${dir}/${nameSplit[nameSplit.length-1]}`, new Buffer(data.Body), function (err) {
                    if (err) return console.log(err);
                    resolve('done');
                });
            }           
        });
    })
    
}

function generateCode(ms){
    var numbers = '0123456789';
    var code = '';
    for (var i = 0; i < 6; i++) {
        code += numbers[Math.floor(Math.random() * 9)];
    }
    return code;
}

