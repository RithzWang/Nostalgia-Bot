const TrackedServer = require('../src/models/TrackedServerSchema');

// 🔒 CONFIG
const MAIN_GUILD_ID = '1456197054782111756'; 
const MAIN_SERVER_INVITE = 'https://discord.gg/3pJPe9QUcs'; // ⚠️ REPLACE THIS

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        // 1. Check if this server has a configured Welcome Channel
        const serverConfig = await TrackedServer.findOne({ guildId: member.guild.id });
        if (!serverConfig || !serverConfig.welcomeChannelId) return;

        const welcomeChannel = member.guild.channels.cache.get(serverConfig.welcomeChannelId);
        if (!welcomeChannel) return;

        // 2. Check if they are in the Main Hub Server
        const mainGuild = member.client.guilds.cache.get(MAIN_GUILD_ID);
        let isInMain = false;

        if (mainGuild) {
            try {
                // Force fetch to be absolutely sure
                await mainGuild.members.fetch(member.id);
                isInMain = true;
            } catch (e) {
                isInMain = false;
            }
        }

        // 3. Construct the Message
        let messageContent = '';

        if (isInMain) {
            // ✅ SCENARIO A: Already in Main Server
            messageContent = `${member}, Welcome to **${member.guild.name}** server!`;
        } else {
            // ❌ SCENARIO B: Not in Main Server (Warning)
            messageContent = `${member}, Welcome to **${member.guild.name}** server!\n\n` +
                             `-# It seems like you have not joined our [main server](https://discord.gg/3pJPe9QUcs)! Please join within 10 minutes or you will get kicked from **${member.guild.name}**`;
        }

        // 4. Send Message
        try {
            await welcomeChannel.send(messageContent);
        } catch (e) {
            console.error(`[Welcome] Failed to send message in ${member.guild.name}:`, e.message);
        }
    }
};
