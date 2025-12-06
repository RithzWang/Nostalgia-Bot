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
                        .setDescription('Where to send it? Empty = Here')
                        .addChannelTypes(ChannelType.GuildText)
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
                        .setDescription('Which channel is the message in? Empty = Here')
                        .addChannelTypes(ChannelType.GuildText)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const content = interaction.options.getString('content');
        const shouldMention = interaction.options.getBoolean('mention');
        
        // Default to current channel if no channel is selected
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        // Determine Allowed Mentions logic
        // If true: Allow 'users', 'roles', and 'everyone' to be pinged
        // If false: Allow NOTHING to be pinged (silent)
        const allowedMentions = shouldMention 
            ? { parse: ['users', 'roles', 'everyone'] } 
            : { parse: [] };

        // ===========================================
        // LOGIC FOR /say send
        // ===========================================
        if (subcommand === 'send') {
            try {
                // FIXED: Options object must be inside send({ ... })
                await targetChannel.send({ 
                    content: content, 
                    allowedMentions: allowedMentions 
                });
                
                await interaction.reply({ 
                    content: `I sent the message to ${targetChannel}. (Mentions: ${shouldMention ? 'ON' : 'OFF'})`, 
                    flags: MessageFlags.Ephemeral 
                });
            } catch (error) {
                console.error(error);
                await interaction.reply({ 
                    content: `I cannot send messages in ${targetChannel}. Please check my permissions!`, 
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
                const messageToEdit = await targetChannel.messages.fetch(messageId);

                if (messageToEdit.author.id !== interaction.client.user.id) {
                    return interaction.reply({ 
                        content: `I can only edit my own messages.`, 
                        flags: MessageFlags.Ephemeral 
                    });
                }

                // FIXED: Options object must be inside edit({ ... })
                await messageToEdit.edit({ 
                    content: content, 
                    allowedMentions: allowedMentions 
                });

                await interaction.reply({ 
                    content: `I successfully edited the message in ${targetChannel}.`, 
                    flags: MessageFlags.Ephemeral 
                });

            } catch (error) {
                console.error(error);
                await interaction.reply({ 
                    content: `I couldn’t find that message in ${targetChannel}. Please check the Message ID!`, 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }
    },
};
