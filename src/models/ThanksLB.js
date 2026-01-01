const mongoose = require('mongoose');

const ThanksLBSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, default: null },
    messageId: { type: String, default: null },
    currentPage: { type: Number, default: 1 },
    
    // NEW: Store when the leaderboard started or was last reset
    startDate: { type: Number, default: Date.now }, 

    users: [{
        userId: { type: String, required: true },
        count: { type: Number, default: 0 }
    }],

    usage: [{
        userId: { type: String, required: true },
        thanksUsed: { type: Number, default: 0 },
        lastResetDate: { type: String, default: '' }
    }]
});

module.exports = mongoose.model('ThanksLB', ThanksLBSchema);
