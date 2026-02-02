const { 
    Events, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    SeparatorBuilder, 
    SeparatorSpacingSize, 
    SectionBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags 
} = require('discord.js');
const TrackedServer = require('../src/models/TrackedServerSchema');

// 🔒 CONFIGURATION
const MAIN_GUILD_ID = '1456197054782111756';
const MAIN_SERVER_INVITE = 'https://discord.gg/Sra726wPJs'; // 👈 Replace with real link

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        if (member.user.bot) return;

        try {
            // 1. Check Database
            const serverConfig = await TrackedServer.findOne({ guildId: member.guild.id });
            if (!serverConfig || !serverConfig.welcomeChannelId) return;

            const welcomeChannel = member.guild.channels.cache.get(serverConfig.welcomeChannelId);
            if (!welcomeChannel) return;

            // 2. Check Main Hub Membership
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

            // 3. Build the V2 Components
            const container = new ContainerBuilder();

            if (isInMain) {
                // ✅ SCENARIO A: Already in Main Server
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${member}, Welcome to **${member.guild.name}** server!`)
                );
            } else {
                // ⚠️ SCENARIO B: Not in Main Server (Warning + Button)
                
                // 1. The Welcome Text
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${member}, Welcome to **${member.guild.name}** server!`)
                );

                // 2. The Divider
                container.addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                );

                // 3. The Section (Warning Text + Button)
                container.addSectionComponents(
                    new SectionBuilder()
                        .setAccessory(
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Link)
                                .setLabel("A2-Q Server")
                                .setURL(MAIN_SERVER_INVITE)
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `It seems like you are **__not__** in our **[Main A2-Q](${MAIN_SERVER_INVITE})** server yet.\n` +
                                `You have **10 minutes** to join, otherwise you will be **kicked**.`
                            )
                        )
                );
            }

            // 4. Send with V2 Flag
            await welcomeChannel.send({ 
                components: [container], 
                flags: [MessageFlags.IsComponentsV2] 
            });

        } catch (error) {
            console.error(`[Welcome Error] ${error.message}`);
        }
    }
};
