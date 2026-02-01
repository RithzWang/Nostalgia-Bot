const mongoose = require('mongoose');

const TrackedServerSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    inviteLink: { type: String, default: null },
    tagText: { type: String, default: null },
    
    // 👇 TWO ROLES NOW
    roleId: { type: String, default: null },       // Role in MAIN Server
    localRoleId: { type: String, default: null },  // Role in TARGET (ID) Server
    
    welcomeChannelId: { type: String, default: null },
    warnChannelId: { type: String, default: null },
    addedBy: { type: String, default: null }
});

module.exports = mongoose.model('TrackedServer', TrackedServerSchema);
