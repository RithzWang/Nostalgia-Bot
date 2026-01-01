const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('message')
        .setDescription('Manage bot messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        
        // --- SUBCOMMAND 1: SEND ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('send')
                .setDescription('Create a message')
                .addStringOption(option =>
                    option.setName('content')
                        .setDescription('What should the bot say?')
                        .setRequired(true)
                )
                .addBooleanOption(option => 
                    option.setName('mention')
                        .setDescription('Should I mention?')
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Where to send it?')
                        .addChannelTypes(
                            ChannelType.GuildText, 
                            ChannelType.GuildAnnouncement, 
                            ChannelType.PublicThread, 
                            ChannelType.PrivateThread, 
                            ChannelType.GuildVoice
                        )
                )
                .addBooleanOption(option => 
                    option.setName('publish')
                        .setDescription('Publish if sent to an Announcement channel?')
                )
        )

        // --- SUBCOMMAND 2: EDIT ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit an existing message')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('The ID of the message to edit')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('content')
                        .setDescription('The new content')
                        .setRequired(true)
                )
                .addBooleanOption(option => 
                    option.setName('mention')
                        .setDescription('Should I mention?')
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Which channel is the message in?')
                        .addChannelTypes(
                            ChannelType.GuildText, 
                            ChannelType.GuildAnnouncement, 
                            ChannelType.PublicThread, 
                            ChannelType.PrivateThread,
                            ChannelType.GuildVoice
                        )
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const content = interaction.options.getString('content');
        const shouldMention = interaction.options.getBoolean('mention');
        const publish = interaction.options.getBoolean('publish') || false;
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        const allowedMentions = shouldMention 
            ? { parse: ['users', 'roles', 'everyone'] } 
            : { parse: [] };

        // --- LOGIC FOR SEND ---
        if (subcommand === 'send') {
            try {
                const sentMessage = await targetChannel.send({ 
                    content: content, 
                    allowedMentions: allowedMentions 
                });

                // Check for announcement channel and publish if requested
                if (publish && targetChannel.type === ChannelType.GuildAnnouncement) {
                    await sentMessage.crosspost();
                }
                
                await interaction.reply({ 
                    content: `<:yes:1297814648417943565> Sent to ${targetChannel}.${publish ? ' (Published)' : ''}`, 
                    flags: MessageFlags.Ephemeral 
                });
            } catch (error) {
                console.error(error);
                await interaction.reply({ 
                    content: `<:no:1297814819105144862> Failed to send. Check permissions in ${targetChannel}.`, 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }

        // --- LOGIC FOR EDIT ---
        else if (subcommand === 'edit') {
            const messageId = interaction.options.getString('message_id');

            try {
                const messageToEdit = await targetChannel.messages.fetch(messageId);

                if (messageToEdit.author.id !== interaction.client.user.id) {
                    return interaction.reply({ 
                        content: `❌ I can only edit my own messages.`, 
                        flags: MessageFlags.Ephemeral 
                    });
                }

                await messageToEdit.edit({ 
                    content: content, 
                    allowedMentions: allowedMentions 
                });

                await interaction.reply({ 
                    content: `<:yes:1297814648417943565> Message edited in ${targetChannel}.`, 
                    flags: MessageFlags.Ephemeral 
                });

            } catch (error) {
                await interaction.reply({ 
                    content: `<:no:1297814819105144862> Could not find message ID \`${messageId}\` in ${targetChannel}.`, 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }
    },
};
