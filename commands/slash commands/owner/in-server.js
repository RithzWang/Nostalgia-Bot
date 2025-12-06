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

// ⚠️ REPLACE WITH YOUR ID
const OWNER_ID = '837741275603009626'; 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('in-server')
        .setDescription('Manage bot servers')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        // 1. Security Check
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: '⛔ Owner only.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const guilds = interaction.client.guilds.cache;

        // 2. Create the Main Embed
        const embed = new EmbedBuilder()
            .setTitle(`🤖 Server Management Panel`)
            .setDescription(`**Current Status:**\nThe bot is currently in **${guilds.size}** servers.\n\n**Select an action below:**\n👋 **Leave:** Force the bot to leave specific servers.\n🔗 **Invite:** Generate an invite link for a specific server.`)
            .setColor('#888888');

        // 3. Create the Two Buttons
        const leaveButton = new ButtonBuilder()
            .setCustomId('btn_mode_leave')
            .setLabel('Leave Servers')
            .setStyle(ButtonStyle.Danger) // Red
            .setEmoji('👋');

        const inviteButton = new ButtonBuilder()
            .setCustomId('btn_mode_invite')
            .setLabel('Create Invite')
            .setStyle(ButtonStyle.Primary) // Blurple
            .setEmoji('🔗');

        const row = new ActionRowBuilder().addComponents(leaveButton, inviteButton);

        // 4. Send the Main Menu
        const response = await interaction.editReply({ embeds: [embed], components: [row] });

        // 5. Create Collector for Buttons
        const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) return;

            if (i.customId === 'btn_mode_leave') {
                await showLeaveMenu(i, guilds);
            } else if (i.customId === 'btn_mode_invite') {
                await showInviteMenu(i, guilds);
            }
        });
    },
};

// ==========================================
// 1. LOGIC FOR LEAVING SERVERS
// ==========================================
async function showLeaveMenu(i, guilds) {
    // Sort and get top 25 servers
    const options = guilds.sort((a, b) => b.memberCount - a.memberCount).first(25).map(g => ({
        label: g.name,
        description: `ID: ${g.id} | Members: ${g.memberCount}`,
        value: g.id
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('menu_leave_action')
        .setPlaceholder('Select servers to LEAVE (Multi-select)...')
        .setMinValues(1)
        .setMaxValues(options.length) // Allow multiple
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
        .setTitle('👋 Leave Servers')
        .setDescription('Select the servers below to make the bot **leave** them immediately.')
        .setColor('#888888');

    // Update the message
    const response = await i.update({ embeds: [embed], components: [row], fetchReply: true });

    // Listen for Menu Selection
    const collector = response.createMessageComponentCollector({ 
        componentType: ComponentType.StringSelect, 
        time: 60000 
    });

    collector.on('collect', async menuInteraction => {
        const selectedIds = menuInteraction.values;
        await menuInteraction.update({ content: '⏳ Processing leave requests...', components: [], embeds: [] });

        const left = [];
        for (const id of selectedIds) {
            const g = menuInteraction.client.guilds.cache.get(id);
            if (g) {
                await g.leave().catch(console.error);
                left.push(g.name);
            }
        }
        await menuInteraction.editReply({ content: `<a:success:1297818086463770695> I left Servers: \n${left.join('\n')}` });
    });
}

// ==========================================
// 2. LOGIC FOR CREATING INVITES
// ==========================================
async function showInviteMenu(i, guilds) {
    // Sort and get top 25 servers
    const options = guilds.sort((a, b) => b.memberCount - a.memberCount).first(25).map(g => ({
        label: g.name,
        description: `ID: ${g.id}`,
        value: g.id
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('menu_invite_action')
        .setPlaceholder('Select a server to generate INVITE...')
        .setMaxValues(1) // Only 1 at a time for invites is safer/cleaner
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
        .setTitle('🔗 Create Invite')
        .setDescription('Select a server below. The bot will try to find a channel and create an invite link.')
        .setColor('#888888');

    // Update the message
    const response = await i.update({ embeds: [embed], components: [row], fetchReply: true });

    // Listen for Menu Selection
    const collector = response.createMessageComponentCollector({ 
        componentType: ComponentType.StringSelect, 
        time: 60000 
    });

    collector.on('collect', async menuInteraction => {
        const guildId = menuInteraction.values[0];
        const guild = menuInteraction.client.guilds.cache.get(guildId);

        if (!guild) {
            return menuInteraction.reply({ content: '❌ Server not found.', flags: MessageFlags.Ephemeral });
        }

        // Try to find a valid channel to create an invite
        // We look for text channels where the bot has permission
        const channel = guild.channels.cache.find(c => 
            c.type === ChannelType.GuildText && 
            c.permissionsFor(guild.members.me).has(PermissionFlagsBits.CreateInstantInvite)
        );

        if (!channel) {
            return menuInteraction.reply({ content: `❌ I couldn't find a channel in **${guild.name}** where I have permissions to create an invite.`, flags: MessageFlags.Ephemeral });
        }

        try {
            const invite = await channel.createInvite({ maxAge: 0, maxUses: 1 }); // Permanent link, 1 use
            await menuInteraction.reply({ content: `**Invite for ${guild.name}:**\n${invite.url}`, flags: MessageFlags.Ephemeral });
        } catch (err) {
            await menuInteraction.reply({ content: `❌ Error creating invite: ${err.message}`, flags: MessageFlags.Ephemeral });
        }
    });
}
