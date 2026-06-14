const { Schema, model } = require('mongoose');

const guildConfigSchema = new Schema({
    guildId: { type: String, required: true },
    lootChannelId: { type: String, required: true }
});

const lootDropSchema = new Schema({
    messageId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true },
    type: { type: String, enum: ['link', 'role'], required: true },
    status: { type: String, default: 'active' }, // 'active' or 'closed'
    lootName: { type: String }, // For link drops
    rolePrizeId: { type: String }, // For role drops
    prizes: { type: Array, default: [] }, // Array of strings (links)
    maxAmount: { type: Number },
    claimedCount: { type: Number, default: 0 },
    claimedUsers: { type: Array, default: [] },
    expireTime: { type: Number }, // Unix timestamp in milliseconds
    specialRole: { type: String },
    supporterId: { type: String }
});

module.exports = {
    GuildConfig: model('GuildConfig', guildConfigSchema),
    LootDrop: model('LootDrop', lootDropSchema)
};
