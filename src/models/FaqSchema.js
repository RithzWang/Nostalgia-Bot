const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    questions: [
        {
            question: { type: String, required: true },
            answer: { type: String, required: true },
            image: { type: String, default: null } // Added image field
        }
    ]
});

module.exports = mongoose.model('FAQ', faqSchema);
