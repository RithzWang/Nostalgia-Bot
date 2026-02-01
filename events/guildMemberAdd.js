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
const MAIN_SERVER_INVITE = 'https://discord.gg/Sra726wPJs'; // 👈 Put your link here

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        if (member.user.bot) return;

        try {
            // 1. Check if this server has a Welcome Channel set
            const serverConfig = await TrackedServer.findOne({ guildId: member.guild.id });
            if (!serverConfig || !serverConfig.welcomeChannelId) return;

            const welcomeChannel = member.guild.channels.cache.get(serverConfig.welcomeChannelId);
            if (!welcomeChannel) return;

            // 2. Check if User is in Main Server
            const mainGuild = member.client.guilds.cache.get(MAIN_GUILD_ID);
            let isInMain = false;
            
            if (mainGuild) {
                try {
                    // Try to fetch specific member to be sure
                    await mainGuild.members.fetch(member.id);
                    isInMain = true;
                } catch (e) {
                    isInMain = false;
                }
            }

            // 3. Build the Container
            const container = new ContainerBuilder();

            // A. Standard Welcome Header
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## 👋 Welcome to ${member.guild.name}`)
            );
            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            );

            if (isInMain) {
                // ✅ HAPPY PATH: User is in Main Server
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `Hello ${member}! We are glad to have you here.\n` +
                        `Enjoy your stay and check out the channels!`
                    )
                );
            } else {
                // ⚠️ WARNING PATH: User is NOT in Main Server
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `Hello ${member}.\n\n` +
                        `### ⚠️ Security Alert\n` +
                        `We noticed you are **not** in our Main Hub Server.\n` +
                        `To fully participate and avoid removal, please join us below.`
                    )
                );
                container.addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
                );
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`🔗 **[Click here to Join Main Server](${MAIN_SERVER_INVITE})**`)
                );
            }

            // 4. Send Message
            await welcomeChannel.send({ 
                content: `${member}`, // Ping the user
                components: [container], 
                flags: [MessageFlags.IsComponentsV2] 
            });

        } catch (error) {
            console.error(`[Welcome Error] ${error.message}`);
        }
    }
};
