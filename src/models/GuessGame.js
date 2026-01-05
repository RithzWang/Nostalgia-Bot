const mongoose = require('mongoose');

const guessGameSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    currentWord: { type: String, default: null }, 
    displayWord: { type: String, default: null } 
});

module.exports = mongoose.model('GuessGame', guessGameSchema);
