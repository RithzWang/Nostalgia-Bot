const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('message')
        .setDescription('Manage bot messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(sub => sub.setName('send').setDescription('Create a message')
            .addStringOption(opt => opt.setName('content').setDescription('Content').setRequired(true))
            .addBooleanOption(opt => opt.setName('mention').setDescription('Mention users?').setRequired(true))
            .addChannelOption(opt => opt.setName('channel').setDescription('Where to send?').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
            .addBooleanOption(opt => opt.setName('publish').setDescription('Auto-publish?'))
        )
        .addSubcommand(sub => sub.setName('edit').setDescription('Edit a message')
            .addStringOption(opt => opt.setName('message_id').setDescription('Message ID').setRequired(true))
            .addStringOption(opt => opt.setName('content').setDescription('New content').setRequired(true))
            .addBooleanOption(opt => opt.setName('mention').setDescription('Mention users?').setRequired(true))
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const content = interaction.options.getString('content');
        const shouldMention = interaction.options.getBoolean('mention');
        const publish = interaction.options.getBoolean('publish') || false;
        
        // 1. Get partial
        let targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        const allowedMentions = shouldMention ? { parse: ['users', 'roles', 'everyone'] } : { parse: [] };

        try {
            // 2. FETCH FULL CHANNEL (The Fix)
            targetChannel = await interaction.guild.channels.fetch(targetChannel.id);

            if (subcommand === 'send') {
                const sentMessage = await targetChannel.send({ content: content, allowedMentions: allowedMentions });
                if (publish && targetChannel.type === ChannelType.GuildAnnouncement) await sentMessage.crosspost();
                
                await interaction.reply({ content: `<:yes:1297814648417943565> Sent to ${targetChannel}.`, flags: MessageFlags.Ephemeral });
            } 
            else if (subcommand === 'edit') {
                const messageId = interaction.options.getString('message_id');
                const messageToEdit = await targetChannel.messages.fetch(messageId);

                if (messageToEdit.author.id !== interaction.client.user.id) return interaction.reply({ content: `❌ Not my message.`, flags: MessageFlags.Ephemeral });

                await messageToEdit.edit({ content: content, allowedMentions: allowedMentions });
                await interaction.reply({ content: `<:yes:1297814648417943565> Message edited.`, flags: MessageFlags.Ephemeral });
            }
        } catch (error) {
            await interaction.reply({ content: `<:no:1297814819105144862> Error: ${error.message}`, flags: MessageFlags.Ephemeral });
        }
    },
};
