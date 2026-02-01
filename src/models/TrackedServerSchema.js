const mongoose = require('mongoose');

const TrackedServerSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    inviteLink: { type: String, default: null },
    tagText: { type: String, default: null },
    
    // Main Server Role (The role tracked globally)
    roleId: { type: String, default: null }, 
    
    // 👇 Local Server Settings (Managed by /tag-hello)
    localRoleId: { type: String, default: null }, 
    welcomeChannelId: { type: String, default: null },
    
    // 🗑️ REMOVED: warnChannelId (Since you don't want alerts anymore)
    
    addedBy: { type: String, default: null }
});

module.exports = mongoose.model('TrackedServer', TrackedServerSchema);
