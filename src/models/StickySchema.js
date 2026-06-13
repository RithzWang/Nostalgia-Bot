const { Schema, model } = require('mongoose');

const stickySchema = new Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    content: { type: String, required: false },
    lastMessageId: { type: String, required: false },
    isTemplate: { type: Boolean, default: false }, // If true, uses an embed format
    title: { type: String, required: false }
});

module.exports = model('Sticky', stickySchema);
