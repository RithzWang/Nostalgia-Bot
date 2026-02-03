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
                // 1. REQUIRED FIRST
                .addStringOption(opt => opt.setName('title').setDescription('Menu Title').setRequired(true))
                .addBooleanOption(opt => opt.setName('multi_select').setDescription('Allow multiple roles?').setRequired(true))
                .addRoleOption(opt => opt.setName('role1').setDescription('Role 1 (Required)').setRequired(true))
                
                // 2. OPTIONAL AFTER
                .addRoleOption(opt => opt.setName('required_role').setDescription('Only users with this role can use the menu (Optional)'))
                .addStringOption(opt => opt.setName('emoji1').setDescription('Emoji for Role 1'))
                .addChannelOption(opt => 
                    opt.setName('channel')
                        .setDescription('Where to post?')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                )
                .addStringOption(opt => opt.setName('message_id').setDescription('Reuse a bot message ID'));
            
            // Loop for Setup Roles 2-9
            for (let i = 2; i <= 9; i++) {
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
                .setDescription('Update role names in the menu if you changed them in Server Settings')
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
            const reuseMessageId = interaction.options.getString('message_id');
            const requiredRole = interaction.options.getRole('required_role');

            const menuCustomId = requiredRole 
                ? `role_select_${requiredRole.id}` 
                : 'role_select_public';

            const menu = new StringSelectMenuBuilder().setCustomId(menuCustomId).setMinValues(0);
            let validRoleCount = 0;
            let descriptionLines = [];

            // REMOVED: No longer adding the "Restricted to:" line here.

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

            // --- BUILD CONTAINER (NEW STRUCTURE) ---
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
                    
                    const loadingContainer = new ContainerBuilder()
                        .setAccentColor(0x888888)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('### 🔄 Updating Menu...\nPlease wait.')
                        );

                    await oldMsg.edit({ 
                        content: '', 
                        components: [loadingContainer], 
                        flags: MessageFlags.IsComponentsV2
                    });

                    await new Promise(resolve => setTimeout(resolve, 3000));
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
        // 2. ADD / REMOVE LOGIC
        // ===============================================
        else if (sub === 'add' || sub === 'remove') {
            const msgId = interaction.options.getString('message_id');

            try {
                const message = await targetChannel.messages.fetch(msgId);
                const oldContainer = message.components[0];
                
                // Extract components based on NEW indices:
                // 0: Title (TextDisplay)
                // 1: Separator
                // 2: Description (TextDisplay)
                // 3: Separator
                // 4: Menu Row (ActionRow)
                
                // Fallback checks in case of old structure, but assuming new structure:
                const titleText = new TextDisplayBuilder().setContent(oldContainer.components[0].content);
                const currentBody = oldContainer.components[2]?.content || ""; // Index 2 is Body
                let currentBodyLines = currentBody ? currentBody.split('\n') : [];

                const oldMenuRow = oldContainer.components[4]; // Index 4 is Action Row
                const newMenu = StringSelectMenuBuilder.from(oldMenuRow.components[0]);

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
                } else {
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

                const isMultiSelect = newMenu.data.max_values > 1; 
                const newCount = newMenu.options.length;
                newMenu.setMaxValues(isMultiSelect ? newCount : 1);
                newMenu.setPlaceholder(isMultiSelect ? `Select one or multiple roles` : `Select one out of ${newCount} roles`);
                
                // Rebuild Container
                const newContainer = new ContainerBuilder()
                    .setAccentColor(oldContainer.accentColor || 0x888888)
                    .addTextDisplayComponents(titleText)
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

        // ===============================================
        // 3. REFRESH LOGIC
        // ===============================================
        else if (sub === 'refresh') {
            const msgId = interaction.options.getString('message_id');

            try {
                const message = await targetChannel.messages.fetch(msgId);
                const oldContainer = message.components[0];
                
                // New Indices
                const oldMenuRow = oldContainer.components[4];
                const menu = StringSelectMenuBuilder.from(oldMenuRow.components[0]);

                let newBodyLines = [];
                // REMOVED: Restricted logic check for description.

                // Update Options
                const updatedOptions = [];
                for (const option of menu.options) {
                    const role = interaction.guild.roles.cache.get(option.data.value);
                    const builder = new StringSelectMenuOptionBuilder(option.data);
                    
                    if (role) {
                        builder.setLabel(role.name); 
                        const emoji = option.data.emoji;
                        const emojiStr = emoji ? (emoji.id ? `<:${emoji.name}:${emoji.id}>` : emoji.name) : null;
                        newBodyLines.push(`> **${emojiStr ? emojiStr + ' ' : ''}${role.name}**`);
                        updatedOptions.push(builder);
                    }
                }
                menu.setOptions(updatedOptions);

                const titleText = new TextDisplayBuilder().setContent(oldContainer.components[0].content);
                
                // Rebuild
                const newContainer = new ContainerBuilder()
                    .setAccentColor(oldContainer.accentColor || 0x888888)
                    .addTextDisplayComponents(titleText)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(newBodyLines.join('\n'))
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(menu)
                    );

                await message.edit({ 
                    components: [newContainer], 
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] } 
                });
                return interaction.editReply({ content: `<:yes:1297814648417943565> Menu refreshed with latest role names!` });

            } catch (err) {
                console.error(err);
                return interaction.editReply({ content: '<:no:1297814819105144862> Failed to refresh menu. Check ID.' });
            }
        }
    }
};
