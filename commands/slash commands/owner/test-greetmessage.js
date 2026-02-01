const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');
const TrackedServer = require('../../../src/models/TrackedServerSchema');

// 🔒 OWNER CONFIGURATION
const OWNER_ID = '837741275603009626';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-greet')
        .setDescription('Simulate a welcome message to test if it works')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: '⛔ Owner Only', flags: MessageFlags.Ephemeral });

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // 🔍 STEP 1: CHECK DATABASE
            const config = await TrackedServer.findOne({ guildId: interaction.guild.id });
            
            if (!config) {
                return interaction.editReply(`❌ **Database Error:** No configuration found for this server. Run \`/our-servers greetmessage\` first.`);
            }

            if (!config.welcomeChannelId) {
                return interaction.editReply(`❌ **Configuration Error:** You have not set a Welcome Channel yet. Run \`/our-servers greetmessage\` to set it.`);
            }

            // 🔍 STEP 2: CHECK CHANNEL ACCESS
            const channel = interaction.guild.channels.cache.get(config.welcomeChannelId);
            if (!channel) {
                return interaction.editReply(`❌ **Channel Error:** The saved channel ID (\`${config.welcomeChannelId}\`) no longer exists in this server.`);
            }

            // Check if bot can talk there
            const perms = channel.permissionsFor(interaction.guild.members.me);
            if (!perms.has('ViewChannel') || !perms.has('SendMessages')) {
                return interaction.editReply(`❌ **Permission Error:** I do not have permission to View or Send Messages in ${channel}. Check my role settings.`);
            }

            // 🔍 STEP 3: ATTEMPT TO SEND
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🧪 Test Successful`))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`If you can see this, the **Welcome System** is working!\n\n**Channel:** ${channel}`));

            await channel.send({ 
                content: `👋 **Test Welcome for ${interaction.user}**`, 
                components: [container],
                flags: [MessageFlags.IsComponentsV2]
            });

            await interaction.editReply(`✅ **Sent!** Check ${channel}. If the message appeared there, your Logic/DB is fine.`);

        } catch (e) {
            console.error(e);
            await interaction.editReply(`❌ **Critical Error:** ${e.message}`);
        }
    }
};
