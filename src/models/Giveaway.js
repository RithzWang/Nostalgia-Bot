const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    hostId: { type: String, required: true },
    prize: { type: String, required: true },
    description: { type: String, required: false }, // <--- ADDED THIS
    winnersCount: { type: Number, required: true },
    startTimestamp: { type: Number, required: true },
    endTimestamp: { type: Number, required: true },
    ended: { type: Boolean, default: false },
    participants: { type: [String], default: [] } 
});

module.exports = mongoose.model('Giveaway', giveawaySchema);
