const mongoose = require('mongoose');

const FileContainerSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true, unique: true }, // The ID of the bot's message
    title: { type: String, required: true }, // The Main Title of the container
    files: [
        {
            name: { type: String, required: true }, // The Display Name (e.g., "Math Notes")
            url: { type: String, required: true },  // The Discord attachment URL
            filename: { type: String }              // The actual filename (e.g., "math.pdf")
        }
    ]
});

module.exports = mongoose.model('FileContainer', FileContainerSchema);
