const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    MessageFlags, 
    ChannelType,
    ContainerBuilder,
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
            
            // 1. Clean Filename Logic
            const extension = originalFilename.includes('.') ? originalFilename.split('.').pop() : '';
            // Remove special characters that might break the attachment link
            let finalFilename = displayName.replace(/[^a-zA-Z0-9 _-]/g, "").trim(); 
            if (!finalFilename) finalFilename = "file";
            
            // Append extension if missing
            if (extension && !finalFilename.endsWith(`.${extension}`)) {
                finalFilename = `${finalFilename}.${extension}`;
            }

            // 2. Build Container
            const container = new ContainerBuilder()
                .setAccentColor(0x5865F2) // Blurple
                
                // A. TEXT (Using Callback Style)
                .addTextDisplayComponents((text) => 
                    text.setContent(`### ${displayName}`)
                )

                // B. SEPARATOR (Using Callback Style)
                .addSeparatorComponents((sep) => 
                    sep.setSpacing(SeparatorSpacingSize.Small)
                )

                // C. FILE (Using Instance Style)
                .addFileComponents(
                    new FileBuilder().setURL(`attachment://${finalFilename}`)
                );

            // 3. Create Attachment Object
            const attachment = new AttachmentBuilder(url, { name: finalFilename });

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
                let currentName = newName || (newFile ? newFile.name : "Updated File");
                
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
