const mongoose = require('mongoose');

const TrackedServerSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    
    // Stats & Dashboard Info
    inviteLink: { type: String, default: null },
    tagText: { type: String, default: null },
    roleId: { type: String, default: null }, 
    
    // 👇 The Only Setting You Need Now
    welcomeChannelId: { type: String, default: null },
    
    addedBy: { type: String, default: null }
});

module.exports = mongoose.model('TrackedServer', TrackedServerSchema);
