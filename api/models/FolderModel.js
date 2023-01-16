'use strict';
var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var bcrypt = require('bcryptjs');

var Schema = mongoose.Schema;

var folderSchema = new Schema({
    name: {
        type: String,
        required: 'El nombre es obligatorio',
        trim: true,
    },
    folders: {
        type: [Object],
        default: []
    },
    files: {
        type: [Object],
        default: []
    },
    parentFolder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder'
    },
    path: String,
    main: {
        type: Boolean,
        default: false
    },
    createdAt:{ 
        type: Date,
        default: Date.now
    },
    
});

folderSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Folder', folderSchema);