const mongoose = require('mongoose');

const serverStatsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: String,
    messageId: String,
    inviteLink: String, 
    tagEnabled: { type: Boolean, default: false },
    tagText: String,
    tagRoleId: String,
    tagNotifyChannelId: String // ✅ Added this so the bot actually saves the channel!
});

module.exports = mongoose.model('ServerStatsConfig', serverStatsSchema);
