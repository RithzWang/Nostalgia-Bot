const mongoose = require('mongoose');

const TagPartnerSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    forumChannelId: { type: String, default: null }
});

module.exports = mongoose.model('TagPartner', TagPartnerSchema);
