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

// Custom Emojis
const EMOJI = {
    YES: '<:yes:1297814648417943565>',
    NO: '<:no:1297814819105144862>'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('file')
        .setDescription('Manage file containers')
        // Subcommand: SEND
        .addSubcommand(subcommand =>
            subcommand
                .setName('send')
                .setDescription('Open the file upload form')
                .addChannelOption(option => 
                    option.setName('channel').setDescription('Optional: Channel to send to (defaults to current)')))
        // Subcommand: EDIT
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit or Add to a file message')
                .addStringOption(option => 
                    option.setName('message_id').setDescription('The Message ID').setRequired(true))
                .addChannelOption(option => 
                    option.setName('channel').setDescription('Optional: Channel where the message is')))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        // NOTE: We do NOT deferReply here because we must show a Modal immediately.
        try {
            const subcommand = interaction.options.getSubcommand();
            if (subcommand === 'send') {
                await showSendModal(interaction);
            } else if (subcommand === 'edit') {
                await showEditModal(interaction);
            }
        } catch (error) {
            console.error('Execute Error:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: `${EMOJI.NO} Error: ${error.message}`, ephemeral: true });
            }
        }
    }
};

// ==========================================
// 1. SHOW MODALS
// ==========================================
async function showSendModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('file_modal_send') // ID to identify this specific form
        .setTitle('Upload File');

    // Name Input
    const nameInput = new TextInputBuilder()
        .setCustomId('name_input')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. Paul Noble French')
        .setRequired(true);

    const nameLabel = new LabelBuilder()
        .setLabel('File Title')
        .setDescription('The header text for this file')
        .setTextInputComponent(nameInput);

    // File Upload Input
    const fileUpload = new FileUploadBuilder()
        .setCustomId('file_upload')
        .setMinValues(1)
        .setMaxValues(1) 
        .setRequired(true);

    const fileLabel = new LabelBuilder()
        .setLabel('Select File')
        .setDescription('Upload the PDF or Image here')
        .setFileUploadComponent(fileUpload);

    modal.addLabelComponents(nameLabel, fileLabel);
    
    // Show Modal
    await interaction.showModal(modal);

    // Wait for response
    await handleModalSubmit(interaction);
}

async function showEditModal(interaction) {
    const messageId = interaction.options.getString('message_id');
    
    // We encode the Message ID into the customId so we can retrieve it later
    const modal = new ModalBuilder()
        .setCustomId(`file_modal_edit_${messageId}`) 
        .setTitle('Edit / Add File');

    // Name Input (Optional)
    const nameInput = new TextInputBuilder()
        .setCustomId('name_input')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Leave empty to keep current title')
        .setRequired(false);

    const nameLabel = new LabelBuilder()
        .setLabel('New Title')
        .setTextInputComponent(nameInput);

    // File Upload (Optional)
    const fileUpload = new FileUploadBuilder()
        .setCustomId('file_upload')
        .setMaxValues(1)
        .setRequired(false);

    const fileLabel = new LabelBuilder()
        .setLabel('New File (Optional)')
        .setDescription('Upload to add a new card or replace the old file')
        .setFileUploadComponent(fileUpload);

    modal.addLabelComponents(nameLabel, fileLabel);
    
    // Show Modal
    await interaction.showModal(modal);

    // Wait for response
    await handleModalSubmit(interaction);
}

// ==========================================
// 2. HANDLE SUBMISSION
// ==========================================
async function handleModalSubmit(originalInteraction) {
    // Wait for the user to submit the modal form
    // We filter by user ID to ensure we only get the submit from the person who ran the command
    const submission = await originalInteraction.awaitModalSubmit({
        time: 300000, // 5 Minutes
        filter: i => i.user.id === originalInteraction.user.id
    }).catch(() => null);

    if (!submission) return; // Timed out (user closed the modal)

    // Defer immediately to give us time to upload/edit
    await submission.deferReply({ ephemeral: true });

    try {
        const customId = submission.customId;
        const isEdit = customId.startsWith('file_modal_edit');
        const targetChannel = originalInteraction.options.getChannel('channel') || originalInteraction.channel;

        // --- EXTRACT DATA ---
        const nameText = submission.fields.getTextInputValue('name_input');
        
        // FIX: Use .first() to get the file from the Collection
        const uploadedFiles = submission.fields.getUploadedFiles('file_upload');
        const uploadedFile = uploadedFiles ? uploadedFiles.first() : null;

        if (!isEdit) {
            // --- SEND LOGIC ---
            if (!uploadedFile) throw new Error("No file received. Please try again.");

            const { container, filePayload } = createSingleContainer(nameText, uploadedFile.name, uploadedFile.url);

            await targetChannel.send({
                components: [container],
                files: [filePayload],
                flags: MessageFlags.IsComponentsV2
            });

            await submission.editReply(`${EMOJI.YES} **File sent!**`);

        } else {
            // --- EDIT LOGIC ---
            const messageId = customId.split('_').pop(); // Extract ID
            let message;
            
            try {
                message = await targetChannel.messages.fetch(messageId);
            } catch (e) {
                throw new Error("Message not found. Check ID and Channel.");
            }

            const editPayload = { flags: MessageFlags.IsComponentsV2 };

            if (uploadedFile) {
                // Scenario A: NEW FILE (Stacking)
                // If name is blank, use filename
                const finalName = nameText || uploadedFile.name;
                
                const { container, filePayload } = createSingleContainer(finalName, uploadedFile.name, uploadedFile.url);

                // Add to existing components (Stacking effect)
                editPayload.components = [...message.components, container];
                // Add new file to existing files
                editPayload.files = [filePayload]; 
                
                await message.edit(editPayload);
                await submission.editReply(`${EMOJI.YES} **Added** new file to the stack.`);

            } else {
                // Scenario B: TEXT UPDATE (No new file)
                if (!nameText) return submission.editReply(`${EMOJI.NO} No changes provided.`);
                
                const components = [...message.components];
                if (components.length === 0) throw new Error("Message has no components to edit.");

                // Update the LAST component in the stack
                const lastIndex = components.length - 1;
                const existingAttachment = message.attachments.at(lastIndex);

                if (!existingAttachment) throw new Error("Could not find existing file to reference.");

                // Rebuild container pointing to OLD file
                const { container } = createSingleContainer(nameText, existingAttachment.name, null);
                components[lastIndex] = container;

                editPayload.components = components;
                // No 'files' array means "keep existing attachments"
                
                await message.edit(editPayload);
                await submission.editReply(`${EMOJI.YES} **Updated** title successfully.`);
            }
        }
    } catch (e) {
        console.error(e);
        await submission.editReply(`${EMOJI.NO} **Error:** ${e.message}`);
    }
}

// ==========================================
// HELPER: Build One "Card"
// ==========================================
function createSingleContainer(title, fileName, fileUrl) {
    // 1. Build the Visual Container
    const container = new ContainerBuilder()
        .addTextDisplayComponents(t => t.setContent(`### ${title}`))
        .addSeparatorComponents(s => s)
        .addFileComponents(f => f.setURL(`attachment://${fileName}`));

    // 2. Build the File Payload (only if we have a URL to upload)
    let filePayload = null;
    if (fileUrl) {
        filePayload = new AttachmentBuilder(fileUrl, { name: fileName });
    }

    return { container, filePayload };
}
