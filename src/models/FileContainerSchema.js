const mongoose = require('mongoose');

const FileContainerSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true, unique: true }, 
    title: { type: String, required: true },
    files: [
        {
            name: { type: String, required: true }, // Display Name (e.g. "Chapter 1")
            url: { type: String, required: true },  // Discord URL
            filename: { type: String }              // Real Filename (e.g. "math.pdf")
        }
    ]
});

module.exports = mongoose.model('FileContainer', FileContainerSchema);
