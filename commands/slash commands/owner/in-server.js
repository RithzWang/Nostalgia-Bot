const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    StringSelectMenuBuilder, 
    ButtonStyle, 
    ComponentType, 
    PermissionFlagsBits,
    MessageFlags,
    ChannelType
} = require('discord.js');

const OWNER_ID = '837741275603009626'; 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('in-server')
        .setDescription('Owner-only server management panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        // 1. Owner Security Check
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: '⛔ This command is restricted to the Bot Owner.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const guilds = interaction.client.guilds.cache;

        // 2. Main Dashboard Embed
        const embed = new EmbedBuilder()
            .setTitle(`🤖 Server Management Panel`)
            .setDescription(`**Stats:** Currently in **${guilds.size}** servers.\n\n**Actions:**\n👋 **Leave:** Force bot out of servers.\n🔗 **Invite:** Create an invite to a server.\n🎨 **Steal:** Copy emojis to this server.`)
            .setColor('#888888');

        // 3. Main Action Buttons
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_leave').setLabel('Leave').setStyle(ButtonStyle.Danger).setEmoji('👋'),
            new ButtonBuilder().setCustomId('btn_invite').setLabel('Invite').setStyle(ButtonStyle.Primary).setEmoji('🔗'),
            new ButtonBuilder().setCustomId('btn_steal').setLabel('Mass Steal').setStyle(ButtonStyle.Secondary).setEmoji('🎨')
        );

        const response = await interaction.editReply({ embeds: [embed], components: [row] });

        // 4. Button Collector
        const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 120000 
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) return;

            if (i.customId === 'btn_leave') await handleLeave(i, guilds);
            if (i.customId === 'btn_invite') await handleInvite(i, guilds);
            if (i.customId === 'btn_steal') await handleSteal(i, guilds);
        });
    },
};

// --- LOGIC FUNCTIONS ---

async function handleLeave(i, guilds) {
    const options = guilds.sort((a, b) => b.memberCount - a.memberCount).first(25).map(g => ({
        label: g.name,
        description: `Members: ${g.memberCount} | ID: ${g.id}`,
        value: g.id
    }));

    const menu = new StringSelectMenuBuilder()
        .setCustomId('leave_menu')
        .setPlaceholder('Select servers to leave...')
        .setMinValues(1)
        .setMaxValues(options.length)
        .addOptions(options);

    await i.update({ 
        embeds: [new EmbedBuilder().setTitle('👋 Leave Servers').setDescription('Bot will leave selected servers.')], 
        components: [new ActionRowBuilder().addComponents(menu)] 
    });
}

async function handleInvite(i, guilds) {
    const options = guilds.first(25).map(g => ({
        label: g.name,
        description: `ID: ${g.id}`,
        value: g.id
    }));

    const menu = new StringSelectMenuBuilder()
        .setCustomId('invite_menu')
        .setPlaceholder('Select a server for an invite...')
        .addOptions(options);

    await i.update({ 
        embeds: [new EmbedBuilder().setTitle('🔗 Create Invite').setDescription('Select a server to generate a link.')], 
        components: [new ActionRowBuilder().addComponents(menu)] 
    });
}

async function handleSteal(i, guilds) {
    const options = guilds.filter(g => g.emojis.cache.size > 0).first(25).map(g => ({
        label: g.name,
        description: `${g.emojis.cache.size} emojis available`,
        value: g.id
    }));

    if (options.length === 0) return i.reply({ content: 'No emojis found in any servers.', flags: MessageFlags.Ephemeral });

    const menu = new StringSelectMenuBuilder()
        .setCustomId('steal_server_menu')
        .setPlaceholder('Select server to steal from...')
        .addOptions(options);

    await i.update({ 
        embeds: [new EmbedBuilder().setTitle('🎨 Mass Steal Emoji').setDescription('Step 1: Select source server.')], 
        components: [new ActionRowBuilder().addComponents(menu)] 
    });
}

// Note: You must also have your InteractionCreate listener in index.js 
// updated to handle these specific StringSelectMenu customIds (leave_menu, invite_menu, steal_server_menu, etc.) 
// or keep the sub-collectors as written in the previous responses.
