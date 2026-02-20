const mongoose = require('mongoose');

const panelSchema = new mongoose.Schema({
    guildId: String,
    channelId: String,
    messageId: String
});

const serverSchema = new mongoose.Schema({
    serverId: String, // The ID of the listed server
    name: String,
    inviteLink: String,
    tagText: String, // Optional
    tagRoleID: String, // Role in Main Server
    
    // ✅ NEW: Added the fields for the tag-user-role feature
    satelliteRoleEnabled: { type: Boolean, default: false },
    satelliteRoleId: String, 
    
    addedAt: { type: Date, default: Date.now }
});

const greetSchema = new mongoose.Schema({
    guildId: String, // The server where greeting happens
    channelId: String
});

module.exports = {
    Panel: mongoose.model('QabilatanPanel', panelSchema),
    ServerList: mongoose.model('QabilatanList', serverSchema),
    GreetConfig: mongoose.model('QabilatanGreet', greetSchema)
};
