const mongoose = require('mongoose');

const GTSHubSchema = new mongoose.Schema({
    mainServerId: { type: String, required: true, unique: true },
    dashboardChannelId: { type: String, default: null },
    dashboardMessageId: { type: String, default: null },
    defaultTagRole: { type: String, default: null },
    alertChannelId: { type: String, default: null }, // ✅ Added Alert Channel Tracker
});


const GTSServerSchema = new mongoose.Schema({
    serverId: { type: String, required: true, unique: true },
    inviteLink: { type: String, default: null },
    tagText: { type: String, default: null },
    mainTagRole: { type: String, default: null },
    mainLogChannel: { type: String, default: null },
    localTagRole: { type: String, default: null },
    localLogChannel: { type: String, default: null },
    greetChannel: { type: String, default: null },
    specialGuestRole: { type: String, default: null },
    // ✅ NEW: Tracks local dashboard placements within individual satellite servers
    localDashboardChannelId: { type: String, default: null },
    localDashboardMessageId: { type: String, default: null }
});

module.exports = {
    GTSHub: mongoose.model('GTSHub', GTSHubSchema),
    GTSServer: mongoose.model('GTSServer', GTSServerSchema)
};
