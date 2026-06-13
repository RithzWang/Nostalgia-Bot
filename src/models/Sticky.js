const mongoose = require('mongoose');

const stickySchema = new mongoose.Schema({
    channelId: { type: String, required: true, unique: true }, // The channel ID
    content: { type: String, required: true }, // The text/message to stick
    lastMessageId: { type: String, default: null } // The ID of the bot's last message (to delete it)
});

module.exports = mongoose.model('Sticky', stickySchema);
