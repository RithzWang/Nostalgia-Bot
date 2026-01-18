const mongoose = require('mongoose');

const EmojiChannelSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true }
});

module.exports = mongoose.model('EmojiChannel', EmojiChannelSchema);
