const { Events, MessageFlags } = require('discord.js');
const ServerStatsConfig = require('../src/models/ServerStats');
const { buildNotifyPayload } = require('../utils/serverStatsManager');

module.exports = {
    name: Events.UserUpdate,
    async execute(oldUser, newUser, client) {
        if (newUser.bot) return;

        // Check the old identity vs the new identity
        const oldGuildId = oldUser.primaryGuild?.identityGuildId;
        const newGuildId = newUser.primaryGuild?.identityGuildId;

        // If the server tag didn't change, ignore the update
        if (oldGuildId === newGuildId) return;

        // ==========================================
        // 1. INSTANT: TAG ADOPTED
        // ==========================================
        if (newGuildId) {
            const config = await ServerStatsConfig.findOne({ guildId: newGuildId });
            if (config && config.tagEnabled) {
                const guild = client.guilds.cache.get(newGuildId);
                if (guild) {
                    try {
                        const member = await guild.members.fetch(newUser.id);
                        
                        // 1A. Give Role Instantly
                        if (config.tagRoleId && !member.roles.cache.has(config.tagRoleId)) {
                            await member.roles.add(config.tagRoleId).catch(() => {});
                        }

                        // 1B. Send Hype Notification Instantly
                        if (config.tagNotifyChannelId && config.tagNotifyAdopt !== false) {
                            const notifyChannel = guild.channels.cache.get(config.tagNotifyChannelId) || await guild.channels.fetch(config.tagNotifyChannelId).catch(() => null);
                            if (notifyChannel) {
                                let badgeURL = newUser.primaryGuild?.badge ? `https://cdn.discordapp.com/guild-tag-badges/${newGuildId}/${newUser.primaryGuild.badge}.png?size=128` : guild.iconURL({ extension: 'png', size: 128 });
                                
                                notifyChannel.send({ 
                                    components: buildNotifyPayload(newUser.id, 'adopt', badgeURL), 
                                    flags: [MessageFlags.IsComponentsV2] 
                                }).catch(() => {});
                            }
                        }

                        // 1C. Save to Database
                        if (!config.tagAdopters.includes(newUser.id)) {
                            config.tagAdopters.push(newUser.id);
                            await config.save().catch(() => {});
                        }
                    } catch (e) { console.error(e); }
                }
            }
        }

        // ==========================================
        // 2. INSTANT: TAG REMOVED
        // ==========================================
        if (oldGuildId) {
            const config = await ServerStatsConfig.findOne({ guildId: oldGuildId });
            if (config && config.tagEnabled) {
                const guild = client.guilds.cache.get(oldGuildId);
                if (guild) {
                    try {
                        const member = await guild.members.fetch(newUser.id);
                        
                        // 2A. Remove Role Instantly
                        if (config.tagRoleId && member.roles.cache.has(config.tagRoleId)) {
                            await member.roles.remove(config.tagRoleId).catch(() => {});
                        }

                        // 2B. Send Sad Notification Instantly
                        if (config.tagNotifyChannelId && config.tagNotifyRemove === true) {
                            const notifyChannel = guild.channels.cache.get(config.tagNotifyChannelId) || await guild.channels.fetch(config.tagNotifyChannelId).catch(() => null);
                            if (notifyChannel) {
                                let badgeURL = oldUser.primaryGuild?.badge ? `https://cdn.discordapp.com/guild-tag-badges/${oldGuildId}/${oldUser.primaryGuild.badge}.png?size=128` : guild.iconURL({ extension: 'png', size: 128 });
                                
                                notifyChannel.send({ 
                                    components: buildNotifyPayload(newUser.id, 'remove', badgeURL), 
                                    flags: [MessageFlags.IsComponentsV2] 
                                }).catch(() => {});
                            }
                        }

                        // 2C. Remove from Database
                        config.tagAdopters = config.tagAdopters.filter(id => id !== newUser.id);
                        await config.save().catch(() => {});
                    } catch (e) { console.error(e); }
                }
            }
        }
    }
};
