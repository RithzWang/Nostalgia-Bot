// File Location: ./models/NitroConfig.js
const mongoose = require('mongoose');

const nitroConfigSchema = new mongoose.Schema({
    // The ID of the Discord server
    guildId: { type: String, required: true },
    
    // The ID of the role to give users who HAVE Nitro
    withNitroRoleId: { type: String, required: true },
    
    // The ID of the role to give users who DO NOT have Nitro
    noNitroRoleId: { type: String, required: true }
});

module.exports = mongoose.model('NitroConfig', nitroConfigSchema);
