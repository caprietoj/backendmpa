'use strict';
var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var bcrypt = require('bcryptjs');

var Schema = mongoose.Schema;

var userSchema = new Schema({
    name: {
        type: String,
        required: 'El nombre es obligatorio',
    },
    email: String, 
    password: String,
    rol: {
        type: String,
        lowercase: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    pswdToken: String,
    code: String,
    ip: String,
    active: { 
        type: Boolean,
        default: true
    },
    otp: String,


    company: String,
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    clients:{
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Client',
        default: []
    },
    active: { 
        type: Boolean,
        default: true
    },
    
});

userSchema.plugin(mongoosePaginate);

userSchema.pre('save', async function (next) {
  try {
    if (this.password) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(this.password, salt);
      this.password = passwordHash;
    }

    //Format email,
    this.email = this.email.toLowerCase();
    next();
  } catch (error) {
    next(error);
  }
})

userSchema.methods.isValidPassword = async function (newPassword) {
  try {
    return await bcrypt.compare(newPassword, this.password)
  } catch (error) {
    throw new Error(error);
  }
}

module.exports = mongoose.model('User', userSchema);