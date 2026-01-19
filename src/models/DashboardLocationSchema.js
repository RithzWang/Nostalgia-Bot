const mongoose = require('mongoose');

const dashboardLocationSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true }
});

module.exports = mongoose.model('DashboardLocation', dashboardLocationSchema);
