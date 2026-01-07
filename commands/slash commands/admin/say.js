const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('message')
        .setDescription('Manage bot messages')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        // --- SEND SUBCOMMAND ---
        .addSubcommand(sub => sub.setName('send').setDescription('Create a message')
            .addStringOption(opt => opt.setName('content').setDescription('Content').setRequired(true))
            .addBooleanOption(opt => opt.setName('mention').setDescription('Mention users?').setRequired(true))
            .addChannelOption(opt => opt.setName('channel').setDescription('Where to send?').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
            .addStringOption(opt => opt.setName('image').setDescription('Image Link (URL)')) // Added Image Option
        )
        // --- EDIT SUBCOMMAND ---
        .addSubcommand(sub => sub.setName('edit').setDescription('Edit a message')
            .addStringOption(opt => opt.setName('message_id').setDescription('Message ID').setRequired(true))
            .addStringOption(opt => opt.setName('content').setDescription('New content').setRequired(true))
            .addBooleanOption(opt => opt.setName('mention').setDescription('Mention users?').setRequired(true))
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
            .addStringOption(opt => opt.setName('image').setDescription('New Image Link (URL)')) // Added Image Option
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const content = interaction.options.getString('content');
        const shouldMention = interaction.options.getBoolean('mention');
        const image = interaction.options.getString('image'); // Get the image link
        
        // 1. Get partial
        let targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        const allowedMentions = shouldMention ? { parse: ['users', 'roles', 'everyone'] } : { parse: [] };

        // 2. Construct Payload
        const payload = { content: content, allowedMentions: allowedMentions };
        if (image) {
            payload.files = [image]; // Adds the image if provided
        }

        try {
            // 3. FETCH FULL CHANNEL
            targetChannel = await interaction.guild.channels.fetch(targetChannel.id);

            if (subcommand === 'send') {
                await targetChannel.send(payload);
                await interaction.reply({ content: `<:yes:1297814648417943565> Sent to ${targetChannel}.`, flags: MessageFlags.Ephemeral });
            } 
            else if (subcommand === 'edit') {
                const messageId = interaction.options.getString('message_id');
                const messageToEdit = await targetChannel.messages.fetch(messageId);

                if (messageToEdit.author.id !== interaction.client.user.id) {
                    return interaction.reply({ content: `❌ Not my message.`, flags: MessageFlags.Ephemeral });
                }

                await messageToEdit.edit(payload);
                await interaction.reply({ content: `<:yes:1297814648417943565> Message edited.`, flags: MessageFlags.Ephemeral });
            }
        } catch (error) {
            await interaction.reply({ content: `<:no:1297814819105144862> Error: ${error.message}`, flags: MessageFlags.Ephemeral });
        }
    },
};
