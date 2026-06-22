const { Schema, model } = require('mongoose');

const scheduledMessageSchema = new Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    type: { type: String, required: true }, // 'send', 'reply', or 'container'
    content: { type: String, required: true },
    mention: { type: Boolean, default: true },
    image: { type: String, required: false },
    replyMessageId: { type: String, required: false }, // Only needed for replies
    sendAt: { type: Date, required: true } // The exact time it should be sent
});

module.exports = model('ScheduledMessage', scheduledMessageSchema);
