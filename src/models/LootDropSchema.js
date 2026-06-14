const { Schema, model } = require('mongoose');

const guildConfigSchema = new Schema({
    guildId: { type: String, required: true },
    lootChannelId: { type: String, required: true },
    dailyClaimLimit: { type: Number, default: 0 } // 0 means unlimited by default
});

const lootDropSchema = new Schema({
    messageId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true },
    type: { type: String, enum: ['link', 'role'], required: true },
    status: { type: String, default: 'active' }, 
    lootName: { type: String }, 
    rolePrizeId: { type: String }, 
    prizes: { type: Array, default: [] }, 
    maxAmount: { type: Number },
    claimedCount: { type: Number, default: 0 },
    claimedUsers: { type: Array, default: [] },
    expireTime: { type: Number }, 
    specialRole: { type: String },
    supporterId: { type: String }
});

const userLootTrackingSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    lastLinkClaimDate: { type: String },
    claimsToday: { type: Number, default: 0 } // Tracks how many claims made today
});

module.exports = {
    GuildConfig: model('GuildConfig', guildConfigSchema),
    LootDrop: model('LootDrop', lootDropSchema),
    UserLootTracking: model('UserLootTracking', userLootTrackingSchema)
};
