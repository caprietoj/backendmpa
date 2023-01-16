var mongoose = require('mongoose');
const moment = require("moment")
const fs = require('fs');
const path = require('path');
var util = require('util');
const PDFJS = require('pdfjs-dist')
const fsReaddir = util.promisify(fs.readdir);
const fsReadFile = util.promisify(fs.readFile);
const fsLstat = util.promisify(fs.lstat);
var browser = require("browser");
var PDFParser = require('pdf2json');
var PdfReader = require('pdfreader').PdfReader;
var ObjectId = mongoose.Types.ObjectId;
var Folder = require('../models/FolderModel');
var Search = require('../models/SearchModel');
var Action = require('../models/ActionModel');
const AWS = require('aws-sdk');
const {accessID, secretKey } = require("../config/AWS")
const s3 = new AWS.S3({
    accessKeyId: accessID,
    secretAccessKey: secretKey,
    region: 'us-east-2'
});

module.exports = {
  testConnection: async (req, res, next) =>{
    return res.status(200).send({message: "OK"})
  },

  /* simpleSearch: async  (req, res, next) =>{
    //Set up folder
    var dir = `${__dirname}/../../files/`
    var ext = ".pdf"

    //Getting files in directory
    var listOfFiles = getFilesInDirectory(dir, ext);
    console.log(listOfFiles)

    //Searching word
    var searchResult = []
    for(file of listOfFiles){
      //Getting file name
      var fileName = file.split("/files/")
      fileName = fileName[fileName.length-1]

      if (fs.existsSync(`${dir}${fileName}`)) {
        await findingWord(`${dir}${fileName}`, req.query.word)
        .then((fileInfo)=>{
          searchResult.push(fileInfo)
        })
        .catch(e=>{

        })
      }

    }

    return res.status(200).send(searchResult)
  }, */

  simpleSearch: async (req, res, next) =>{
    var files = []
    if(req.query.folder) var foundFolder = await Folder.findById(req.query.folder)
    //console.log(foundFolder)

    //Looking for previous search
    var foundSearch = await Search.findOne({word: req.query.word})
    if(foundSearch){
      return res.status(200).send(foundSearch.results)
    }
    
    //Getting keys from s3
    const listAllKeys = (params, out = []) => new Promise((resolve, reject) => {
      s3.listObjectsV2(params).promise()
        .then(({Contents, IsTruncated, NextContinuationToken}) => {
          out.push(...Contents);
          !IsTruncated ? resolve(out) : resolve(listAllKeys(Object.assign(params, {ContinuationToken: NextContinuationToken}), out));
        })
        .catch(reject);
    });
    if(foundFolder){
      var files = await listAllKeys({Bucket: `mpa-repository/${foundFolder.path.slice(0, -1)}`})
    }else{
      var files = await listAllKeys({Bucket: `mpa-repository`})
    }
    
    //Filtering by .pdf
    var filteredFiles = []
    files.forEach(file =>{
        if(file.Key.includes(".pdf")) filteredFiles.push({...file/* , Key: `https://mpa-repository.s3.us-east-2.amazonaws.com/${file.Key}` */})
    });
    
    //Searching word
    var searchResult = []
    for(file of filteredFiles){
      await findingWord(file, req.query.word)
      .then((fileInfo)=>{
        searchResult.push(fileInfo)
      })
      .catch(e=>{
        console.log(e)
      })
    }

    //Getting all file Namess
    /* var allFiles = await findAllFiles()
    console.log(allFiles )*/
    var foundSearch = await Search.find({word: req.query.word})
    if(foundSearch.length < 1){
      var newSearch = new Search({
        word: req.query.word,
        results: searchResult,
        executedBy: req.query.user
      })
      console.log("not prev")
      await newSearch.save()

      var newAction = new Action({
        word: req.query.word,
        user: req.query.user,
        name: `Búsqueda de ${req.query.word}`,
        type: "search",
      })
      console.log("not prev")
      await newAction.save()
    }else{
      var newAction = new Action({
        word: req.query.word,
        user: req.query.user,
        name: `Búsqueda de ${req.query.word}`,
        type: "search",
      })
      console.log("not prev")
      await newAction.save()
      console.log("prev")
    }
    return res.status(200).send(searchResult)

  },

  updateSearches: async (req, res, next) =>{
    
    //Getting keys from s3
    const listAllKeys = (params, out = []) => new Promise((resolve, reject) => {
      s3.listObjectsV2(params).promise()
        .then(({Contents, IsTruncated, NextContinuationToken}) => {
          out.push(...Contents);
          !IsTruncated ? resolve(out) : resolve(listAllKeys(Object.assign(params, {ContinuationToken: NextContinuationToken}), out));
        })
        .catch(reject);
    });
    
    var files = await listAllKeys({Bucket: `mpa-repository`})
    
    //Filtering by .pdf
    var filteredFiles = []
    files.forEach(file =>{
        if(file.Key.includes(".pdf")) filteredFiles.push({...file/* , Key: `https://mpa-repository.s3.us-east-2.amazonaws.com/${file.Key}` */})
    });
    
    //Searching word
    var allSearches = await Search.find({})
    for(let i = 0; i <  allSearches.length; i++){
      var searchResult = []

      for(file of filteredFiles){
        await findingWord(file, allSearches[i].word)
        .then((fileInfo)=>{
          searchResult.push(fileInfo)
        })
        .catch(e=>{
          console.log(e)
        })
      }

      await Search.findByIdAndUpdate(allSearches[i]._id, {results: searchResult}, {new: true})
      .then(updated =>{
        console.log(updated)
      })

    }

  },

  getPrev: async (req, res, next) =>{
    var filter = {
      $or: []
    }
    if (req.query.word) {
      filter.$or.push( { word: { "$regex": req.query.word, "$options": "i" } } )
    }

    if(filter.$or.length < 1){
      delete filter.$or
    }

    await Search.paginate(filter, {
      page: req.query.page ? req.query.page : 1,
      limit: req.query.pageSize ? Number(req.query.pageSize) : 10,
      sort: req.query.sort ? req.query.sort : 'name',
      populate: "executedBy"
    })
    .then((result) =>
      res.status(200).json({
        docs: result.docs,
        total: result.total,
      }))
    .catch((err) => res.status(500).json({ error: err.message }))
  }

}

//Finding words
const findingWord = async (file, word) => {
    
  return new Promise((resolve, reject) => {
    //console.log("doing with file", file)
    s3.getObject({
      Bucket: 'mpa-repository',
      Key: file.Key
    }, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            //callback(err);
        } else {
          //console.log(data)
          //Initializing reader
          var pdfParser = new PDFParser(browser, 1);
          pdfParser.parseBuffer(data.Body);

          //Getting content
          pdfParser.on("pdfParser_dataReady", function() {
            var content = pdfParser.getRawTextContent()
              content = content.split("----------------")
              //Separate content in pages
              var pagesContent = []
              for(let i = 0; i < content.length; i++){
                if(!content[i].includes("Page (")) pagesContent.push(content[i])
              }


              //Finding the search parameter in pages
              var pagesFound = []
              for(let i = 0; i < pagesContent.length; i++){
                //Making case non sensitive
                var filterstrings = [word];
                var regex = new RegExp( filterstrings.join( "|" ), "i");
                var answer = regex.test(pagesContent[i])
                if(answer) pagesFound.push(i+1)
              }

              
              //Saving files names and paths
              if(pagesFound.length > 0){
                var name = file.Key.split("/")
                var body = {
                  file: name[name.length-1],
                  path:  `https://mpa-repository.s3.us-east-2.amazonaws.com/${file.Key}`, 
                  pages: pagesFound
                }
                resolve(body)
              }else{
                console.log(`El texto no fue encontrado`)
                reject(new Error({message: `El texto no fue encontrado`}))
              }
          })
        }
    });

  })
};

//Nesting files directories
function getFilesInDirectory(dir, ext) {

  let files = [];

  const listAllKeys = (params, out = []) => new Promise((resolve, reject) => {
    s3.listObjectsV2(params).promise()
      .then(({Contents, IsTruncated, NextContinuationToken}) => {
        out.push(...Contents);
        !IsTruncated ? resolve(out) : resolve(listAllKeys(Object.assign(params, {ContinuationToken: NextContinuationToken}), out));
      })
      .catch(reject);
  });

  listAllKeys({Bucket: 'mpa-repository'}, files)
  .then((response)=>{
    files = response.map(element => element.Key)
  })
  .catch(console.log);

  return files;
}



