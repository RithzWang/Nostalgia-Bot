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
        // Subcommand: SEND (No arguments needed, we ask in Modal)
        .addSubcommand(subcommand =>
            subcommand
                .setName('send')
                .setDescription('Open the file upload form')
                .addChannelOption(option => 
                    option.setName('channel').setDescription('Optional: Channel to send to')))
        // Subcommand: EDIT
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit/Add to a file message')
                .addStringOption(option => 
                    option.setName('message_id').setDescription('The Message ID').setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        // We must show the modal IMMEDIATELY. Do not deferReply here.
        try {
            const subcommand = interaction.options.getSubcommand();
            if (subcommand === 'send') {
                await showSendModal(interaction);
            } else if (subcommand === 'edit') {
                await showEditModal(interaction);
            }
        } catch (error) {
            console.error(error);
            // If modal failed to show, we can reply with error
            if (!interaction.replied) {
                await interaction.reply({ content: `${EMOJI.NO} Error: ${error.message}`, ephemeral: true });
            }
        }
    }
};

// ==========================================
// 1. SHOW MODAL (The V2 Form)
// ==========================================
async function showSendModal(interaction) {
    // 1. Create the Modal
    const modal = new ModalBuilder()
        .setCustomId('file_modal_send')
        .setTitle('Upload File');

    // 2. Create Name Input
    const nameInput = new TextInputBuilder()
        .setCustomId('name_input')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. Paul Noble French')
        .setRequired(true);

    const nameLabel = new LabelBuilder()
        .setLabel('File Title')
        .setDescription('The header text for this file')
        .setTextInputComponent(nameInput);

    // 3. Create File Upload (V2 Feature!)
    const fileUpload = new FileUploadBuilder()
        .setCustomId('file_upload')
        .setMinValues(1)
        .setMaxValues(1) // Limit to 1 file per "card"
        .setRequired(true);

    const fileLabel = new LabelBuilder()
        .setLabel('Select File')
        .setDescription('Upload the PDF or Image here')
        .setFileUploadComponent(fileUpload);

    // 4. Add components to Modal
    modal.addLabelComponents(nameLabel, fileLabel);

    // 5. Show it
    await interaction.showModal(modal);

    // 6. Pass the target channel ID via context or store it temporarily?
    // Since interaction.awaitModalSubmit is tied to this instance, 
    // we can retrieve the channel option later from the *original* interaction if needed,
    // OR just handle the submit logic here.
    
    await handleModalSubmit(interaction);
}

async function showEditModal(interaction) {
    const messageId = interaction.options.getString('message_id');

    const modal = new ModalBuilder()
        .setCustomId(`file_modal_edit_${messageId}`) // Encode ID in customId for easy retrieval
        .setTitle('Edit / Add File');

    // Name Input (Optional for edit)
    const nameInput = new TextInputBuilder()
        .setCustomId('name_input')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Leave empty to keep current title')
        .setRequired(false);

    const nameLabel = new LabelBuilder()
        .setLabel('New Title')
        .setTextInputComponent(nameInput);

    // File Upload (Optional for edit)
    const fileUpload = new FileUploadBuilder()
        .setCustomId('file_upload')
        .setMaxValues(1)
        .setRequired(false); // Not required for edit

    const fileLabel = new LabelBuilder()
        .setLabel('New File (Optional)')
        .setDescription('Upload to add a new card or replace the old file')
        .setFileUploadComponent(fileUpload);

    modal.addLabelComponents(nameLabel, fileLabel);
    await interaction.showModal(modal);
    
    await handleModalSubmit(interaction);
}

// ==========================================
// 2. HANDLE SUBMISSION
// ==========================================
async function handleModalSubmit(originalInteraction) {
    // Wait for the user to submit the modal we just showed
    const submission = await originalInteraction.awaitModalSubmit({
        time: 300000, // 5 minutes to upload
        filter: i => i.user.id === originalInteraction.user.id
    }).catch(() => null);

    if (!submission) return; // Timed out

    // Defer the update (since uploading/processing takes time)
    await submission.deferReply({ ephemeral: true });

    try {
        const customId = submission.customId;
        const isEdit = customId.startsWith('file_modal_edit');

        // --- EXTRACT DATA (V2 Features) ---
        const nameText = submission.fields.getTextInputValue('name_input');
        // Retrieve uploaded files directly from the modal!
        const uploadedFiles = submission.fields.getUploadedFiles('file_upload'); // Returns Array
        const uploadedFile = uploadedFiles ? uploadedFiles[0] : null;

        const targetChannel = originalInteraction.options.getChannel('channel') || originalInteraction.channel;

        if (!isEdit) {
            // --- SEND LOGIC ---
            if (!uploadedFile) throw new Error("No file uploaded!");

            const { container, filePayload } = createSingleContainer(nameText, uploadedFile.name, uploadedFile.url);

            await targetChannel.send({
                components: [container],
                files: [filePayload],
                flags: MessageFlags.IsComponentsV2
            });

            await submission.editReply(`${EMOJI.YES} **File sent!**`);

        } else {
            // --- EDIT LOGIC ---
            const messageId = customId.split('_').pop(); // Extract ID from 'file_modal_edit_12345'
            const message = await targetChannel.messages.fetch(messageId);
            
            if (!message) throw new Error("Message not found.");

            const editPayload = { flags: MessageFlags.IsComponentsV2 };

            if (uploadedFile) {
                // ADDING NEW FILE (STACKING)
                const finalName = nameText || uploadedFile.name;
                const { container, filePayload } = createSingleContainer(finalName, uploadedFile.name, uploadedFile.url);

                editPayload.components = [...message.components, container];
                editPayload.files = [filePayload]; // Discord merges new files
                
                await message.edit(editPayload);
                await submission.editReply(`${EMOJI.YES} **Added** new file to stack.`);
            } else {
                // TEXT ONLY UPDATE
                if (!nameText) return submission.editReply(`${EMOJI.NO} No changes provided.`);
                
                const components = [...message.components];
                const lastIndex = components.length - 1;
                const existingAttachment = message.attachments.at(lastIndex);

                if (!existingAttachment) throw new Error("No existing file to reference.");

                const { container } = createSingleContainer(nameText, existingAttachment.name, null);
                components[lastIndex] = container;

                editPayload.components = components;
                await message.edit(editPayload);
                await submission.editReply(`${EMOJI.YES} **Updated** title.`);
            }
        }
    } catch (e) {
        console.error(e);
        await submission.editReply(`${EMOJI.NO} **Error:** ${e.message}`);
    }
}

// ==========================================
// HELPER
// ==========================================
function createSingleContainer(title, fileName, fileUrl) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(t => t.setContent(`### ${title}`))
        .addSeparatorComponents(s => s)
        .addFileComponents(f => f.setURL(`attachment://${fileName}`));

    let filePayload = null;
    if (fileUrl) {
        // In the interaction response, the URL provided by getUploadedFiles is valid for re-upload
        filePayload = new AttachmentBuilder(fileUrl, { name: fileName });
    }

    return { container, filePayload };
}
