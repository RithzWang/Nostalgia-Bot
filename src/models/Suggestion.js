const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    messageId: { type: String, required: true },
    authorId: { type: String, required: true },
    content: { type: String, required: true },
    upvoters: { type: [String], default: [] },
    downvoters: { type: [String], default: [] },
    status: { type: String, default: 'Pending' } // Pending, Accepted, Rejected
});

module.exports = mongoose.model('Suggestion', suggestionSchema);
