const mongoose = require('mongoose');

const guessGameSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    currentWord: { type: String, default: null }, // The real word (e.g., "APPLE")
    displayWord: { type: String, default: null }  // The hidden version (e.g., "A_P_LE")
});

module.exports = mongoose.model('GuessGame', guessGameSchema);
