var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var cors = require('cors');
var app = express();
var SearchRoutes = require('./routes/SearchRoutes');
var UserRoutes = require('./routes/UserRoutes');
var ClientRoutes = require('./routes/ClientRoutes');
var FolderRoutes = require('./routes/FolderRoutes');
var UserController = require('./controllers/UserController');
var path = require('path');
var cron = require('node-cron');
const SearchController = require('./controllers/SearchController');

//Connection to Database
mongoose.connect("mongodb://myUserAdmin:2m0p2a0@digitalrepository-shard-00-00.0geve.mongodb.net:27017,digitalrepository-shard-00-01.0geve.mongodb.net:27017,digitalrepository-shard-00-02.0geve.mongodb.net:27017/digitalrepository?ssl=true&replicaSet=atlas-3tqa6r-shard-0&authSource=admin&retryWrites=true&w=majority", { useNewUrlParser: true })
//mongoose.connect('mongodb://myUserAdmin:pda2020!@localhost:27017/punitech?authSource=admin', { useNewUrlParser: true })

app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({limit: '500mb', extended: true }));
app.use(bodyParser.json({ limit: '500mb' }));

//Routes
app.use('/api/user', UserRoutes);
app.use('/api/search', SearchRoutes);
app.use('/api/client', ClientRoutes);
app.use('/api/folder', FolderRoutes);

//Files to read
app.use(express.static(path.join(__dirname, '/../public')));
app.use('/public', express.static('public'))

//Cronjobs
cron.schedule('*/1 * * * *', function () {
    //SearchController.updateSearches()
    //UserController.mails()
})

cron.schedule('30 0,12 * * *', function () {
    //SearchController.updateSearches()
    //UserController.mails()
})



module.exports = app;
