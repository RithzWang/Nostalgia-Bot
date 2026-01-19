const mongoose = require('mongoose');

const trackedServerSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true }, // The ID of the server (e.g. 1456...)
    displayName: { type: String, required: true },           // "A2-Q Qahtani"
    tagText: { type: String, default: '' },                  // "A2-Q" (Text to check in username)
    tagEmojis: { type: String, default: '' },                // "<:emoji1:..> <:emoji2:..>"
    roleId: { type: String, default: '' },                   // The Role ID to give to tagged users
    inviteLink: { type: String, default: '' },               // "https://discord.gg/..."
    addedBy: { type: String }                                // Who added this server
});

module.exports = mongoose.model('TrackedServer', trackedServerSchema);
