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
        .setDescription('Manage role selection menus (Components V2)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // --- SETUP COMMAND ---
        .addSubcommand(sub => {
            sub.setName('setup')
                .setDescription('Create a NEW menu')
                // 1. REQUIRED OPTIONS FIRST
                .addStringOption(opt => opt.setName('title').setDescription('Menu Title').setRequired(true))
                .addBooleanOption(opt => opt.setName('multi_select').setDescription('Allow multiple roles?').setRequired(true))
                .addRoleOption(opt => opt.setName('role1').setDescription('Role 1 (Required)').setRequired(true))
                
                // 2. OPTIONAL OPTIONS AFTER
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

        // --- ADD COMMAND (Bulk 1-5) ---
        .addSubcommand(sub => {
            sub.setName('add')
                .setDescription('Add roles to an EXISTING menu')
                // 1. REQUIRED FIRST
                .addStringOption(opt => opt.setName('message_id').setDescription('The Message ID').setRequired(true))
                .addRoleOption(opt => opt.setName('role1').setDescription('Role 1 to add').setRequired(true))
                
                // 2. OPTIONAL AFTER
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel where the menu is'))
                .addStringOption(opt => opt.setName('emoji1').setDescription('Emoji for Role 1'));
            
            // Roles 2-5 (Optional)
            for (let i = 2; i <= 5; i++) {
                sub.addRoleOption(opt => opt.setName(`role${i}`).setDescription(`Role ${i}`))
                   .addStringOption(opt => opt.setName(`emoji${i}`).setDescription(`Emoji ${i}`));
            }
            return sub;
        })

        // --- REMOVE COMMAND (Bulk 1-5) ---
        .addSubcommand(sub => {
            sub.setName('remove')
                .setDescription('Remove roles from an EXISTING menu')
                // 1. REQUIRED FIRST
                .addStringOption(opt => opt.setName('message_id').setDescription('The Message ID').setRequired(true))
                .addRoleOption(opt => opt.setName('role1').setDescription('Role 1 to remove').setRequired(true))
                
                // 2. OPTIONAL AFTER
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel where the menu is'));

            // Roles 2-5 (Optional)
            for (let i = 2; i <= 5; i++) {
                sub.addRoleOption(opt => opt.setName(`role${i}`).setDescription(`Role ${i}`));
            }
            return sub;
        }),

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

            if (requiredRole) {
                descriptionLines.push(`<:lock:1457147730542465312> **Restricted to:** ${requiredRole.toString()}`);
                descriptionLines.push(''); 
            }

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

            menu.setMaxValues(multiSelect ? validRoleCount : 1);
            menu.setPlaceholder(multiSelect 
                ? `Select multiple roles` 
                : `Select one out of ${validRoleCount} roles`);

            const titleText = new TextDisplayBuilder().setContent(`### ${title}`); 
            const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small);
            const bodyText = new TextDisplayBuilder().setContent(descriptionLines.join('\n'));
            const menuRow = new ActionRowBuilder().addComponents(menu);

            const container = new ContainerBuilder()
                .setAccentColor(0x808080)
                .addTextDisplayComponents(titleText) 
                .addTextDisplayComponents(bodyText)
                .addSeparatorComponents(separator)
                .addActionRowComponents(menuRow);

            const payload = { 
                content: '', 
                components: [container], 
                flags: MessageFlags.IsComponentsV2 
            };

            try {
                if (reuseMessageId) {
                    const oldMsg = await targetChannel.messages.fetch(reuseMessageId);
                    
                    const loadingContainer = new ContainerBuilder()
                        .setAccentColor(0xFEE75C)
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

                return interaction.editReply({ content: `<:yes:1297814648417943565> V2 Menu ready in ${targetChannel}!` });
            } catch (e) {
                console.error(e);
                return interaction.editReply({ content: '<:no:1297814819105144862> Failed to create menu. Check permissions or Message ID.' });
            }
        }

        // ===============================================
        // 2. ADD / REMOVE LOGIC (BULK)
        // ===============================================
        else if (sub === 'add' || sub === 'remove') {
            const msgId = interaction.options.getString('message_id');

            try {
                const message = await targetChannel.messages.fetch(msgId);
                
                // Retrieve Old Components
                const oldContainer = message.components[0]; 
                const oldMenuRow = oldContainer.components[3]; 
                // Copy the menu so we can modify options
                const newMenu = StringSelectMenuBuilder.from(oldMenuRow.components[0]);

                const titleText = new TextDisplayBuilder().setContent(oldContainer.components[0].content);
                const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small);
                
                // We'll modify the text content line by line
                let currentBodyLines = oldContainer.components[1].content.split('\n');

                // --- ADD LOGIC ---
                if (sub === 'add') {
                    for (let i = 1; i <= 5; i++) {
                        const role = interaction.options.getRole(`role${i}`);
                        const emoji = interaction.options.getString(`emoji${i}`);

                        if (role) {
                            // Prevent duplicates
                            if (newMenu.options.some(o => o.data.value === role.id)) continue;

                            const newOption = new StringSelectMenuOptionBuilder().setLabel(role.name).setValue(role.id);
                            if (emoji) newOption.setEmoji(emoji);
                            
                            newMenu.addOptions(newOption);
                            currentBodyLines.push(`> **${emoji ? emoji + ' ' : ''}${role.name}**`);
                        }
                    }
                } 
                
                // --- REMOVE LOGIC ---
                else {
                    for (let i = 1; i <= 5; i++) {
                        const role = interaction.options.getRole(`role${i}`);
                        if (role) {
                            // Find the option to get the STORED label (handles renamed roles)
                            const optionToRemove = newMenu.options.find(o => o.data.value === role.id);
                            const nameToRemove = optionToRemove ? optionToRemove.data.label : role.name;

                            // Remove from menu
                            const filtered = newMenu.options.filter(o => o.data.value !== role.id);
                            newMenu.setOptions(filtered);

                            // Remove from text body
                            currentBodyLines = currentBodyLines.filter(l => !l.includes(nameToRemove));
                        }
                    }
                }

                // Update Select Menu Config (Max Values & Placeholder)
                const isMultiSelect = newMenu.data.max_values > 1; // It keeps previous config
                const newCount = newMenu.options.length;
                
                newMenu.setMaxValues(isMultiSelect ? newCount : 1);
                newMenu.setPlaceholder(isMultiSelect 
                    ? `Select multiple roles` 
                    : `Select one out of ${newCount} roles`);
                
                // Rebuild Body Text
                const newBodyText = new TextDisplayBuilder().setContent(currentBodyLines.join('\n'));
                const newMenuRow = new ActionRowBuilder().addComponents(newMenu);

                // Rebuild Container
                const newContainer = new ContainerBuilder()
                    .setAccentColor(oldContainer.accentColor || 0x808080)
                    .addTextDisplayComponents(titleText)
                    .addTextDisplayComponents(newBodyText)
                    .addSeparatorComponents(separator)
                    .addActionRowComponents(newMenuRow);

                await message.edit({ 
                    components: [newContainer], 
                    flags: MessageFlags.IsComponentsV2
                });
                
                return interaction.editReply({ content: `<:yes:1297814648417943565> Menu updated successfully!` });
            } catch (err) {
                console.error(err);
                return interaction.editReply({ content: '<:no:1297814819105144862> Could not edit menu. Ensure it is a V2 menu.' });
            }
        }
    }
};
