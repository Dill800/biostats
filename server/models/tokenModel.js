const mongoose = require('mongoose');

const collectionName = 'tokens'

const tokenModel = new mongoose.Schema({
    type: {type: String, required: true},
    value: {type: String, required: true}
});

var Token = mongoose.model(collectionName, tokenModel);
module.exports = Token;