const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder,
    MessageFlags,
    ChannelType
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rolemenu')
        .setDescription('Manage role selection menus')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        
        // 1. SETUP (New Menu)
        .addSubcommand(sub => {
            sub.setName('setup')
                .setDescription('Create a NEW menu.')
                // --- REQUIRED OPTIONS FIRST ---
                .addStringOption(opt => opt.setName('title').setDescription('Embed Title').setRequired(true))
                .addStringOption(opt => opt.setName('description').setDescription('Embed Description').setRequired(true))
                .addBooleanOption(opt => opt.setName('multi_select').setDescription('Can users select multiple roles? (True=Yes, False=Only 1)').setRequired(true))
                .addRoleOption(opt => opt.setName('role1').setDescription('Role 1 (Required)').setRequired(true)) // Moved Up
                
                // --- OPTIONAL OPTIONS AFTER ---
                .addStringOption(opt => opt.setName('emoji1').setDescription('Emoji for Role 1').setRequired(false))
                .addChannelOption(opt => opt.setName('channel').setDescription('Where to post? (Optional)').addChannelTypes(ChannelType.GuildText))
                .addStringOption(opt => opt.setName('message_id').setDescription('Old message ID to replace (Optional)').setRequired(false))
                
                // Roles 2-10 (Optional)
                .addRoleOption(opt => opt.setName('role2').setDescription('Role 2').setRequired(false))
                .addStringOption(opt => opt.setName('emoji2').setDescription('Emoji for Role 2').setRequired(false))
                .addRoleOption(opt => opt.setName('role3').setDescription('Role 3').setRequired(false))
                .addStringOption(opt => opt.setName('emoji3').setDescription('Emoji for Role 3').setRequired(false))
                .addRoleOption(opt => opt.setName('role4').setDescription('Role 4').setRequired(false))
                .addStringOption(opt => opt.setName('emoji4').setDescription('Emoji for Role 4').setRequired(false))
                .addRoleOption(opt => opt.setName('role5').setDescription('Role 5').setRequired(false))
                .addStringOption(opt => opt.setName('emoji5').setDescription('Emoji for Role 5').setRequired(false))
                .addRoleOption(opt => opt.setName('role6').setDescription('Role 6').setRequired(false))
                .addStringOption(opt => opt.setName('emoji6').setDescription('Emoji for Role 6').setRequired(false))
                .addRoleOption(opt => opt.setName('role7').setDescription('Role 7').setRequired(false))
                .addStringOption(opt => opt.setName('emoji7').setDescription('Emoji for Role 7').setRequired(false))
                .addRoleOption(opt => opt.setName('role8').setDescription('Role 8').setRequired(false))
                .addStringOption(opt => opt.setName('emoji8').setDescription('Emoji for Role 8').setRequired(false))
                .addRoleOption(opt => opt.setName('role9').setDescription('Role 9').setRequired(false))
                .addStringOption(opt => opt.setName('emoji9').setDescription('Emoji for Role 9').setRequired(false))
                .addRoleOption(opt => opt.setName('role10').setDescription('Role 10').setRequired(false))
                .addStringOption(opt => opt.setName('emoji10').setDescription('Emoji for Role 10').setRequired(false));
            return sub;
        })

        // 2. ADD (Add to existing)
        .addSubcommand(sub => 
            sub.setName('add')
                .setDescription('Add a role to an EXISTING menu')
                // Required First
                .addStringOption(opt => opt.setName('message_id').setDescription('The Message ID of the menu').setRequired(true))
                .addRoleOption(opt => opt.setName('role').setDescription('The role to add').setRequired(true))
                // Optional After
                .addStringOption(opt => opt.setName('emoji').setDescription('Emoji for this role').setRequired(false))
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel where the menu is (if not here)').addChannelTypes(ChannelType.GuildText))
        )

        // 3. REMOVE (Remove from existing)
        .addSubcommand(sub => 
            sub.setName('remove')
                .setDescription('Remove a role from an EXISTING menu')
                // Required First
                .addStringOption(opt => opt.setName('message_id').setDescription('The Message ID of the menu').setRequired(true))
                .addRoleOption(opt => opt.setName('role').setDescription('The role to remove').setRequired(true))
                // Optional After
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel where the menu is (if not here)').addChannelTypes(ChannelType.GuildText))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        // --- SETUP COMMAND ---
        if (sub === 'setup') {
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            const multiSelect = interaction.options.getBoolean('multi_select');
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
            const oldMessageId = interaction.options.getString('message_id');

            if (!targetChannel.viewable || !targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
                return interaction.reply({ content: `<:no:1297814819105144862> I cannot send messages in ${targetChannel}.`, flags: MessageFlags.Ephemeral });
            }

            if (oldMessageId) {
                try {
                    const oldMsg = await targetChannel.messages.fetch(oldMessageId);
                    if (oldMsg) await oldMsg.delete();
                } catch (e) {}
            }

            const menu = new StringSelectMenuBuilder()
                .setCustomId('role_select_menu')
                .setPlaceholder('Select your roles...')
                .setMinValues(0);

            let validRoleCount = 0;

            for (let i = 1; i <= 10; i++) {
                const role = interaction.options.getRole(`role${i}`);
                const emoji = interaction.options.getString(`emoji${i}`);

                if (role) {
                    if (role.position >= interaction.guild.members.me.roles.highest.position) {
                        return interaction.reply({ content: `<:no:1297814819105144862> Role **${role.name}** is too high.`, flags: MessageFlags.Ephemeral });
                    }
                    const option = new StringSelectMenuOptionBuilder().setLabel(role.name).setValue(role.id);
                    if (emoji) option.setEmoji(emoji);
                    menu.addOptions(option);
                    validRoleCount++;
                }
            }

            if (multiSelect) {
                menu.setMaxValues(validRoleCount);
            } else {
                menu.setMaxValues(1);
            }

            const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x808080);
            const row = new ActionRowBuilder().addComponents(menu);

            await targetChannel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: `<:yes:1297814648417943565> Menu created in ${targetChannel}!`, flags: MessageFlags.Ephemeral });
        }

        // --- ADD COMMAND ---
        else if (sub === 'add') {
            const msgId = interaction.options.getString('message_id');
            const role = interaction.options.getRole('role');
            const emoji = interaction.options.getString('emoji');
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

            try {
                const message = await targetChannel.messages.fetch(msgId);
                if (!message) throw new Error();

                const oldActionRow = message.components[0];
                const oldMenu = oldActionRow.components[0];

                if (oldMenu.data.custom_id !== 'role_select_menu') {
                    return interaction.reply({ content: '<:no:1297814819105144862> That message is not a role menu.', flags: MessageFlags.Ephemeral });
                }

                const newMenu = StringSelectMenuBuilder.from(oldMenu);
                
                const newOption = new StringSelectMenuOptionBuilder()
                    .setLabel(role.name)
                    .setValue(role.id);
                if (emoji) newOption.setEmoji(emoji);

                newMenu.addOptions(newOption);
                
                // Smart Max Values
                if (oldMenu.data.max_values > 1) {
                    newMenu.setMaxValues(newMenu.options.length);
                } else {
                    newMenu.setMaxValues(1);
                }

                const row = new ActionRowBuilder().addComponents(newMenu);
                await message.edit({ components: [row] });

                return interaction.reply({ content: `<:yes:1297814648417943565> Added **${role.name}** to the menu!`, flags: MessageFlags.Ephemeral });

            } catch (err) {
                return interaction.reply({ content: '<:no:1297814819105144862> Message not found or invalid.', flags: MessageFlags.Ephemeral });
            }
        }

        // --- REMOVE COMMAND ---
        else if (sub === 'remove') {
            const msgId = interaction.options.getString('message_id');
            const role = interaction.options.getRole('role');
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

            try {
                const message = await targetChannel.messages.fetch(msgId);
                if (!message) throw new Error();

                const oldActionRow = message.components[0];
                const oldMenu = oldActionRow.components[0];

                const newMenu = StringSelectMenuBuilder.from(oldMenu);
                
                const currentOptions = newMenu.options;
                const filteredOptions = currentOptions.filter(opt => opt.data.value !== role.id);

                if (currentOptions.length === filteredOptions.length) {
                    return interaction.reply({ content: `<:no:1297814819105144862> Role **${role.name}** was not found in that menu.`, flags: MessageFlags.Ephemeral });
                }

                if (filteredOptions.length === 0) {
                     return interaction.reply({ content: `<:no:1297814819105144862> You cannot remove the last role. Delete the message instead.`, flags: MessageFlags.Ephemeral });
                }

                newMenu.setOptions(filteredOptions);

                // Smart Max Values
                if (oldMenu.data.max_values > 1) {
                    newMenu.setMaxValues(filteredOptions.length);
                } else {
                    newMenu.setMaxValues(1);
                }

                const row = new ActionRowBuilder().addComponents(newMenu);
                await message.edit({ components: [row] });

                return interaction.reply({ content: `<:yes:1297814648417943565> Removed **${role.name}** from the menu!`, flags: MessageFlags.Ephemeral });

            } catch (err) {
                console.log(err)
                return interaction.reply({ content: '<:no:1297814819105144862> Message not found or invalid.', flags: MessageFlags.Ephemeral });
            }
        }
    }
};
