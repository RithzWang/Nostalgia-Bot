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
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        // --- SETUP COMMAND ---
        .addSubcommand(sub => {
            sub.setName('setup')
                .setDescription('Create a NEW button menu')
                .addStringOption(opt => opt.setName('title').setDescription('Menu Title').setRequired(true))
                .addBooleanOption(opt => opt.setName('multi_select').setDescription('Allow multiple roles? (True = Toggle, False = 1 Only)').setRequired(true))
                .addRoleOption(opt => opt.setName('role1').setDescription('Role 1 (Required)').setRequired(true))
                
                // NEW: Required Role Option
                .addRoleOption(opt => opt.setName('required_role').setDescription('Only users with this role can click buttons (Optional)'))
                
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
            const multiSelect = interaction.options.getBoolean('multi_select');
            const desc = interaction.options.getString('description');
            const reuseMessageId = interaction.options.getString('message_id');
            const requiredRole = interaction.options.getRole('required_role');

            // ID Generation Strategy:
            // 1. Standard: btn_role_[RoleID] OR btn_single_[RoleID]
            // 2. Restricted: btn_r_[ReqRoleID]_[RoleID] (Multi) OR btn_rs_[ReqRoleID]_[RoleID] (Single)
            let idPrefix = "";
            if (requiredRole) {
                idPrefix = multiSelect ? `btn_r_${requiredRole.id}_` : `btn_rs_${requiredRole.id}_`;
            } else {
                idPrefix = multiSelect ? 'btn_role_' : 'btn_single_';
            }

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
                        .setCustomId(`${idPrefix}${role.id}`)
                        .setLabel(role.name)
                        .setStyle(ButtonStyle.Secondary);
                    if (emoji) btn.setEmoji(emoji);
                    buttons.push(btn);

                    descriptionLines.push(`> **${emoji ? emoji + ' ' : ''}${role.name}**`);
                }
            }

            if (buttons.length === 0) return interaction.editReply({ content: 'No valid roles provided.' });

            const buttonRows = packButtons(buttons);

            // --- BUILD CONTAINER (Title -> Sep -> Desc -> Sep -> Buttons) ---
            const container = new ContainerBuilder()
                .setAccentColor(0x888888)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### ${title}`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(descriptionLines.join('\n'))
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                );
            
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
                
                // 1. Extract Buttons
                let allButtons = [];
                container.components.forEach(comp => {
                    if (comp.type === 1) { // Action Row
                        comp.components.forEach(btnData => allButtons.push(ButtonBuilder.from(btnData)));
                    }
                });

                // 2. Extract Text (Indices based on new structure: 0=Title, 2=Desc)
                const textComponents = container.components.filter(c => c.type === 7);
                const titleText = textComponents[0]?.content || "### Menu";
                const existingBody = textComponents[2]?.content || ""; // Index 2
                
                let currentBodyLines = existingBody ? existingBody.split('\n') : [];

                // 3. Detect Prefix from the first button found
                const firstId = allButtons[0]?.data.custom_id || "";
                let currentPrefix = "";
                
                // Identify which prefix scheme is in use
                if (firstId.startsWith('btn_role_')) currentPrefix = 'btn_role_';
                else if (firstId.startsWith('btn_single_')) currentPrefix = 'btn_single_';
                else if (firstId.startsWith('btn_r_')) {
                    // "btn_r_[ReqID]_[RoleID]"
                    const parts = firstId.split('_');
                    // parts[0]=btn, parts[1]=r, parts[2]=ReqID
                    currentPrefix = `btn_r_${parts[2]}_`;
                }
                else if (firstId.startsWith('btn_rs_')) {
                    // "btn_rs_[ReqID]_[RoleID]"
                    const parts = firstId.split('_');
                    currentPrefix = `btn_rs_${parts[2]}_`;
                }

                if (!currentPrefix && sub !== 'remove') {
                     // Default if adding to empty container (unlikely)
                     currentPrefix = 'btn_role_'; 
                }

                // --- ADD ---
                if (sub === 'add') {
                    for (let i = 1; i <= 5; i++) {
                        const role = interaction.options.getRole(`role${i}`);
                        const emoji = interaction.options.getString(`emoji${i}`);
                        if (role) {
                            if (allButtons.some(b => b.data.custom_id === `${currentPrefix}${role.id}`)) continue;
                            
                            const btn = new ButtonBuilder()
                                .setCustomId(`${currentPrefix}${role.id}`)
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
                            // Match ID end
                            const btnToRemove = allButtons.find(b => b.data.custom_id.endsWith(`_${role.id}`));
                            
                            if (btnToRemove) {
                                const nameToRemove = btnToRemove.data.label;
                                allButtons = allButtons.filter(b => b.data.custom_id !== btnToRemove.data.custom_id);
                                currentBodyLines = currentBodyLines.filter(l => !l.includes(nameToRemove));
                            }
                        }
                    }
                }

                // --- REFRESH ---
                else if (sub === 'refresh') {
                    const updatedButtons = [];
                    const newDescriptionLines = [];
                    const headerLines = currentBodyLines.filter(l => !l.startsWith('>'));
                    if (headerLines.length > 0) newDescriptionLines.push(...headerLines);

                    for (const btn of allButtons) {
                        // Extract Role ID from the very end of the customID
                        const parts = btn.data.custom_id.split('_');
                        const roleId = parts[parts.length - 1];
                        
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

                // --- REBUILD CONTAINER ---
                const newRows = packButtons(allButtons);
                
                const newContainer = new ContainerBuilder()
                    .setAccentColor(container.accentColor || 0x888888)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(titleText)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(currentBodyLines.join('\n').trim())
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                    );

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
