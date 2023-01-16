var JWT = require('jsonwebtoken');
var { JWT_SECRET } = require('../config');
var crypto = require('crypto');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var Client = require('../models/ClientModel');
var Folder = require('../models/FolderModel');
const fs = require('fs');
const AWS = require('aws-sdk');
const {accessID, secretKey } = require("../config/AWS")
const s3 = new AWS.S3({
    accessKeyId: accessID,
    secretAccessKey: secretKey,
    region: 'us-east-2'
});

module.exports = {

    newClient: async (req, res, next) => {
        await Client.findOne({ name: req.body.name })
        .then(async (foundUser) => {
            if(foundUser) throw new Error("El cliente ya se encuentra registrado");
            
            //Validate Password
            var newClient = new Client({name: req.body.name})
            await newClient.save()
            .then(async (savedClient)=>{

                var newFolder = new Folder({name: savedClient._id, main: true})
                await newFolder.save()
                .then(async (response)=>{
                    //Saving to S3
                    var dir = `${__dirname}`
                    await fs.readFile(`${dir}/init.txt`, async (err, data) => {
                        if (err) console.error(err);
                        var base64data = new Buffer(data, 'base64');
                        await s3.upload({
                            Bucket:`mpa-repository/${response._id}`,
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
                    await Client.findByIdAndUpdate(savedClient._id, {mainFolder: response._id}, {new: true})
                    await Folder.findByIdAndUpdate(response._id, {path: `${response._id}/`}, {new: true})
                    return res.status(200).send({savedClient})
                })
                .catch(e=>{
                    throw new Error(e.message);
                })
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
        await Client.findById(req.query.id)
        .then((clientFound)=>{
            return res.status(200).send(clientFound)
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
    
}

//Sleep
function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
} 




