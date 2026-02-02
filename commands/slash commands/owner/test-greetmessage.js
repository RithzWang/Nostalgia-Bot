const { 
    SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
    TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, 
    SectionBuilder, ButtonBuilder, ButtonStyle 
} = require('discord.js');
const TrackedServer = require('../../../src/models/TrackedServerSchema');

// 🔒 OWNER CONFIGURATION
const OWNER_ID = '837741275603009626';
const MAIN_SERVER_INVITE = 'https://discord.gg/Sra726wPJs'; 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-greet')
        .setDescription('Simulate the V2 welcome message (No Container)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: '⛔ Owner Only', flags: MessageFlags.Ephemeral });

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const config = await TrackedServer.findOne({ guildId: interaction.guild.id });
            if (!config || !config.welcomeChannelId) return interaction.editReply("❌ No welcome channel set.");
            
            const channel = interaction.guild.channels.cache.get(config.welcomeChannelId);
            if (!channel) return interaction.editReply("❌ Channel not found.");

            // 🧪 SIMULATE UNSAFE MEMBER COMPONENTS
            const components = [
                new TextDisplayBuilder().setContent(`${interaction.user}, Welcome to **${interaction.guild.name}** server!`),
                
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),

                new SectionBuilder()
                    .setButtonAccessory(
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
            ];

            await channel.send({ 
                components: components, 
                flags: [MessageFlags.IsComponentsV2] 
            });

            await interaction.editReply("✅ Sent V2 Test Message (No Container).");

        } catch (e) {
            console.error(e);
            await interaction.editReply(`❌ Error: ${e.message}`);
        }
    }
};
