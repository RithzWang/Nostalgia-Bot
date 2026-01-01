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
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        .addSubcommand(sub => {
            sub.setName('setup')
                .setDescription('Create a NEW menu')
                .addStringOption(opt => opt.setName('title').setDescription('Embed Title').setRequired(true))
                .addBooleanOption(opt => opt.setName('multi_select').setDescription('Allow multiple roles?').setRequired(true))
                .addRoleOption(opt => opt.setName('role1').setDescription('Role 1 (Required)').setRequired(true))
                .addStringOption(opt => opt.setName('emoji1').setDescription('Emoji for Role 1'))
                .addChannelOption(opt => 
                    opt.setName('channel')
                        .setDescription('Where to post?')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.GuildVoice)
                )
                .addBooleanOption(opt => opt.setName('publish').setDescription('Publish if in an Announcement channel?'))
                .addStringOption(opt => opt.setName('message_id').setDescription('Reuse a bot message ID'));
            
            // Adding roles 2-10 loop for the builder
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
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel where the menu is').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.GuildVoice))
        )

        .addSubcommand(sub => 
            sub.setName('remove')
                .setDescription('Remove a role from an EXISTING menu')
                .addStringOption(opt => opt.setName('message_id').setDescription('The Message ID').setRequired(true))
                .addRoleOption(opt => opt.setName('role').setDescription('The role to remove').setRequired(true))
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel where the menu is').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.GuildVoice))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

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
                    descriptionLines.push(`**${emoji ? emoji + ' ' : ''}${role.name}**`);
                    menu.addOptions(option);
                    validRoleCount++;
                }
            }

            menu.setMaxValues(multiSelect ? validRoleCount : 1);
            menu.setPlaceholder(multiSelect ? `Select multiple roles` : `Select one role`);

            const embed = new EmbedBuilder().setTitle(title).setDescription(descriptionLines.join('\n')).setColor(0x808080);
            const row = new ActionRowBuilder().addComponents(menu);

            try {
                let finalMessage;
                if (reuseMessageId) {
                    const oldMsg = await targetChannel.messages.fetch(reuseMessageId);
                    finalMessage = await oldMsg.edit({ content: '', embeds: [embed], components: [row] });
                } else {
                    finalMessage = await targetChannel.send({ embeds: [embed], components: [row] });
                }

                if (publish && targetChannel.type === ChannelType.GuildAnnouncement) await finalMessage.crosspost();

                return interaction.reply({ content: `<:yes:1297814648417943565> Menu ready in ${targetChannel}!`, flags: MessageFlags.Ephemeral });
            } catch (e) {
                return interaction.reply({ content: '<:no:1297814819105144862> Failed to create menu. Check permissions or Message ID.', flags: MessageFlags.Ephemeral });
            }
        }

        else if (sub === 'add' || sub === 'remove') {
            const msgId = interaction.options.getString('message_id');
            const role = interaction.options.getRole('role');
            const emoji = interaction.options.getString('emoji');

            try {
                const message = await targetChannel.messages.fetch(msgId);
                const oldEmbed = message.embeds[0];
                const oldMenu = message.components[0].components[0];
                
                const newMenu = StringSelectMenuBuilder.from(oldMenu);
                const newEmbed = EmbedBuilder.from(oldEmbed);

                if (sub === 'add') {
                    const newOption = new StringSelectMenuOptionBuilder().setLabel(role.name).setValue(role.id);
                    if (emoji) newOption.setEmoji(emoji);
                    newMenu.addOptions(newOption);
                    const newDesc = (newEmbed.data.description || "") + `\n**${emoji ? emoji + ' ' : ''}${role.name}**`;
                    newEmbed.setDescription(newDesc);
                } else {
                    const filtered = newMenu.options.filter(o => o.data.value !== role.id);
                    newMenu.setOptions(filtered);
                    const newDesc = (newEmbed.data.description || "").split('\n').filter(l => !l.includes(role.name)).join('\n');
                    newEmbed.setDescription(newDesc);
                }

                newMenu.setMaxValues(oldMenu.maxValues > 1 ? newMenu.options.length : 1);
                await message.edit({ embeds: [newEmbed], components: [new ActionRowBuilder().addComponents(newMenu)] });
                
                return interaction.reply({ content: `<:yes:1297814648417943565> Menu updated in ${targetChannel}!`, flags: MessageFlags.Ephemeral });
            } catch (err) {
                return interaction.reply({ content: '<:no:1297814819105144862> Could not find or edit that menu message.', flags: MessageFlags.Ephemeral });
            }
        }
    }
};
