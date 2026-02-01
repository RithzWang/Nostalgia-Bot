const mongoose = require('mongoose');

const TrackedServerSchema = new mongoose.Schema({
    // Core Identity
    guildId: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    
    // Dashboard Stats Info
    inviteLink: { type: String, default: null },
    tagText: { type: String, default: null },
    roleId: { type: String, default: null }, // Main Server Role (Still needed for stats)
    
    // 👇 Local Server Settings (Managed by /tag-welcome)
    welcomeChannelId: { type: String, default: null },
    
    // 🗑️ DELETED: warnChannelId (No more security alerts)
    // 🗑️ DELETED: localRoleId (No more auto-role giving)
    
    addedBy: { type: String, default: null }
});

module.exports = mongoose.model('TrackedServer', TrackedServerSchema);
