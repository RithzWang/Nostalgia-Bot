const mongoose = require('mongoose');

const TrackedServerSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    inviteLink: { type: String, default: null },
    tagText: { type: String, default: null },
    roleId: { type: String, default: null }, // Main Server Role
    
    // 👇 Saved by /tag-hello command
    localRoleId: { type: String, default: null }, 
    welcomeChannelId: { type: String, default: null },
    warnChannelId: { type: String, default: null },
    
    addedBy: { type: String, default: null }
});

module.exports = mongoose.model('TrackedServer', TrackedServerSchema);
