const mongoose = require('mongoose');

const TrackedServerSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    inviteLink: { type: String, default: null },
    tagText: { type: String, default: null },
    roleId: { type: String, default: null },
    
    // 👇 NEW FIELDS
    welcomeChannelId: { type: String, default: null },
    warnChannelId: { type: String, default: null } // Stores the specific warn channel
});

module.exports = mongoose.model('TrackedServer', TrackedServerSchema);
