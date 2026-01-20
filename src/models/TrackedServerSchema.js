const mongoose = require('mongoose');

const TrackedServerSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    tagText: { type: String, default: '' },
    roleId: { type: String, default: null },
    inviteLink: { type: String, default: '' },
    // 👇 ADD THIS NEW LINE
    welcomeChannelId: { type: String, default: null } 
});

module.exports = mongoose.model('TrackedServer', TrackedServerSchema);
