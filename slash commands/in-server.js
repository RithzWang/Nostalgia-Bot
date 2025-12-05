const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// ⚠️ REPLACE THIS WITH YOUR USER ID ⚠️
const OWNER_ID = '837741275603009626'; 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('in-server')
        .setDescription('Manage the servers the bot is in.')
        // Subcommand 1: List Servers
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lists all servers the bot is currently in.')
        )
        // Subcommand 2: Leave Server
        .addSubcommand(subcommand =>
            subcommand
                .setName('leave')
                .setDescription('⚠️ Owner Only: Force the bot to leave a server.')
                .addStringOption(option =>
                    option.setName('server_id')
                        .setDescription('The ID of the server to leave')
                        .setRequired(true)
                )
        )
        // Only allow people with Manage Server to see this command by default
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'list') {
            await handleList(interaction);
        } else if (subcommand === 'leave') {
            await handleLeave(interaction);
        }
    },
};

// --- Helper Functions ---

async function handleList(interaction) {
    await interaction.deferReply({ ephemeral: true }); // Only you can see this list

    const guilds = interaction.client.guilds.cache;
    
    // Sort by member count (largest first)
    const sortedGuilds = guilds.sort((a, b) => b.memberCount - a.memberCount);

    // Create a simple list (Discord has a 4096 char limit for descriptions, so we limit to top 20 for safety)
    const guildList = sortedGuilds.first(20).map((g, index) => {
        return `**${index + 1}. ${g.name}**\n🆔 \`${g.id}\` | 👤 ${g.memberCount} members`;
    }).join('\n\n');

    const embed = new EmbedBuilder()
        .setTitle(`🛡️ Server List (${guilds.size} total)`)
        .setDescription(guildList || 'No servers found.')
        .setColor('#5865F2')
        .setFooter({ text: guilds.size > 20 ? 'Showing top 20 servers by size.' : 'End of list.' });

    await interaction.editReply({ embeds: [embed] });
}

async function handleLeave(interaction) {
    // 1. Security Check: Only allow the Bot Owner
    if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ 
            content: '⛔ **Access Denied:** Only the bot owner can use this command.', 
            ephemeral: true 
        });
    }

    const guildId = interaction.options.getString('server_id');
    const guild = interaction.client.guilds.cache.get(guildId);

    if (!guild) {
        return interaction.reply({ 
            content: `❌ I could not find a server with ID: \`${guildId}\`. (I might not be in it, or the ID is wrong).`, 
            ephemeral: true 
        });
    }

    try {
        await guild.leave();
        return interaction.reply({ 
            content: `✅ Successfully left **${guild.name}** (ID: \`${guildId}\`).`, 
            ephemeral: true 
        });
    } catch (error) {
        console.error(error);
        return interaction.reply({ 
            content: `❌ Failed to leave server: ${error.message}`, 
            ephemeral: true 
        });
    }
}
