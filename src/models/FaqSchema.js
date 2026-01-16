const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    questions: [
        {
            question: String,
            answer: String,
            image: String // URL of the image
        }
    ]
});

module.exports = mongoose.model('FAQ', faqSchema);
