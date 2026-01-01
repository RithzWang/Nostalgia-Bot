const mongoose = require('mongoose');

const LeaderboardSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, default: null },
    messageId: { type: String, default: null },
    enabled: { type: Boolean, default: false },
    // List of people in the contest
    participants: [{
        userId: { type: String, required: true },
        votes: { type: Number, default: 0 }
    }],
    // List of people who have voted (to prevent double voting)
    voters: [{ type: String }] 
});

module.exports = mongoose.model('Leaderboard', LeaderboardSchema);
