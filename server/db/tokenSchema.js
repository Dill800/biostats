const mongoose = require('mongoose');

const collectionName = 'tokens'

const tokenSchema = new mongoose.Schema({
    type: {type: String, required: true},
    value: {type: String, required: true}
});

var Token = mongoose.model(collectionName, tokenSchema);
module.exports = Token;