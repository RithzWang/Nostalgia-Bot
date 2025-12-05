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
                .setDescription('Shows a dropdown menu to leave servers.')
        )
        // Only allow people with Manage Server to see this command
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        // 1. Security Check: Block anyone who isn't the owner
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ 
                content: '⛔ **Access Denied:** Only the bot owner can use this command.', 
                ephemeral: true 
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'list') {
            await handleListAndLeave(interaction);
        }
    },
};

async function handleListAndLeave(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Get all servers
    const guilds = interaction.client.guilds.cache;

    // Discord Select Menus can only hold 25 options max. 
    // We sort by member count and take the top 25.
    const topGuilds = guilds
        .sort((a, b) => b.memberCount - a.memberCount)
        .first(25);

    // 1. Build the Dropdown Options
    const options = topGuilds.map(guild => ({
        label: guild.name,
        description: `${guild.memberCount} members | ID: ${guild.id}`,
        value: guild.id, // The value we send back is the Server ID
    }));

    // 2. Create the Select Menu
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('server_leave_menu')
        .setPlaceholder('🔻 Select a server to leave...')
        .addOptions(options);

    // 3. Put it in a Row
    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
        .setTitle(`🛡️ Server Manager (${guilds.size} Servers)`)
        .setDescription('Select a server from the dropdown below to force the bot to leave it.')
        .setColor('#5865F2');

    // 4. Send the message with the dropdown
    const message = await interaction.editReply({ 
        embeds: [embed], 
        components: [row] 
    });

    // 5. Create a Collector to listen for the click
    const collector = message.createMessageComponentCollector({ 
        componentType: ComponentType.StringSelect, 
        time: 60000 // Menu active for 60 seconds
    });

    collector.on('collect', async i => {
        // Confirm it's the same user (double check)
        if (i.user.id !== interaction.user.id) return;

        const selectedGuildId = i.values[0]; // Get the ID from the selection
        const guildToLeave = interaction.client.guilds.cache.get(selectedGuildId);

        if (!guildToLeave) {
            return i.reply({ content: '❌ Error: I am no longer in that server.', ephemeral: true });
        }

        try {
            // Acknowledge the interaction immediately so it doesn't fail
            await i.update({ content: `⏳ Leaving **${guildToLeave.name}**...`, components: [] });
            
            // Perform the leave action
            await guildToLeave.leave();

            // Follow up with success
            await i.followUp({ content: `✅ Successfully left **${guildToLeave.name}**.`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await i.followUp({ content: `❌ Failed to leave: ${error.message}`, ephemeral: true });
        }
    });

    collector.on('end', collected => {
        // If time runs out, remove the dropdown so they can't click it anymore
        if (collected.size === 0) {
            interaction.editReply({ content: '⚠️ Menu timed out.', components: [] }).catch(() => {});
        }
    });
}
