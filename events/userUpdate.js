const { Events, MessageFlags } = require('discord.js');
const ServerStatsConfig = require('../src/models/ServerStats');
const { buildNotifyPayload } = require('../utils/serverStatsManager');

module.exports = {
    name: Events.UserUpdate,
    async execute(oldUser, newUser, client) {
        if (newUser.bot) return;

        // Check if their Server Tag (Identity) changed
        const oldGuildId = oldUser.primaryGuild?.identityGuildId;
        const newGuildId = newUser.primaryGuild?.identityGuildId;

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
                        const member = await guild.members.fetch(newUser.id).catch(() => null);
                        if (!member) return;

                        let badgeURL = newUser.primaryGuild?.badge 
                            ? `https://cdn.discordapp.com/guild-tag-badges/${newGuildId}/${newUser.primaryGuild.badge}.png?size=128` 
                            : guild.iconURL({ extension: 'png', size: 128 });

                        // A. Give Role Instantly
                        if (config.tagRoleId && !member.roles.cache.has(config.tagRoleId)) {
                            await member.roles.add(config.tagRoleId).catch(() => {});
                        }

                        // B. Send Hype Notification (4s delay, no ping)
                        if (config.tagNotifyChannelId && config.tagNotifyAdopt !== false) {
                            const notifyChannel = guild.channels.cache.get(config.tagNotifyChannelId) || await guild.channels.fetch(config.tagNotifyChannelId).catch(() => null);
                            if (notifyChannel) {
                                setTimeout(() => {
                                    notifyChannel.send({ 
                                        components: buildNotifyPayload(newUser.id, 'adopt', badgeURL), 
                                        flags: [MessageFlags.IsComponentsV2],
                                        allowedMentions: { parse: [] } 
                                    }).catch(() => {});
                                }, 1000);
                            }
                        }

                        // C. Save to Database
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
                        const member = await guild.members.fetch(newUser.id).catch(() => null);
                        if (!member) return;

                        let badgeURL = oldUser.primaryGuild?.badge 
                            ? `https://cdn.discordapp.com/guild-tag-badges/${oldGuildId}/${oldUser.primaryGuild.badge}.png?size=128` 
                            : guild.iconURL({ extension: 'png', size: 128 });

                        // A. Remove Role Instantly
                        if (config.tagRoleId && member.roles.cache.has(config.tagRoleId)) {
                            await member.roles.remove(config.tagRoleId).catch(() => {});
                        }

                        // B. Send Sad Notification (4s delay, no ping)
                        if (config.tagNotifyChannelId && config.tagNotifyRemove === true) {
                            const notifyChannel = guild.channels.cache.get(config.tagNotifyChannelId) || await guild.channels.fetch(config.tagNotifyChannelId).catch(() => null);
                            if (notifyChannel) {
                                setTimeout(() => {
                                    notifyChannel.send({ 
                                        components: buildNotifyPayload(newUser.id, 'remove', badgeURL), 
                                        flags: [MessageFlags.IsComponentsV2],
                                        allowedMentions: { parse: [] } 
                                    }).catch(() => {});
                                }, 1000);
                            }
                        }

                        // C. Remove from Database
                        config.tagAdopters = config.tagAdopters.filter(id => id !== newUser.id);
                        await config.save().catch(() => {});
                    } catch (e) { console.error(e); }
                }
            }
        }
    }
};
