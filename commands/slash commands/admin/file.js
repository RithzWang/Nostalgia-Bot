const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    MessageFlags, 
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder, // <--- IMPORTANT: Added this
    FileBuilder,
    AttachmentBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('file')
        .setDescription('Send or Edit a File Card')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        
        // --- SUBCOMMAND: SEND ---
        .addSubcommand(sub => 
            sub.setName('send')
                .setDescription('Send a new file')
                .addStringOption(opt => opt.setName('name').setDescription('The display name').setRequired(true))
                .addAttachmentOption(opt => opt.setName('file').setDescription('The file to upload').setRequired(true))
                .addStringOption(opt => opt.setName('message_id').setDescription('Reply to this Message ID (Optional)').setRequired(false))
                .addChannelOption(opt => opt.setName('channel').setDescription('Target Channel (Optional)').addChannelTypes(ChannelType.GuildText))
        )

        // --- SUBCOMMAND: EDIT ---
        .addSubcommand(sub => 
            sub.setName('edit')
                .setDescription('Edit an existing File Card')
                .addStringOption(opt => opt.setName('message_id').setDescription('The Bot Message ID to edit').setRequired(true))
                .addStringOption(opt => opt.setName('name').setDescription('New display name (Optional)'))
                .addAttachmentOption(opt => opt.setName('file').setDescription('New file (Optional)'))
                .addChannelOption(opt => opt.setName('channel').setDescription('Where is the message? (Optional)'))
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const sub = interaction.options.getSubcommand();

        // --- HELPER: RENDER UI ---
        const renderCard = (displayName, url, originalFilename) => {
            const container = new ContainerBuilder()
                .setAccentColor(0x5865F2); // Blurple

            // 1. SECTION (Text requires a Section wrapper)
            const textSection = new SectionBuilder();
            textSection.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ${displayName}`)
            );
            container.addSectionComponents(textSection);

            // 2. SEPARATOR
            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            );

            // --- FILENAME LOGIC ---
            const extension = originalFilename.includes('.') ? originalFilename.split('.').pop() : '';
            
            // Clean the name (Remove special chars that might break the attachment link)
            let finalFilename = displayName.replace(/[^a-zA-Z0-9 _-]/g, "").trim(); 
            if (!finalFilename) finalFilename = "file";
            
            // Append extension if missing
            if (extension && !finalFilename.endsWith(`.${extension}`)) {
                finalFilename = `${finalFilename}.${extension}`;
            }

            // 3. ATTACHMENT
            const attachment = new AttachmentBuilder(url, { name: finalFilename });

            // 4. FILE CARD
            // Note: We use encodeURIComponent just in case the name has spaces
            const fileComponent = new FileBuilder()
                .setURL(`attachment://${finalFilename}`);
            
            container.addFileComponents(fileComponent);

            return { 
                content: '',
                components: [container], 
                files: [attachment],
                flags: MessageFlags.IsComponentsV2
            };
        };

        try {
            // ===========================================
            //                 SEND
            // ===========================================
            if (sub === 'send') {
                const name = interaction.options.getString('name');
                const file = interaction.options.getAttachment('file');
                const replyToId = interaction.options.getString('message_id');
                const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

                const payload = renderCard(name, file.url, file.name);

                if (replyToId) {
                    try {
                        const messageToReply = await targetChannel.messages.fetch(replyToId);
                        await messageToReply.reply(payload);
                        return interaction.editReply(`<:yes:1297814648417943565> Replied to \`${replyToId}\` with **${name}**.`);
                    } catch (e) {
                        return interaction.editReply(`<:no:1297814819105144862> Message \`${replyToId}\` not found.`);
                    }
                } else {
                    await targetChannel.send(payload);
                    return interaction.editReply(`<:yes:1297814648417943565> Sent **${name}** in ${targetChannel}.`);
                }
            }

            // ===========================================
            //                 EDIT
            // ===========================================
            if (sub === 'edit') {
                const msgId = interaction.options.getString('message_id');
                const newName = interaction.options.getString('name');
                const newFile = interaction.options.getAttachment('file');
                const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

                let message;
                try {
                    message = await targetChannel.messages.fetch(msgId);
                } catch (e) {
                    return interaction.editReply(`<:no:1297814819105144862> Message \`${msgId}\` not found.`);
                }

                if (message.author.id !== interaction.client.user.id) {
                    return interaction.editReply(`<:no:1297814819105144862> I can only edit my own messages.`);
                }

                if (!newName && !newFile) {
                    return interaction.editReply(`<:no:1297814819105144862> Provide a new name or file.`);
                }

                // --- RECOVER OLD DATA ---
                // Fallback to "Updated File" if we can't find a name and user didn't provide one
                let currentName = newName || (newFile ? newFile.name : "Updated File");
                
                // Get old file if no new file provided
                const fileUrl = newFile ? newFile.url : (message.attachments.first()?.url);
                const fileName = newFile ? newFile.name : (message.attachments.first()?.name || 'file');

                if (!fileUrl) {
                     return interaction.editReply(`<:no:1297814819105144862> Old file not found. Please upload a new one.`);
                }

                const payload = renderCard(currentName, fileUrl, fileName);
                
                await message.edit(payload);
                return interaction.editReply(`<:yes:1297814648417943565> Updated message \`${msgId}\`.`);
            }

        } catch (error) {
            console.error(error);
            return interaction.editReply(`<:no:1297814819105144862> Error: ${error.message}`);
        }
    }
};
