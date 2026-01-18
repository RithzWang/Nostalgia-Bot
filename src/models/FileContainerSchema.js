const mongoose = require('mongoose');

const FileContainerSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true, unique: true }, // Unique because we look up by message ID
    title: { type: String, required: true },
    files: [
        {
            name: { type: String, required: true }, // The display name
            url: { type: String, required: true },  // The direct link to the file
            filename: { type: String }              // The actual filename (e.g. note.pdf)
        }
    ]
});

module.exports = mongoose.model('FileContainer', FileContainerSchema);
