const { Schema, model } = require('mongoose');

const guildConfigSchema = new Schema({
    guildId: { type: String, required: true },
    lootChannelId: { type: String, required: true },
    dailyClaimLimit: { type: Number, default: 0 } // 0 means unlimited by default
});

const lootDropSchema = new Schema({
    messageId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true },
    status: { type: String, default: 'active' }, 
    lootName: { type: String, required: true }, 
    prizes: { type: [String], default: [] }, 
    maxAmount: { type: Number },
    claimedCount: { type: Number, default: 0 },
    claimedUsers: { type: [String], default: [] },
    expireTime: { type: Number }, 
    specialRole: { type: String },
    sponsorId: { type: String },
    createdAt: { type: Number }
});

const userLootTrackingSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    lastLinkClaimDate: { type: String },
    claimsToday: { type: Number, default: 0 } 
});

module.exports = {
    GuildConfig: model('GuildConfig', guildConfigSchema),
    LootDrop: model('LootDrop', lootDropSchema),
    UserLootTracking: model('UserLootTracking', userLootTrackingSchema)
};
