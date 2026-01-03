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
                .addRoleOption(opt => opt.setName('required_role').setDescription('Only users with this role can use the menu (Optional)'))
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
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const sub = interaction.options.getSubcommand();
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        // --- SETUP COMMAND ---
        if (sub === 'setup') {
            const title = interaction.options.getString('title');
            const multiSelect = interaction.options.getBoolean('multi_select');
            const publish = interaction.options.getBoolean('publish') || false;
            const reuseMessageId = interaction.options.getString('message_id');
            const requiredRole = interaction.options.getRole('required_role');

            const menuCustomId = requiredRole 
                ? `role_select_${requiredRole.id}` 
                : 'role_select_public';

            const menu = new StringSelectMenuBuilder().setCustomId(menuCustomId).setMinValues(0);
            let validRoleCount = 0;
            let descriptionLines = [];

            if (requiredRole) {
                descriptionLines.push(`🔒 **Restricted to:** ${requiredRole.toString()}`);
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
                let finalMessage;
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
                    finalMessage = await oldMsg.edit(payload);
                } else {
                    finalMessage = await targetChannel.send(payload);
                }

                if (publish && targetChannel.type === ChannelType.GuildAnnouncement) await finalMessage.crosspost();

                return interaction.editReply({ content: `<:yes:1297814648417943565> V2 Menu ready in ${targetChannel}!` });
            } catch (e) {
                console.error(e);
                return interaction.editReply({ content: '<:no:1297814819105144862> Failed to create menu. Check permissions or Message ID.' });
            }
        }

        // --- ADD / REMOVE COMMANDS ---
        else if (sub === 'add' || sub === 'remove') {
            const msgId = interaction.options.getString('message_id');
            const role = interaction.options.getRole('role');
            const emoji = interaction.options.getString('emoji');

            try {
                const message = await targetChannel.messages.fetch(msgId);
                
                const oldContainer = message.components[0]; 
                const oldMenuRow = oldContainer.components[3]; 
                const oldBodyText = oldContainer.components[1].content; 
                
                const oldMenuComponent = oldMenuRow.components[0];
                const newMenu = StringSelectMenuBuilder.from(oldMenuComponent);
                
                const titleText = new TextDisplayBuilder().setContent(oldContainer.components[0].content);
                const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small);
                
                let newBodyContent = "";

                if (sub === 'add') {
                    const newOption = new StringSelectMenuOptionBuilder().setLabel(role.name).setValue(role.id);
                    if (emoji) newOption.setEmoji(emoji);
                    newMenu.addOptions(newOption);
                    newBodyContent = oldBodyText + `\n> **${emoji ? emoji + ' ' : ''}${role.name}**`;
                } else {
                    // FIX: Find the OLD name stored in the menu option
                    const optionToRemove = newMenu.options.find(o => o.data.value === role.id);
                    // If we find it, use its label. If not, use current role name.
                    const nameToRemove = optionToRemove ? optionToRemove.data.label : role.name;

                    const filtered = newMenu.options.filter(o => o.data.value !== role.id);
                    newMenu.setOptions(filtered);

                    // Filter using the stored name
                    newBodyContent = oldBodyText
                        .split('\n')
                        .filter(l => !l.includes(nameToRemove))
                        .join('\n');
                }

                const isMultiSelect = oldMenuComponent.max_values > 1;
                const newCount = newMenu.options.length;
                
                newMenu.setMaxValues(isMultiSelect ? newCount : 1);
                newMenu.setPlaceholder(isMultiSelect 
                    ? `Select multiple roles` 
                    : `Select one out of ${newCount} roles`);
                
                const newBodyText = new TextDisplayBuilder().setContent(newBodyContent);
                const newMenuRow = new ActionRowBuilder().addComponents(newMenu);

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
                
                return interaction.editReply({ content: `<:yes:1297814648417943565> Menu updated!` });
            } catch (err) {
                console.error(err);
                return interaction.editReply({ content: '<:no:1297814819105144862> Could not edit menu. Ensure it is a V2 menu.' });
            }
        }
    }
};
