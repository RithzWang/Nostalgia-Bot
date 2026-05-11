const mongoose = require('mongoose');

const serverStatsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: String,
    messageId: String,
    inviteLink: String, // Optional
    tagEnabled: { type: Boolean, default: false },
    tagText: String,
    tagRoleId: String
});

module.exports = mongoose.model('ServerStatsConfig', serverStatsSchema);
