const { 
    SlashCommandBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    LabelBuilder, 
    FileUploadBuilder,
    ContainerBuilder, 
    AttachmentBuilder, 
    MessageFlags, 
    PermissionFlagsBits 
} = require('discord.js');

// Native Node.js fetch (Node 18+)
// If on older Node, use: const { fetch } = require('undici');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('file')
        .setDescription('Manage file containers')
        .addSubcommand(subcommand =>
            subcommand.setName('send').setDescription('Open the file upload form')
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel to send to')))
        .addSubcommand(subcommand =>
            subcommand.setName('edit').setDescription('Edit a file message')
                .addStringOption(opt => opt.setName('message_id').setDescription('The Message ID').setRequired(true))
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel where the message is')))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            if (subcommand === 'send') await showSendModal(interaction);
            else if (subcommand === 'edit') await showEditModal(interaction);
        } catch (error) {
            console.error('Execute Error:', error);
            if (!interaction.replied) await interaction.reply({ content: `<:no:1297814819105144862> Error: ${error.message}`, ephemeral: true });
        }
    }
};

// ==========================================
// 1. SHOW MODALS
// ==========================================
async function showSendModal(interaction) {
    const modal = new ModalBuilder().setCustomId('file_modal_send').setTitle('Upload File');
    
    const nameInput = new TextInputBuilder()
        .setCustomId('name_input')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Title')
        .setRequired(true);

    const fileUpload = new FileUploadBuilder()
        .setCustomId('file_upload')
        .setMinValues(1)
        .setMaxValues(1)
        .setRequired(true);
    
    modal.addLabelComponents(
        new LabelBuilder().setLabel('Title').setTextInputComponent(nameInput),
        new LabelBuilder().setLabel('File').setFileUploadComponent(fileUpload)
    );
    
    await interaction.showModal(modal);
    await handleModalSubmit(interaction);
}

async function showEditModal(interaction) {
    const messageId = interaction.options.getString('message_id');
    const modal = new ModalBuilder().setCustomId(`file_modal_edit_${messageId}`).setTitle('Edit File');
    
    const nameInput = new TextInputBuilder()
        .setCustomId('name_input')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Leave empty to keep current')
        .setRequired(false);

    const fileUpload = new FileUploadBuilder()
        .setCustomId('file_upload')
        .setMaxValues(1)
        .setRequired(false);

    modal.addLabelComponents(
        new LabelBuilder().setLabel('New Title').setTextInputComponent(nameInput),
        new LabelBuilder().setLabel('New File').setFileUploadComponent(fileUpload)
    );

    await interaction.showModal(modal);
    await handleModalSubmit(interaction);
}

// ==========================================
// 2. HANDLE SUBMISSION
// ==========================================
async function handleModalSubmit(originalInteraction) {
    const submission = await originalInteraction.awaitModalSubmit({
        time: 300000, 
        filter: i => i.user.id === originalInteraction.user.id
    }).catch(() => null);

    if (!submission) return; 

    await submission.deferReply({ ephemeral: true });

    try {
        const customId = submission.customId;
        const isEdit = customId.startsWith('file_modal_edit');
        const targetChannel = originalInteraction.options.getChannel('channel') || originalInteraction.channel;

        // 1. DETERMINE REAL SERVER LIMIT
        // Tier 2 (Boosts) = 50MB. Tier 3 = 100MB. Default = 25MB.
        let uploadLimit = 25 * 1024 * 1024; // Default 25MB
        if (originalInteraction.guild.premiumTier >= 2) uploadLimit = 50 * 1024 * 1024;
        if (originalInteraction.guild.premiumTier >= 3) uploadLimit = 100 * 1024 * 1024;

        const nameText = submission.fields.getTextInputValue('name_input');
        const uploadedFiles = submission.fields.getUploadedFiles('file_upload');
        const uploadedFile = uploadedFiles ? uploadedFiles.first() : null;

        // 2. CHECK SIZE BEFORE TRYING
        if (uploadedFile && uploadedFile.size > uploadLimit) {
            throw new Error(`File is too large for this server! The bot limit is ${(uploadLimit / 1024 / 1024).toFixed(0)}MB.`);
        }

        if (!isEdit) {
            // SEND
            if (!uploadedFile) throw new Error("No file received.");
            
            // Use streaming helper
            const { container, filePayload } = await createStreamingContainer(nameText, uploadedFile.name, uploadedFile.url);

            await targetChannel.send({
                components: [container],
                files: [filePayload],
                flags: MessageFlags.IsComponentsV2
            });
            await submission.editReply(`<:yes:1297814648417943565> **File sent!**`);

        } else {
            // EDIT
            const messageId = customId.split('_').pop();
            const message = await targetChannel.messages.fetch(messageId);
            
            if (uploadedFile) {
                const finalName = nameText || uploadedFile.name;
                const { container, filePayload } = await createStreamingContainer(finalName, uploadedFile.name, uploadedFile.url);

                await message.edit({
                    components: [...message.components, container],
                    files: [filePayload], 
                    flags: MessageFlags.IsComponentsV2
                });
                await submission.editReply(`<:yes:1297814648417943565> **Added** new file.`);
            } else {
                // Update Text Only logic
                const components = [...message.components];
                const lastIndex = components.length - 1;
                const existingAttachment = message.attachments.at(lastIndex);
                
                if (!existingAttachment) throw new Error("No existing file found to reference.");

                // Simple container rebuild (no streaming needed for text update)
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(t => t.setContent(`### ${nameText}`))
                    .addSeparatorComponents(s => s)
                    .addFileComponents(f => f.setURL(`attachment://${existingAttachment.name}`));
                
                components[lastIndex] = container;
                
                await message.edit({ components, flags: MessageFlags.IsComponentsV2 });
                await submission.editReply(`<:yes:1297814648417943565> **Updated** title.`);
            }
        }
    } catch (e) {
        console.error(e);
        await submission.editReply(`<:no:1297814819105144862> **Error:** ${e.message}`);
    }
}

// ==========================================
// CRITICAL FIX: Manual Streaming
// ==========================================
async function createStreamingContainer(title, fileName, fileUrl) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(t => t.setContent(`### ${title}`))
        .addSeparatorComponents(s => s)
        .addFileComponents(f => f.setURL(`attachment://${fileName}`));

    let filePayload = null;
    if (fileUrl) {
        // 1. Manually fetch the file
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error("Failed to download file from Discord.");

        // 2. Create a Buffer (This is much more stable for 15MB+ files)
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 3. Attach the Buffer
        filePayload = new AttachmentBuilder(buffer, { name: fileName });
    }

    return { container, filePayload };
}
