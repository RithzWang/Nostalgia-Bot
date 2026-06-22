const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags, ContainerBuilder, TextDisplayBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('message')
        .setDescription('Manage bot messages')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        
        // --- SEND SUBCOMMAND ---
        .addSubcommand(sub => sub.setName('send').setDescription('Create a message')
            .addStringOption(opt => opt.setName('content').setDescription('Content').setRequired(true))
            .addBooleanOption(opt => opt.setName('mention').setDescription('Mention users? (Defaults to True)').setRequired(false))
            .addChannelOption(opt => opt.setName('channel').setDescription('Where to send?').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
            .addStringOption(opt => opt.setName('image').setDescription('Image Link (URL)'))
        )
        
        // --- EDIT SUBCOMMAND ---
        .addSubcommand(sub => sub.setName('edit').setDescription('Edit a message')
            .addStringOption(opt => opt.setName('message_id').setDescription('Message ID').setRequired(true))
            .addStringOption(opt => opt.setName('content').setDescription('New content').setRequired(true))
            .addBooleanOption(opt => opt.setName('mention').setDescription('Mention users? (Defaults to True)').setRequired(false))
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
            .addStringOption(opt => opt.setName('image').setDescription('New Image Link (URL)'))
        )

        // --- REPLY SUBCOMMAND ---
        .addSubcommand(sub => sub.setName('reply').setDescription('Reply directly to a specific message')
            .addStringOption(opt => opt.setName('message_id').setDescription('The ID of the message to reply to').setRequired(true))
            .addStringOption(opt => opt.setName('content').setDescription('Content').setRequired(true))
            .addBooleanOption(opt => opt.setName('mention').setDescription('Mention users? (Defaults to True)').setRequired(false))
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel the message is in').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
            .addStringOption(opt => opt.setName('image').setDescription('Image Link (URL)'))
        )

        // --- CONTAINER SUBCOMMAND (V2 COMPONENTS) ---
        .addSubcommand(sub => sub.setName('container').setDescription('Send a message in a V2 container')
            .addStringOption(opt => opt.setName('content').setDescription('Content').setRequired(true))
            .addBooleanOption(opt => opt.setName('mention').setDescription('Mention users? (Defaults to True)').setRequired(false))
            .addChannelOption(opt => opt.setName('channel').setDescription('Where to send?').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        )

        // --- REACT SUBCOMMAND ---
        .addSubcommand(sub => sub.setName('react').setDescription('Add reactions to a message')
            .addStringOption(opt => opt.setName('message_id').setDescription('Message ID').setRequired(true))
            .addStringOption(opt => opt.setName('emoji').setDescription('Standard emojis (👍) or custom emojis (<:name:id>) separated by spaces').setRequired(true))
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel the message is in').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        )

        // --- PIN SUBCOMMAND ---
        .addSubcommand(sub => sub.setName('pin').setDescription('Pin a message in the channel')
            .addStringOption(opt => opt.setName('message_id').setDescription('Message ID').setRequired(true))
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel the message is in').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        // 1. Get channel (defaulting to the current one)
        let targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        
        // 2. Fetch options
        const content = interaction.options.getString('content');
        const shouldMention = interaction.options.getBoolean('mention') ?? true; 
        const image = interaction.options.getString('image');
        
        // 3. Construct Standard Payload
        let payload = {};
        if (content !== null) {
            const allowedMentions = shouldMention ? { parse: ['users', 'roles', 'everyone'] } : { parse: [] };
            payload = { content: content, allowedMentions: allowedMentions };
            if (image) payload.files = [image];
        }

        try {
            // FETCH FULL CHANNEL
            targetChannel = await interaction.guild.channels.fetch(targetChannel.id);

            // =========================
            //      SEND LOGIC
            // =========================
            if (subcommand === 'send') {
                await targetChannel.send(payload);
                await interaction.reply({ content: `<:yes:1297814648417943565> Sent to ${targetChannel}.`, flags: MessageFlags.Ephemeral });
            } 
            
            // =========================
            //      EDIT LOGIC
            // =========================
            else if (subcommand === 'edit') {
                const messageId = interaction.options.getString('message_id');
                const messageToEdit = await targetChannel.messages.fetch(messageId);

                if (messageToEdit.author.id !== interaction.client.user.id) {
                    return interaction.reply({ content: `❌ I can only edit my own messages.`, flags: MessageFlags.Ephemeral });
                }

                await messageToEdit.edit(payload);
                await interaction.reply({ content: `<:yes:1297814648417943565> Message edited.`, flags: MessageFlags.Ephemeral });
            }

            // =========================
            //      REPLY LOGIC
            // =========================
            else if (subcommand === 'reply') {
                const messageId = interaction.options.getString('message_id');
                const targetMessage = await targetChannel.messages.fetch(messageId);

                await targetMessage.reply(payload);
                await interaction.reply({ content: `<:yes:1297814648417943565> Replied to the message.`, flags: MessageFlags.Ephemeral });
            }

            // =========================
            //      CONTAINER LOGIC (V2)
            // =========================
            else if (subcommand === 'container') {
                const components = [
                    new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(content)
                        ),
                ];

                const containerPayload = { 
                    components: components, 
                    allowedMentions: payload.allowedMentions,
                    flags: MessageFlags.IsComponentsV2 // <-- This is the magic flag required for V2 Components!
                };

                await targetChannel.send(containerPayload);
                await interaction.reply({ content: `<:yes:1297814648417943565> Container sent to ${targetChannel}.`, flags: MessageFlags.Ephemeral });
            }

            // =========================
            //      REACT LOGIC
            // =========================
            else if (subcommand === 'react') {
                const messageId = interaction.options.getString('message_id');
                const emojiInput = interaction.options.getString('emoji');
                const targetMessage = await targetChannel.messages.fetch(messageId);

                const emojisToReact = emojiInput.split(/\s+/);
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                let successCount = 0;

                for (const rawEmoji of emojisToReact) {
                    if (!rawEmoji) continue;
                    const customMatch = rawEmoji.match(/<a?:.+:(\d+)>/);
                    const resolvedEmoji = customMatch ? customMatch[1] : rawEmoji;

                    try {
                        await targetMessage.react(resolvedEmoji);
                        successCount++;
                    } catch (err) {
                        console.error(`Failed to react with ${resolvedEmoji}`);
                    }
                }

                await interaction.editReply({ 
                    content: `<:yes:1297814648417943565> Successfully added ${successCount} reaction(s).` 
                });
            }

            // =========================
            //      PIN LOGIC
            // =========================
            else if (subcommand === 'pin') {
                const messageId = interaction.options.getString('message_id');
                const targetMessage = await targetChannel.messages.fetch(messageId);

                await targetMessage.pin();
                await interaction.reply({ content: `<:yes:1297814648417943565> Message pinned successfully.`, flags: MessageFlags.Ephemeral });
            }

        } catch (error) {
            console.error(error);
            if (interaction.deferred) {
                await interaction.editReply({ content: `<:no:1297814819105144862> Error: ${error.message}` });
            } else {
                await interaction.reply({ content: `<:no:1297814819105144862> Error: ${error.message}`, flags: MessageFlags.Ephemeral });
            }
        }
    },
};
