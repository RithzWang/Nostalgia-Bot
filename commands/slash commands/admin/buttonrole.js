const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ButtonBuilder, 
    ButtonStyle, 
    ActionRowBuilder,
    MessageFlags 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buttonrole')
        .setDescription('Manage role buttons on messages.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // --- SUBCOMMAND: ADD ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a clickable role button to a message.')
                .addChannelOption(option => 
                    option.setName('channel')
                    .setDescription('The channel where the message is.')
                    .setRequired(true))
                .addStringOption(option => 
                    option.setName('message_id')
                    .setDescription('The ID of the message.')
                    .setRequired(true))
                .addStringOption(option => 
                    option.setName('text')
                    .setDescription('The text on the button.')
                    .setRequired(true))
                .addRoleOption(option => 
                    option.setName('role')
                    .setDescription('The role to give when clicked.')
                    .setRequired(true))
                .addStringOption(option => 
                    option.setName('colour')
                    .setDescription('The button colour.')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Blue (Primary)', value: 'Primary' },
                        { name: 'Grey (Secondary)', value: 'Secondary' },
                        { name: 'Green (Success)', value: 'Success' },
                        { name: 'Red (Danger)', value: 'Danger' }
                    ))
                // NEW OPTION HERE
                .addBooleanOption(option => 
                    option.setName('verify')
                    .setDescription('True: User gets role but cannot remove it. False: User can toggle role on/off.')
                    .setRequired(true))
                .addStringOption(option => 
                    option.setName('emoji')
                    .setDescription('Optional emoji.')
                    .setRequired(false)))

        // --- SUBCOMMAND: REMOVE ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a role button from a message.')
                .addChannelOption(option => 
                    option.setName('channel')
                    .setDescription('The channel where the message is.')
                    .setRequired(true))
                .addStringOption(option => 
                    option.setName('message_id')
                    .setDescription('The ID of the message.')
                    .setRequired(true))
                .addRoleOption(option => 
                    option.setName('role')
                    .setDescription('The role associated with the button you want to delete.')
                    .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const channel = interaction.options.getChannel('channel');
        const messageId = interaction.options.getString('message_id');
        const role = interaction.options.getRole('role');

        let message;
        try {
            message = await channel.messages.fetch(messageId);
            if (!message) throw new Error('Message not found');
        } catch (error) {
            return interaction.reply({ 
                content: `❌ Could not find that message in ${channel}. Check the ID.`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        // ==========================================
        // LOGIC: ADD BUTTON
        // ==========================================
        if (subcommand === 'add') {
            const text = interaction.options.getString('text');
            const colorStr = interaction.options.getString('colour');
            const emoji = interaction.options.getString('emoji');
            const isVerify = interaction.options.getBoolean('verify'); // Get the verify setting

            if (role.position >= interaction.guild.members.me.roles.highest.position) {
                return interaction.reply({ 
                    content: '❌ That role is higher than my highest role. I cannot give it.', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            try {
                const styleMap = {
                    'Primary': ButtonStyle.Primary,
                    'Secondary': ButtonStyle.Secondary,
                    'Success': ButtonStyle.Success,
                    'Danger': ButtonStyle.Danger
                };

                // STORE SETTING IN ID: role_ID_1 (Verify) or role_ID_0 (Toggle)
                const modeFlag = isVerify ? '1' : '0';
                const button = new ButtonBuilder()
                    .setCustomId(`role_${role.id}_${modeFlag}`) 
                    .setLabel(text)
                    .setStyle(styleMap[colorStr]);

                if (emoji) button.setEmoji(emoji);

                let components = message.components.map(c => ActionRowBuilder.from(c));

                let added = false;
                for (let row of components) {
                    if (row.components.length < 5) {
                        row.addComponents(button);
                        added = true;
                        break;
                    }
                }

                if (!added) {
                    if (components.length >= 5) {
                        return interaction.reply({ 
                            content: '❌ This message has too many buttons (Max 5 rows).', 
                            flags: MessageFlags.Ephemeral 
                        });
                    }
                    const newRow = new ActionRowBuilder().addComponents(button);
                    components.push(newRow);
                }

                await message.edit({ components: components });

                await interaction.reply({ 
                    content: `<a:success:1297818086463770695> Added **${isVerify ? 'Verify' : 'Toggle'}** button for **${role.name}**!`, 
                    flags: MessageFlags.Ephemeral 
                });

            } catch (error) {
                console.error(error);
                await interaction.reply({ content: `❌ Error: ${error.message}`, flags: MessageFlags.Ephemeral });
            }
        
        // ==========================================
        // LOGIC: REMOVE BUTTON
        // ==========================================
        } else if (subcommand === 'remove') {
            try {
                // We check if it starts with the role ID (ignores the _0 or _1 at the end)
                const targetPrefix = `role_${role.id}`;
                let found = false;

                const newComponents = message.components.map(row => {
                    const newRow = ActionRowBuilder.from(row);
                    const filteredComponents = newRow.components.filter(component => {
                        // Check if the ID *starts with* our target
                        if (component.data.custom_id && component.data.custom_id.startsWith(targetPrefix)) {
                            found = true;
                            return false; // Remove it
                        }
                        return true; // Keep it
                    });
                    newRow.setComponents(filteredComponents);
                    return newRow;
                }).filter(row => row.components.length > 0);

                if (!found) {
                    return interaction.reply({ 
                        content: `❌ I couldn't find a button for **${role.name}** on that message.`, 
                        flags: MessageFlags.Ephemeral 
                    });
                }

                await message.edit({ components: newComponents });

                await interaction.reply({ 
                    content: `<a:success:1297818086463770695> Removed the button for **${role.name}**.`, 
                    flags: MessageFlags.Ephemeral 
                });

            } catch (error) {
                console.error(error);
                await interaction.reply({ content: `❌ Error: ${error.message}`, flags: MessageFlags.Ephemeral });
            }
        }
    }
};
