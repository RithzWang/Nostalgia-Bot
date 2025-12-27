const mongoose = require('mongoose');

const applicationConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    appChannelId: { type: String, default: null },
    logChannelId: { type: String, default: null },
    messageId: { type: String, default: null }, // To edit the button later
    enabled: { type: Boolean, default: false }
});

module.exports = mongoose.model('ApplicationConfig', applicationConfigSchema);
