const mongoose = require('mongoose');

const serverStatsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: String,
    messageId: String,
    inviteLink: String,
    tagEnabled: { type: Boolean, default: false },
    tagText: String,
    tagRoleId: String,
    tagNotifyChannelId: String,
    tagAdopters: { type: [String], default: [] },
    tagNotifyAdopt: { type: Boolean, default: true },   // ✅ Added Adopt Toggle
    tagNotifyRemove: { type: Boolean, default: false }  // ✅ Added Remove Toggle
});

module.exports = mongoose.model('ServerStatsConfig', serverStatsSchema);
