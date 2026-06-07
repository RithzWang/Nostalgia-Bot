const mongoose = require('mongoose');

const NetworkConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String }, 
    messageId: { type: String },
    
    // ==========================================
    // NETWORK CONFIGURATION
    // ==========================================
    isMainServer: { type: Boolean, default: false },
    mainServerId: { type: String, default: null }, // Satellites link to this ID
    globalTagRoleId: { type: String, default: null }, // Role applied across the network
    
    // ==========================================
    // GATEKEEPER MODE (AUTO-KICK)
    // ==========================================
    kickIfNoMain: { type: Boolean, default: false } // True = Kick from satellite if not in main
});

module.exports = mongoose.model('NetworkConfig', NetworkConfigSchema);
