'use strict';
var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var bcrypt = require('bcryptjs');

var Schema = mongoose.Schema;

var clientSchema = new Schema({
    name: {
        type: String,
        required: 'El nombre es obligatorio',
        trim: true,
    },
    mainFolder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder'
    },
    createdAt:{ 
        type: Date,
        default: Date.now
    },
    
});

clientSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Client', clientSchema);