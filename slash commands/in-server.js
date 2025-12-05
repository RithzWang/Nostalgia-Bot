const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    PermissionFlagsBits, 
    ComponentType 
} = require('discord.js');

// ⚠️ REPLACE THIS WITH YOUR USER ID ⚠️
const OWNER_ID = '837741275603009626'; 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('in-server')
        .setDescription('Manage the servers the bot is in.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Select multiple servers to leave at once.')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        // 1. Security Check
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ 
                content: '⛔ **Access Denied:** Only the bot owner can use this command.', 
                ephemeral: true 
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'list') {
            await handleMultiLeave(interaction);
        }
    },
};

async function handleMultiLeave(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guilds = interaction.client.guilds.cache;

    // Discord Dropdowns limit: Max 25 options.
    // We get the top 25 servers (sorted by size)
    const topGuilds = guilds
        .sort((a, b) => b.memberCount - a.memberCount)
        .first(25);

    const options = topGuilds.map(guild => ({
        label: guild.name,
        description: `${guild.memberCount} members | ID: ${guild.id}`,
        value: guild.id,
    }));

    // 2. Create Multi-Select Menu
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('server_leave_menu')
        .setPlaceholder('🔻 Select servers to leave (Multi-select enabled)')
        .setMinValues(1) // Must pick at least 1
        .setMaxValues(options.length) // Can pick all of them
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
        .setTitle(`🛡️ Server Manager (${guilds.size} Servers)`)
        .setDescription('Select the servers you want the bot to leave.\n**You can select multiple servers at once.**')
        .setColor('#5865F2');

    const message = await interaction.editReply({ 
        embeds: [embed], 
        components: [row] 
    });

    // 3. Collector
    const collector = message.createMessageComponentCollector({ 
        componentType: ComponentType.StringSelect, 
        time: 60000 
    });

    collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) return;

        // Get ALL selected IDs (It's an array now)
        const selectedIds = i.values;
        
        // Update message immediately to prevent re-clicking
        await i.update({ 
            content: `⏳ Processing **${selectedIds.length}** servers...`, 
            embeds: [], 
            components: [] 
        });

        const leftServers = [];
        const failedServers = [];

        // 4. Loop through selections and leave
        for (const id of selectedIds) {
            const guild = interaction.client.guilds.cache.get(id);
            if (!guild) continue;

            try {
                await guild.leave();
                leftServers.push(guild.name);
            } catch (error) {
                console.error(error);
                failedServers.push(`${guild.name} (Error)`);
            }
        }

        // 5. Final Report
        let resultMessage = `✅ **Operation Complete**\n\n**Successfully Left (${leftServers.length}):**\n${leftServers.join(', ') || 'None'}`;
        
        if (failedServers.length > 0) {
            resultMessage += `\n\n❌ **Failed (${failedServers.length}):**\n${failedServers.join(', ')}`;
        }

        await i.editReply({ content: resultMessage });
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            interaction.editReply({ content: '⚠️ Menu timed out.', components: [] }).catch(() => {});
        }
    });
}
