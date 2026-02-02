const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const TrackedServer = require('../../../src/models/TrackedServerSchema');

// 🔒 OWNER CONFIGURATION
const OWNER_ID = '837741275603009626';
const MAIN_SERVER_INVITE = 'https://discord.gg/Sra726wPJs'; // 👈 Make sure this matches your main file

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-greet')
        .setDescription('Simulate the new text-based welcome message')
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

            // 🔍 STEP 3: SEND TEST (Simulation of "Unsafe" User)
            // We simulate the "Unsafe" message because that is the most important one to check (formatting & links).
            await channel.send({ 
                content: `${interaction.user}, Welcome to **${interaction.guild.name}** server\n\nIt seems like you are **__not__** in our **[Main A2-Q](${MAIN_SERVER_INVITE})** server yet.\nYou have **10 minutes** to join, or you will be **kicked**.`
            });

            await interaction.editReply(`✅ **Sent!** Check ${channel}. I sent the "Warning" version so you can check if the formatting and Invite Link are correct.`);

        } catch (e) {
            console.error(e);
            await interaction.editReply(`❌ **Critical Error:** ${e.message}`);
        }
    }
};
