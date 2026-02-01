const mongoose = require('mongoose');

const TrackedServerSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    inviteLink: { type: String, default: null },
    tagText: { type: String, default: null },
    
    // Global Role
    roleId: { type: String, default: null }, 
    
    // Welcome & Warn Settings
    welcomeChannelId: { type: String, default: null },
    warnChannelId: { type: String, default: null }, // 👈 Added back
    
    // (Optional: keep localRoleId if you still want it, otherwise you can remove it)
    localRoleId: { type: String, default: null },

    addedBy: { type: String, default: null }
});

module.exports = mongoose.model('TrackedServer', TrackedServerSchema);
