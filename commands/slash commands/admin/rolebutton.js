const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags, 
    ChannelType, 
    ContainerBuilder,      
    TextDisplayBuilder,    
    SeparatorBuilder,      
    SeparatorSpacingSize 
} = require('discord.js');

// --- HELPER: Repack buttons into rows of 5 ---
function packButtons(buttons) {
    const rows = [];
    let currentRow = new ActionRowBuilder();

    buttons.forEach(btn => {
        currentRow.addComponents(btn);
        if (currentRow.components.length === 5) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }
    });

    if (currentRow.components.length > 0) rows.push(currentRow);
    return rows;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rolebutton')
        .setDescription('Manage role buttons')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        // --- SETUP COMMAND ---
        .addSubcommand(sub => {
            sub.setName('setup')
                .setDescription('Create a NEW button menu')
                .addStringOption(opt => opt.setName('title').setDescription('Menu Title').setRequired(true))
                .addBooleanOption(opt => opt.setName('multi_select').setDescription('Allow multiple roles? (True = Toggle, False = 1 Only)').setRequired(true)) // NEW
                .addRoleOption(opt => opt.setName('role1').setDescription('Role 1 (Required)').setRequired(true))
                .addStringOption(opt => opt.setName('emoji1').setDescription('Emoji for Role 1'))
                .addChannelOption(opt => opt.setName('channel').setDescription('Where to post?').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
                .addStringOption(opt => opt.setName('description').setDescription('Extra text description (Optional)'))
                .addStringOption(opt => opt.setName('message_id').setDescription('Reuse a bot message ID'));

            for (let i = 2; i <= 10; i++) {
                sub.addRoleOption(opt => opt.setName(`role${i}`).setDescription(`Role ${i}`))
                   .addStringOption(opt => opt.setName(`emoji${i}`).setDescription(`Emoji ${i}`));
            }
            return sub;
        })

        // --- ADD COMMAND ---
        .addSubcommand(sub => {
            sub.setName('add')
                .setDescription('Add buttons to an EXISTING menu')
                .addStringOption(opt => opt.setName('message_id').setDescription('The Message ID').setRequired(true))
                .addRoleOption(opt => opt.setName('role1').setDescription('Role 1 to add').setRequired(true))
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel where the menu is'))
                .addStringOption(opt => opt.setName('emoji1').setDescription('Emoji for Role 1'));
            
            for (let i = 2; i <= 5; i++) {
                sub.addRoleOption(opt => opt.setName(`role${i}`).setDescription(`Role ${i}`))
                   .addStringOption(opt => opt.setName(`emoji${i}`).setDescription(`Emoji ${i}`));
            }
            return sub;
        })

        // --- REMOVE COMMAND ---
        .addSubcommand(sub => {
            sub.setName('remove')
                .setDescription('Remove buttons from an EXISTING menu')
                .addStringOption(opt => opt.setName('message_id').setDescription('The Message ID').setRequired(true))
                .addRoleOption(opt => opt.setName('role1').setDescription('Role 1 to remove').setRequired(true))
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel where the menu is'));

            for (let i = 2; i <= 5; i++) {
                sub.addRoleOption(opt => opt.setName(`role${i}`).setDescription(`Role ${i}`));
            }
            return sub;
        })

        // --- REFRESH COMMAND ---
        .addSubcommand(sub => 
            sub.setName('refresh')
                .setDescription('Update button labels and text list if you renamed roles')
                .addStringOption(opt => opt.setName('message_id').setDescription('The Message ID').setRequired(true))
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel where the menu is'))
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const sub = interaction.options.getSubcommand();
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        // ===============================================
        // 1. SETUP LOGIC
        // ===============================================
        if (sub === 'setup') {
            const title = interaction.options.getString('title');
            const multiSelect = interaction.options.getBoolean('multi_select'); // NEW
            const desc = interaction.options.getString('description');
            const reuseMessageId = interaction.options.getString('message_id');

            // Determine Prefix: 'btn_role_' (Multi) or 'btn_single_' (Single)
            const idPrefix = multiSelect ? 'btn_role_' : 'btn_single_';

            const buttons = [];
            const descriptionLines = []; 
            if (desc) descriptionLines.push(desc + '\n');

            for (let i = 1; i <= 10; i++) {
                const role = interaction.options.getRole(`role${i}`);
                const emoji = interaction.options.getString(`emoji${i}`);
                
                if (role) {
                    if (role.position >= interaction.guild.members.me.roles.highest.position) {
                        return interaction.editReply({ content: `<:no:1297814819105144862> Role **${role.name}** is higher than my top role!` });
                    }
                    
                    const btn = new ButtonBuilder()
                        .setCustomId(`${idPrefix}${role.id}`) // Use dynamic prefix
                        .setLabel(role.name)
                        .setStyle(ButtonStyle.Secondary);
                    if (emoji) btn.setEmoji(emoji);
                    buttons.push(btn);

                    descriptionLines.push(`> **${emoji ? emoji + ' ' : ''}${role.name}**`);
                }
            }

            if (buttons.length === 0) return interaction.editReply({ content: 'No valid roles provided.' });

            const buttonRows = packButtons(buttons);

            const container = new ContainerBuilder()
                .setAccentColor(0x808080)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${title}`))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(descriptionLines.join('\n')))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
            
            buttonRows.forEach(row => container.addActionRowComponents(row));

            const payload = { 
                content: '', 
                components: [container], 
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            };

            try {
                if (reuseMessageId) {
                    const oldMsg = await targetChannel.messages.fetch(reuseMessageId);
                    await oldMsg.edit(payload);
                } else {
                    await targetChannel.send(payload);
                }
                return interaction.editReply({ content: `<:yes:1297814648417943565> Button menu sent!` });
            } catch (e) {
                console.error(e);
                return interaction.editReply({ content: 'Failed to send menu.' });
            }
        }

        // ===============================================
        // 2. ADD / REMOVE / REFRESH LOGIC
        // ===============================================
        else {
            const msgId = interaction.options.getString('message_id');

            try {
                const message = await targetChannel.messages.fetch(msgId);
                const container = message.components[0];
                
                let allButtons = [];
                container.components.forEach(comp => {
                    if (comp.type === 1) { 
                        comp.components.forEach(btnData => allButtons.push(ButtonBuilder.from(btnData)));
                    }
                });

                // Detect Mode based on existing buttons
                const isSingleMode = allButtons.some(b => b.data.custom_id.startsWith('btn_single_'));
                const currentPrefix = isSingleMode ? 'btn_single_' : 'btn_role_';

                // Get Text Body
                let bodyText = "";
                const bodyComp = container.components.find((c, idx) => c.type === 7 && idx > 0);
                if (bodyComp) bodyText = bodyComp.content;
                let currentBodyLines = bodyText ? bodyText.split('\n') : [];

                // --- ADD ---
                if (sub === 'add') {
                    for (let i = 1; i <= 5; i++) {
                        const role = interaction.options.getRole(`role${i}`);
                        const emoji = interaction.options.getString(`emoji${i}`);
                        if (role) {
                            if (allButtons.some(b => b.data.custom_id === `${currentPrefix}${role.id}`)) continue;
                            
                            const btn = new ButtonBuilder()
                                .setCustomId(`${currentPrefix}${role.id}`) // Use detected prefix
                                .setLabel(role.name)
                                .setStyle(ButtonStyle.Secondary);
                            if (emoji) btn.setEmoji(emoji);
                            allButtons.push(btn);

                            currentBodyLines.push(`> **${emoji ? emoji + ' ' : ''}${role.name}**`);
                        }
                    }
                }
                
                // --- REMOVE ---
                else if (sub === 'remove') {
                    for (let i = 1; i <= 5; i++) {
                        const role = interaction.options.getRole(`role${i}`);
                        if (role) {
                            // Match ID with prefix
                            const btnToRemove = allButtons.find(b => b.data.custom_id === `${currentPrefix}${role.id}`);
                            const nameToRemove = btnToRemove ? btnToRemove.data.label : role.name;

                            allButtons = allButtons.filter(b => b.data.custom_id !== `${currentPrefix}${role.id}`);
                            currentBodyLines = currentBodyLines.filter(l => !l.includes(nameToRemove));
                        }
                    }
                }

                // --- REFRESH ---
                else if (sub === 'refresh') {
                    const updatedButtons = [];
                    const newDescriptionLines = [];
                    const headerLines = currentBodyLines.filter(l => !l.startsWith('>'));
                    newDescriptionLines.push(...headerLines);

                    for (const btn of allButtons) {
                        // Strip either prefix to get ID
                        const roleId = btn.data.custom_id.replace('btn_role_', '').replace('btn_single_', '');
                        const role = interaction.guild.roles.cache.get(roleId);
                        
                        if (role) {
                            btn.setLabel(role.name); 
                            updatedButtons.push(btn);
                            const emoji = btn.data.emoji;
                            const emojiStr = emoji ? (emoji.id ? `<:${emoji.name}:${emoji.id}>` : emoji.name) : null;
                            newDescriptionLines.push(`> **${emojiStr ? emojiStr + ' ' : ''}${role.name}**`);
                        }
                    }
                    allButtons = updatedButtons;
                    currentBodyLines = newDescriptionLines;
                }

                // Rebuild
                const newRows = packButtons(allButtons);
                const titleText = container.components[0].content;
                
                const newContainer = new ContainerBuilder()
                    .setAccentColor(container.accentColor || 0x808080)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(titleText))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(currentBodyLines.join('\n').trim()))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

                newRows.forEach(row => newContainer.addActionRowComponents(row));

                await message.edit({ 
                    components: [newContainer], 
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] }
                });

                return interaction.editReply({ content: `<:yes:1297814648417943565> Menu updated successfully!` });

            } catch (err) {
                console.error(err);
                return interaction.editReply({ content: '<:no:1297814819105144862> Could not edit menu. Check ID.' });
            }
        }
    }
};
