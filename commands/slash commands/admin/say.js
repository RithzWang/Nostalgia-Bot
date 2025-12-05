const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Manage bot messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        
        // --- SUBCOMMAND 1: SEND ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('send')
                .setDescription('Make the bot say something new')
                .addStringOption(option =>
                    option.setName('content')
                        .setDescription('What should the bot say?')
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Where to send it? (Empty = Here)')
                        .addChannelTypes(ChannelType.GuildText)
                )
        )

        // --- SUBCOMMAND 2: EDIT ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit a message the bot already sent')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription(' The ID of the message to edit')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('content')
                        .setDescription('The new content')
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Which channel is the message in? (Empty = Here)')
                        .addChannelTypes(ChannelType.GuildText)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const content = interaction.options.getString('content');
        // Default to current channel if no channel is selected
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        // ===========================================
        // LOGIC FOR /say send
        // ===========================================
        if (subcommand === 'send') {
            try {
                await targetChannel.send(content);
                
                await interaction.reply({ 
                    content: `✅ Message sent to ${targetChannel}`, 
                    flags: MessageFlags.Ephemeral 
                });
            } catch (error) {
                await interaction.reply({ 
                    content: `❌ I cannot send messages in ${targetChannel}. Check my permissions!`, 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }

        // ===========================================
        // LOGIC FOR /say edit
        // ===========================================
        else if (subcommand === 'edit') {
            const messageId = interaction.options.getString('message_id');

            try {
                // 1. Fetch the message from the channel
                const messageToEdit = await targetChannel.messages.fetch(messageId);

                // 2. Check if the bot is the author
                if (messageToEdit.author.id !== interaction.client.user.id) {
                    return interaction.reply({ 
                        content: `❌ I can only edit my own messages! That message belongs to ${messageToEdit.author}.`, 
                        flags: MessageFlags.Ephemeral 
                    });
                }

                // 3. Edit the message
                await messageToEdit.edit(content);

                await interaction.reply({ 
                    content: `✅ Successfully edited the message in ${targetChannel}.`, 
                    flags: MessageFlags.Ephemeral 
                });

            } catch (error) {
                console.error(error);
                // Usually happens if the ID is wrong or message was deleted
                await interaction.reply({ 
                    content: `❌ I couldn't find that message in ${targetChannel}. Please check the Message ID.`, 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }
    },
};
