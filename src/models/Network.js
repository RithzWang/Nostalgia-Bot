const mongoose = require('mongoose');

// Database for the list of servers and their basic details
const ServerListSchema = new mongoose.Schema({
    serverId: { type: String, required: true, unique: true },
    inviteLink: { type: String },
    tagText: { type: String },
    tagRoleID: { type: String },
    name: { type: String }
});

// Database for the Welcome/Greet channel configuration
const GreetConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true }
});

module.exports = {
    ServerList: mongoose.model('ServerList', ServerListSchema),
    GreetConfig: mongoose.model('GreetConfig', GreetConfigSchema)
};
