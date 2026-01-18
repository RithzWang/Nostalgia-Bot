const mongoose = require('mongoose');

const FileContainerSchema = new mongoose.Schema({
    // The ID of the server
    guildId: { 
        type: String, 
        required: true 
    },
    // The channel where the container message exists
    channelId: { 
        type: String, 
        required: true 
    },
    // The ID of the bot's message (Primary lookup key)
    messageId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    // The Main Header Title
    title: { 
        type: String, 
        required: true 
    },
    // Array of files stored in this container
    files: [
        {
            name: { type: String, required: true },     // Display Name (e.g. "Chapter 1")
            url: { type: String, required: true },      // The Discord CDN URL
            filename: { type: String, required: true }  // The actual filename (e.g. "guide.pdf")
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('FileContainer', FileContainerSchema);
