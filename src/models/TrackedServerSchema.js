const mongoose = require('mongoose');

const TrackedServerSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    
    // Stats & Dashboard Info
    inviteLink: { type: String, default: null },
    tagText: { type: String, default: null },
    
    // 1. MAIN SERVER REWARD ROLE (Given in Main Hub)
    roleId: { type: String, default: null }, 
    
    // 2. LOCAL SERVER REWARD ROLE (Given in Satellite Server) 👈 NEW!
    localRoleId: { type: String, default: null },

    // Welcome System
    welcomeChannelId: { type: String, default: null },
    
    addedBy: { type: String, default: null }
});

module.exports = mongoose.model('TrackedServer', TrackedServerSchema);
