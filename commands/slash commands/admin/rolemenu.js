const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder,
    MessageFlags,
    ChannelType,
    ContainerBuilder,      
    TextDisplayBuilder,    
    SeparatorBuilder,      
    SeparatorSpacingSize
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rolemenu')
        .setDescription('Manage role selection menus')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // --- SETUP COMMAND ---
        .addSubcommand(sub => {
            sub.setName('setup')
                .setDescription('Create a NEW menu')
                .addStringOption(opt => opt.setName('title').setDescription('Menu Title').setRequired(true))
                .addBooleanOption(opt => opt.setName('multi_select').setDescription('Allow multiple roles?').setRequired(true))
                .addRoleOption(opt => opt.setName('role1').setDescription('Role 1 (Required)').setRequired(true))
                .addRoleOption(opt => opt.setName('required_role').setDescription('Only users with this role can use the menu (Optional)'))
                .addStringOption(opt => opt.setName('emoji1').setDescription('Emoji for Role 1'))
                .addChannelOption(opt => opt.setName('channel').setDescription('Where to post?').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
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
                .setDescription('Add roles to an EXISTING menu')
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
                .setDescription('Remove roles from an EXISTING menu')
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
                .setDescription('Update role names and optionally the title')
                .addStringOption(opt => opt.setName('message_id').setDescription('The Message ID').setRequired(true))
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel where the menu is'))
                .addStringOption(opt => opt.setName('new_title').setDescription('Change the menu title (Optional)'))
        )

        // --- DESCRIPTION COMMAND (NEW) ---
        .addSubcommand(sub => 
            sub.setName('description')
                .setDescription('Update the menu description manually')
                .addStringOption(opt => opt.setName('message_id').setDescription('The Message ID').setRequired(true))
                .addStringOption(opt => opt.setName('description').setDescription('The new description text').setRequired(true))
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
            const reuseMessageId = interaction.options.getString('message_id');
            const requiredRole = interaction.options.getRole('required_role');

            const menuCustomId = requiredRole 
                ? `role_select_${requiredRole.id}` 
                : 'role_select_public';

            const menu = new StringSelectMenuBuilder().setCustomId(menuCustomId).setMinValues(0);
            let validRoleCount = 0;
            let descriptionLines = [];

            for (let i = 1; i <= 10; i++) {
                const role = interaction.options.getRole(`role${i}`);
                const emoji = interaction.options.getString(`emoji${i}`);

                if (role) {
                    if (role.position >= interaction.guild.members.me.roles.highest.position) {
                        return interaction.editReply({ content: `<:no:1297814819105144862> Role **${role.name}** is higher than my top role!` });
                    }
                    const option = new StringSelectMenuOptionBuilder().setLabel(role.name).setValue(role.id);
                    if (emoji) option.setEmoji(emoji);
                    descriptionLines.push(`> **${emoji ? emoji + ' ' : ''}${role.name}**`);
                    menu.addOptions(option);
                    validRoleCount++;
                }
            }

            if (validRoleCount === 0) {
                 return interaction.editReply({ content: 'You must provide at least one valid role.' });
            }

            menu.setMaxValues(multiSelect ? validRoleCount : 1);
            menu.setPlaceholder(multiSelect 
                ? `Select one or multiple roles` 
                : `Select one out of ${validRoleCount} roles`);

            // --- BUILD CONTAINER ---
            const container = new ContainerBuilder()
                .setAccentColor(0x888888)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### ${title}`)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(descriptionLines.join('\n'))
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(menu)
                );

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
                return interaction.editReply({ content: `<:yes:1297814648417943565> Menu ready in ${targetChannel}!` });
            } catch (e) {
                console.error(e);
                return interaction.editReply({ content: '<:no:1297814819105144862> Failed to create menu. Check permissions or Message ID.' });
            }
        }

        // ===============================================
        // 2. ADD / REMOVE / REFRESH / DESCRIPTION LOGIC
        // ===============================================
        else {
            const msgId = interaction.options.getString('message_id');

            try {
                const message = await targetChannel.messages.fetch(msgId);
                const container = message.components[0];
                
                // --- 1. Extract Text & Components Safely ---
                const textComponents = container.components.filter(c => c.type === 7);
                let titleText = textComponents[0]?.content || "### Menu";
                const existingBody = textComponents[1]?.content || ""; 
                
                let currentBodyLines = existingBody ? existingBody.split('\n') : [];

                // Find Menu Row
                let menuRow;
                container.components.forEach(comp => {
                    if (comp.type === 1 && comp.components[0].type === 3) {
                        menuRow = comp;
                    }
                });

                if (!menuRow) return interaction.editReply({ content: '<:no:1297814819105144862> Could not find a menu in this message.' });

                const newMenu = StringSelectMenuBuilder.from(menuRow.components[0]);

                // --- ADD ---
                if (sub === 'add') {
                    for (let i = 1; i <= 5; i++) {
                        const role = interaction.options.getRole(`role${i}`);
                        const emoji = interaction.options.getString(`emoji${i}`);
                        if (role) {
                            if (newMenu.options.some(o => o.data.value === role.id)) continue;
                            const newOption = new StringSelectMenuOptionBuilder().setLabel(role.name).setValue(role.id);
                            if (emoji) newOption.setEmoji(emoji);
                            newMenu.addOptions(newOption);
                            currentBodyLines.push(`> **${emoji ? emoji + ' ' : ''}${role.name}**`);
                        }
                    }
                } 
                
                // --- REMOVE ---
                else if (sub === 'remove') {
                    for (let i = 1; i <= 5; i++) {
                        const role = interaction.options.getRole(`role${i}`);
                        if (role) {
                            const optionToRemove = newMenu.options.find(o => o.data.value === role.id);
                            const nameToRemove = optionToRemove ? optionToRemove.data.label : role.name;
                            const filtered = newMenu.options.filter(o => o.data.value !== role.id);
                            newMenu.setOptions(filtered);
                            currentBodyLines = currentBodyLines.filter(l => !l.includes(nameToRemove));
                        }
                    }
                }

                // --- REFRESH ---
                else if (sub === 'refresh') {
                    const newTitle = interaction.options.getString('new_title');
                    if (newTitle) {
                        titleText = `### ${newTitle}`;
                    }

                    const updatedOptions = [];
                    const newDescriptionLines = [];

                    for (const option of newMenu.options) {
                        const role = interaction.guild.roles.cache.get(option.data.value);
                        const builder = new StringSelectMenuOptionBuilder(option.data);
                        
                        if (role) {
                            builder.setLabel(role.name); 
                            const emoji = option.data.emoji;
                            const emojiStr = emoji ? (emoji.id ? `<:${emoji.name}:${emoji.id}>` : emoji.name) : null;
                            newDescriptionLines.push(`> **${emojiStr ? emojiStr + ' ' : ''}${role.name}**`);
                            updatedOptions.push(builder);
                        }
                    }
                    newMenu.setOptions(updatedOptions);
                    currentBodyLines = newDescriptionLines;
                }

                // --- DESCRIPTION (NEW) ---
                else if (sub === 'description') {
                    const newDesc = interaction.options.getString('description');
                    // Converts raw input into lines for the container
                    currentBodyLines = newDesc.split('\n');
                }

                // Update Menu Max Values
                const isMultiSelect = newMenu.data.max_values > 1; 
                const newCount = newMenu.options.length;
                if (newCount > 0) {
                    newMenu.setMaxValues(isMultiSelect ? newCount : 1);
                    newMenu.setPlaceholder(isMultiSelect ? `Select one or multiple roles` : `Select one out of ${newCount} roles`);
                } else {
                    return interaction.editReply({ content: "Cannot update menu: it would be empty." });
                }

                // --- REBUILD CONTAINER ---
                const newContainer = new ContainerBuilder()
                    .setAccentColor(container.accentColor || 0x888888)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(titleText)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(currentBodyLines.join('\n').trim())
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(newMenu)
                    );

                await message.edit({ 
                    components: [newContainer], 
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] } 
                });
                return interaction.editReply({ content: `<:yes:1297814648417943565> Menu updated successfully!` });

            } catch (err) {
                console.error(err);
                return interaction.editReply({ content: '<:no:1297814819105144862> Could not edit menu.' });
            }
        }
    }
};
