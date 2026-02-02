const { Events } = require('discord.js');
const TrackedServer = require('../src/models/TrackedServerSchema');

// 🔒 CONFIGURATION
const MAIN_GUILD_ID = '1456197054782111756';
const MAIN_SERVER_INVITE = 'https://discord.gg/Sra726wPJs'; // 👈 Replace with your real link

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        if (member.user.bot) return;

        try {
            // 1. Check Database for Welcome Channel
            const serverConfig = await TrackedServer.findOne({ guildId: member.guild.id });
            if (!serverConfig || !serverConfig.welcomeChannelId) return;

            const welcomeChannel = member.guild.channels.cache.get(serverConfig.welcomeChannelId);
            if (!welcomeChannel) return;

            // 2. Check if user is in Main Server
            const mainGuild = member.client.guilds.cache.get(MAIN_GUILD_ID);
            let isInMain = false;
            
            if (mainGuild) {
                try {
                    await mainGuild.members.fetch(member.id);
                    isInMain = true;
                } catch (e) {
                    isInMain = false;
                }
            }

            // 3. Send Message (Standard Text)
            if (isInMain) {
                // ✅ SAFE USER
                await welcomeChannel.send({
                    content: `${member}, Welcome to **${member.guild.name}** server`
                });
            } else {
                // ⚠️ UNSAFE USER (Warn + Link)
                await welcomeChannel.send({
                    content: `${member}, Welcome to **${member.guild.name}** server\n\nIt seems like you are **__not__** in our **[Main A2-Q](${MAIN_SERVER_INVITE})** server yet.\nYou have **10 minutes** to join, or you will be **kicked**.`
                });
            }

        } catch (error) {
            console.error(`[Welcome Error] ${error.message}`);
        }
    }
};
