const { 
    Events, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    SeparatorBuilder, 
    SeparatorSpacingSize, 
    MessageFlags 
} = require('discord.js');
const TrackedServer = require('../src/models/TrackedServerSchema');

// 🔒 CONFIGURATION
const MAIN_GUILD_ID = '1456197054782111756';
const MAIN_SERVER_INVITE = 'https://discord.gg/Sra726wPJs'; // 👈 REPLACE THIS

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        if (member.user.bot) return;

        try {
            // 1. Check database settings
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

            // 3. Build the Message
            const container = new ContainerBuilder();

            // A. Standard Welcome Header
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## 👋 Welcome to ${member.guild.name}`)
            );
            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            );

            if (isInMain) {
                // ✅ SAFE USER
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `Hello ${member}! We are glad to have you here.\n` +
                        `You are verified as a member of our Main Hub.`
                    )
                );
            } else {
                // ⚠️ UNSAFE USER (Warn them here!)
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `Hello ${member}.\n\n` +
                        `### ⚠️ Security Check Failed\n` +
                        `You are **not** in our Main Hub Server.\n` +
                        `**You have 10 minutes to join, or you will be kicked.**`
                    )
                );
                container.addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
                );
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`🔗 **[Click here to Join Main Server](${MAIN_SERVER_INVITE})**`)
                );
            }

            // 4. Send
            await welcomeChannel.send({ 
                content: `${member}`, // Pings them so they see it
                components: [container], 
                flags: [MessageFlags.IsComponentsV2] 
            });

        } catch (error) {
            console.error(`[Welcome Error] ${error.message}`);
        }
    }
};
