'use strict';
var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var bcrypt = require('bcryptjs');

var Schema = mongoose.Schema;

var actionSchema = new Schema({
    name: {
        type: String,
        required: 'El nombre es obligatorio',
    },
    type: String,
    code: String,
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt:{ 
        type: Date,
        default: Date.now
    },
    file: Object,
    word: String,
    
});

actionSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Action', actionSchema);