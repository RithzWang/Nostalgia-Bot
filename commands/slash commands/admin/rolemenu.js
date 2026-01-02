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
        
        .addSubcommand(sub => {
            sub.setName('setup')
                .setDescription('Create a NEW menu')
                .addStringOption(opt => opt.setName('title').setDescription('Menu Title').setRequired(true))
                .addBooleanOption(opt => opt.setName('multi_select').setDescription('Allow multiple roles?').setRequired(true))
                .addRoleOption(opt => opt.setName('role1').setDescription('Role 1 (Required)').setRequired(true))
                .addStringOption(opt => opt.setName('emoji1').setDescription('Emoji for Role 1'))
                .addChannelOption(opt => 
                    opt.setName('channel')
                        .setDescription('Where to post?')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                )
                .addBooleanOption(opt => opt.setName('publish').setDescription('Publish if in an Announcement channel?'))
                .addStringOption(opt => opt.setName('message_id').setDescription('Reuse a bot message ID'));
            
            for (let i = 2; i <= 10; i++) {
                sub.addRoleOption(opt => opt.setName(`role${i}`).setDescription(`Role ${i}`))
                   .addStringOption(opt => opt.setName(`emoji${i}`).setDescription(`Emoji ${i}`));
            }
            return sub;
        })

        .addSubcommand(sub => 
            sub.setName('add')
                .setDescription('Add a role to an EXISTING menu')
                .addStringOption(opt => opt.setName('message_id').setDescription('The Message ID').setRequired(true))
                .addRoleOption(opt => opt.setName('role').setDescription('The role to add').setRequired(true))
                .addStringOption(opt => opt.setName('emoji').setDescription('Emoji for this role'))
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel where the menu is'))
        )

        .addSubcommand(sub => 
            sub.setName('remove')
                .setDescription('Remove a role from an EXISTING menu')
                .addStringOption(opt => opt.setName('message_id').setDescription('The Message ID').setRequired(true))
                .addRoleOption(opt => opt.setName('role').setDescription('The role to remove').setRequired(true))
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel where the menu is'))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        // --- SETUP COMMAND ---
        if (sub === 'setup') {
            const title = interaction.options.getString('title');
            const multiSelect = interaction.options.getBoolean('multi_select');
            const publish = interaction.options.getBoolean('publish') || false;
            const reuseMessageId = interaction.options.getString('message_id');

            const menu = new StringSelectMenuBuilder().setCustomId('role_select_menu').setMinValues(0);
            let validRoleCount = 0;
            let descriptionLines = [];

            for (let i = 1; i <= 10; i++) {
                const role = interaction.options.getRole(`role${i}`);
                const emoji = interaction.options.getString(`emoji${i}`);

                if (role) {
                    if (role.position >= interaction.guild.members.me.roles.highest.position) {
                        return interaction.reply({ content: `<:no:1297814819105144862> Role **${role.name}** is higher than my top role!`, flags: MessageFlags.Ephemeral });
                    }
                    const option = new StringSelectMenuOptionBuilder().setLabel(role.name).setValue(role.id);
                    if (emoji) option.setEmoji(emoji);
                    descriptionLines.push(`> **${emoji ? emoji + ' ' : ''}${role.name}**`);
                    menu.addOptions(option);
                    validRoleCount++;
                }
            }

            // UPDATED: Dynamic placeholder text
            menu.setMaxValues(multiSelect ? validRoleCount : 1);
            menu.setPlaceholder(multiSelect 
                ? `Select multiple roles` 
                : `Select one out of ${validRoleCount} roles`);

            // --- V2 COMPONENT CONSTRUCTION ---
            
            const titleText = new TextDisplayBuilder().setContent(`### ${title}`); 
            const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small);
            const bodyText = new TextDisplayBuilder().setContent(descriptionLines.join('\n'));

            // Wrap menu in ActionRow (Required for V2 Containers)
            const menuRow = new ActionRowBuilder().addComponents(menu);

            // The Container (Wrapper)
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
                let finalMessage;
                if (reuseMessageId) {
                    // --- REUSE & RESET LOGIC START ---
                    const oldMsg = await targetChannel.messages.fetch(reuseMessageId);
                    
                    // 1. Clear everything and show "Updating.."
                    await oldMsg.edit({ 
                        content: 'Updating..', 
                        embeds: [], 
                        components: [] // Removes buttons/select menus
                    });

                    // 2. Wait 3 Seconds
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    // 3. Apply the new V2 Menu
                    finalMessage = await oldMsg.edit(payload);
                    // --- REUSE & RESET LOGIC END ---
                } else {
                    finalMessage = await targetChannel.send(payload);
                }

                if (publish && targetChannel.type === ChannelType.GuildAnnouncement) await finalMessage.crosspost();

                return interaction.reply({ content: `<:yes:1297814648417943565> V2 Menu ready in ${targetChannel}!`, flags: MessageFlags.Ephemeral });
            } catch (e) {
                console.error(e);
                return interaction.reply({ content: '<:no:1297814819105144862> Failed to create menu. Check permissions or Message ID.', flags: MessageFlags.Ephemeral });
            }
        }

        // --- ADD / REMOVE COMMANDS ---
        else if (sub === 'add' || sub === 'remove') {
            const msgId = interaction.options.getString('message_id');
            const role = interaction.options.getRole('role');
            const emoji = interaction.options.getString('emoji');

            try {
                const message = await targetChannel.messages.fetch(msgId);
                
                // DATA EXTRACTION
                const oldContainer = message.components[0]; 
                
                // Note: Indexing here depends on order. Based on setup above:
                // 0: Title, 1: Body, 2: Separator, 3: ActionRow(Menu)
                const oldMenuRow = oldContainer.components[3]; 
                const oldBodyText = oldContainer.components[1].content; 
                
                const oldMenuComponent = oldMenuRow.components[0];
                const newMenu = StringSelectMenuBuilder.from(oldMenuComponent);
                
                // Rebuild Container Parts
                const titleText = new TextDisplayBuilder().setContent(oldContainer.components[0].content);
                const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small);
                
                let newBodyContent = "";

                if (sub === 'add') {
                    const newOption = new StringSelectMenuOptionBuilder().setLabel(role.name).setValue(role.id);
                    if (emoji) newOption.setEmoji(emoji);
                    newMenu.addOptions(newOption);
                    newBodyContent = oldBodyText + `\n> **${emoji ? emoji + ' ' : ''}${role.name}**`;
                } else {
                    const filtered = newMenu.options.filter(o => o.data.value !== role.id);
                    newMenu.setOptions(filtered);
                    newBodyContent = oldBodyText.split('\n').filter(l => !l.includes(role.name)).join('\n');
                }

                // Update text limits and Placeholder
                const isMultiSelect = oldMenuComponent.max_values > 1;
                const newCount = newMenu.options.length;
                
                newMenu.setMaxValues(isMultiSelect ? newCount : 1);
                newMenu.setPlaceholder(isMultiSelect 
                    ? `Select multiple roles` 
                    : `Select one out of ${newCount} roles`);
                
                const newBodyText = new TextDisplayBuilder().setContent(newBodyContent);
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
                
                return interaction.reply({ content: `<:yes:1297814648417943565> Menu updated!`, flags: MessageFlags.Ephemeral });
            } catch (err) {
                console.error(err);
                return interaction.reply({ content: '<:no:1297814819105144862> Could not edit menu. Ensure it is a V2 menu.', flags: MessageFlags.Ephemeral });
            }
        }
    }
};
