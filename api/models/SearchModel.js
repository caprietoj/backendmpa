'use strict';
var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var bcrypt = require('bcryptjs');

var Schema = mongoose.Schema;

var SearchSchema = new Schema({
    word: {
        type: String,
        trim: true,
    },
    results: {
        type: [Object],
        default: []
    },
    executedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
    },
    createdAt:{ 
        type: Date,
        default: Date.now
    },
    
});

SearchSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Search', SearchSchema);