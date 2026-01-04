const mongoose = require('mongoose');

const ChatBotSchema = new mongoose.Schema({
    GuildID: { type: String, required: true },
    ChannelID: { type: String, required: true }
});

module.exports = mongoose.model('ChatBot', ChatBotSchema);
