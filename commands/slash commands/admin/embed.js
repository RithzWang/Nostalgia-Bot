const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Create and edit embed messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand.setName('create').setDescription('Create a message embed')
                .addStringOption(option => option.setName('title').setDescription('The title of the embed'))
                .addStringOption(option => option.setName('description').setDescription('The description of the embed'))
                .addStringOption(option => option.setName('color').setDescription('Hex color (e.g. #FF0000)'))
                .addChannelOption(option => option.setName('channel').setDescription('Where to send/edit it?').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
                .addStringOption(option => option.setName('message_id').setDescription('OPTIONAL: Attach to existing bot message'))
                .addBooleanOption(option => option.setName('publish').setDescription('Automatically publish?'))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('edit').setDescription('Edit an existing embed')
                .addStringOption(option => option.setName('message_id').setDescription('ID of the message').setRequired(true))
                .addStringOption(option => option.setName('title').setDescription('New title'))
                .addStringOption(option => option.setName('description').setDescription('New description'))
                .addStringOption(option => option.setName('color').setDescription('New color'))
                .addChannelOption(option => option.setName('channel').setDescription('Which channel is the message in?').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        // 1. Get partial channel
        let targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            // 2. FETCH FULL CHANNEL (The Fix)
            targetChannel = await interaction.guild.channels.fetch(targetChannel.id);

            if (subcommand === 'create') {
                const title = interaction.options.getString('title');
                const description = interaction.options.getString('description');
                const color = interaction.options.getString('color') || '#888888';
                const publish = interaction.options.getBoolean('publish') || false;
                const reuseMessageId = interaction.options.getString('message_id');

                if (!title && !description) return interaction.reply({ content: '<:no:1297814819105144862> Provide Title or Description!', flags: MessageFlags.Ephemeral });

                const embed = new EmbedBuilder().setColor(color);
                if (title) embed.setTitle(title);
                if (description) embed.setDescription(description);

                if (reuseMessageId) {
                    const messageToReuse = await targetChannel.messages.fetch(reuseMessageId);
                    if (!messageToReuse || messageToReuse.author.id !== interaction.client.user.id) {
                         return interaction.reply({ content: `<:no:1297814819105144862> Invalid message ID or not my message.`, flags: MessageFlags.Ephemeral });
                    }
                    await messageToReuse.edit({ embeds: [embed] });
                    setTimeout(() => messageToReuse.edit({ content: null }).catch(() => {}), 3000);
                    
                    await interaction.reply({ content: `<:yes:1297814648417943565> Updated message!`, flags: MessageFlags.Ephemeral });
                } else {
                    const sentMessage = await targetChannel.send({ embeds: [embed] });
                    if (publish && targetChannel.type === ChannelType.GuildAnnouncement) await sentMessage.crosspost();
                    
                    await interaction.reply({ content: `<:yes:1297814648417943565> Embed sent in ${targetChannel}.`, flags: MessageFlags.Ephemeral });
                }
            } 
            else if (subcommand === 'edit') {
                const messageId = interaction.options.getString('message_id');
                const newTitle = interaction.options.getString('title');
                const newDescription = interaction.options.getString('description');
                const newColor = interaction.options.getString('color');

                const messageToEdit = await targetChannel.messages.fetch(messageId);
                if (messageToEdit.author.id !== interaction.client.user.id) return interaction.reply({ content: `<:no:1297814819105144862> I can only edit my messages.`, flags: MessageFlags.Ephemeral });

                const newEmbed = new EmbedBuilder(messageToEdit.embeds[0]?.data || {});
                if (newTitle) newEmbed.setTitle(newTitle);
                if (newDescription) newEmbed.setDescription(newDescription);
                if (newColor) newEmbed.setColor(newColor);

                await messageToEdit.edit({ embeds: [newEmbed] });
                await interaction.reply({ content: `<:yes:1297814648417943565> Edited embed in ${targetChannel}.`, flags: MessageFlags.Ephemeral });
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: `<:no:1297814819105144862> Error: ${error.message}`, flags: MessageFlags.Ephemeral });
        }
    },
};
