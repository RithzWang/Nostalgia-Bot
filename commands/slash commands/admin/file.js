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

// Native fetch (Node 18+)
// If you are on an older Node version, install 'undici' and uncomment:
// const { fetch } = require('undici'); 

const EMOJI = {
    YES: '<:yes:1297814648417943565>',
    NO: '<:no:1297814819105144862>'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('file')
        .setDescription('Manage file containers')
        .addSubcommand(subcommand =>
            subcommand
                .setName('send')
                .setDescription('Open the file upload form')
                .addChannelOption(option => 
                    option.setName('channel').setDescription('Optional: Channel to send to')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit or Add to a file message')
                .addStringOption(option => 
                    option.setName('message_id').setDescription('The Message ID').setRequired(true))
                .addChannelOption(option => 
                    option.setName('channel').setDescription('Channel where the message is')))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            if (subcommand === 'send') await showSendModal(interaction);
            else if (subcommand === 'edit') await showEditModal(interaction);
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
        .setCustomId('file_modal_send')
        .setTitle('Upload File');

    const nameInput = new TextInputBuilder()
        .setCustomId('name_input')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. Paul Noble French')
        .setRequired(true);

    const nameLabel = new LabelBuilder().setLabel('Title').setTextInputComponent(nameInput);

    const fileUpload = new FileUploadBuilder()
        .setCustomId('file_upload')
        .setMinValues(1)
        .setMaxValues(1) 
        .setRequired(true);

    const fileLabel = new LabelBuilder().setLabel('File').setFileUploadComponent(fileUpload);

    modal.addLabelComponents(nameLabel, fileLabel);
    await interaction.showModal(modal);
    await handleModalSubmit(interaction);
}

async function showEditModal(interaction) {
    const messageId = interaction.options.getString('message_id');
    const modal = new ModalBuilder()
        .setCustomId(`file_modal_edit_${messageId}`) 
        .setTitle('Edit / Add File');

    const nameInput = new TextInputBuilder()
        .setCustomId('name_input')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Leave empty to keep current')
        .setRequired(false);

    const nameLabel = new LabelBuilder().setLabel('New Title').setTextInputComponent(nameInput);

    const fileUpload = new FileUploadBuilder()
        .setCustomId('file_upload')
        .setMaxValues(1)
        .setRequired(false);

    const fileLabel = new LabelBuilder().setLabel('New File').setFileUploadComponent(fileUpload);

    modal.addLabelComponents(nameLabel, fileLabel);
    await interaction.showModal(modal);
    await handleModalSubmit(interaction);
}

// ==========================================
// 2. HANDLE SUBMISSION
// ==========================================
async function handleModalSubmit(originalInteraction) {
    const submission = await originalInteraction.awaitModalSubmit({
        time: 300000, // 5 Minutes
        filter: i => i.user.id === originalInteraction.user.id
    }).catch(() => null);

    if (!submission) return; 

    await submission.deferReply({ ephemeral: true });

    try {
        const customId = submission.customId;
        const isEdit = customId.startsWith('file_modal_edit');
        const targetChannel = originalInteraction.options.getChannel('channel') || originalInteraction.channel;

        // CHECK GUILD LIMITS
        // Tier 2 = 50MB, Tier 3 = 100MB, None = 25MB
        const uploadLimit = originalInteraction.guild.premiumTier >= 2 ? 50 * 1024 * 1024 : 25 * 1024 * 1024;

        const nameText = submission.fields.getTextInputValue('name_input');
        const uploadedFiles = submission.fields.getUploadedFiles('file_upload');
        const uploadedFile = uploadedFiles ? uploadedFiles.first() : null;

        // Manual Size Check
        if (uploadedFile && uploadedFile.size > uploadLimit) {
            throw new Error(`File is too large! This server's limit is ${(uploadLimit / 1024 / 1024).toFixed(0)}MB.`);
        }

        if (!isEdit) {
            if (!uploadedFile) throw new Error("No file received.");

            // Use the streaming helper
            const { container, filePayload } = await createSingleContainer(nameText, uploadedFile.name, uploadedFile.url);

            await targetChannel.send({
                components: [container],
                files: [filePayload], // Streamed payload
                flags: MessageFlags.IsComponentsV2
            });

            await submission.editReply(`${EMOJI.YES} **File sent!**`);

        } else {
            const messageId = customId.split('_').pop(); 
            const message = await targetChannel.messages.fetch(messageId);
            if (!message) throw new Error("Message not found.");

            const editPayload = { flags: MessageFlags.IsComponentsV2 };

            if (uploadedFile) {
                const finalName = nameText || uploadedFile.name;
                const { container, filePayload } = await createSingleContainer(finalName, uploadedFile.name, uploadedFile.url);

                editPayload.components = [...message.components, container];
                editPayload.files = [filePayload];
                
                await message.edit(editPayload);
                await submission.editReply(`${EMOJI.YES} **Added** new file to stack.`);
            } else {
                if (!nameText) return submission.editReply(`${EMOJI.NO} No changes.`);
                
                const components = [...message.components];
                const lastIndex = components.length - 1;
                const existingAttachment = message.attachments.at(lastIndex);

                if (!existingAttachment) throw new Error("No existing file to reference.");

                // Rebuild container pointing to OLD file (No fetch needed here)
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(t => t.setContent(`### ${nameText}`))
                    .addSeparatorComponents(s => s)
                    .addFileComponents(f => f.setURL(`attachment://${existingAttachment.name}`));

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
// HELPER: STREAMING DOWNLOAD (Fixes 413)
// ==========================================
async function createSingleContainer(title, fileName, fileUrl) {
    // 1. Build the Visual Container
    const container = new ContainerBuilder()
        .addTextDisplayComponents(t => t.setContent(`### ${title}`))
        .addSeparatorComponents(s => s)
        .addFileComponents(f => f.setURL(`attachment://${fileName}`));

    let filePayload = null;
    if (fileUrl) {
        // FIX: Fetch the stream manually instead of letting Discord.js handle the URL.
        // This ensures the data is passed correctly for larger files.
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`Failed to download file: ${response.statusText}`);
        
        // Convert the web stream to an ArrayBuffer or Buffer for Discord.js
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        filePayload = new AttachmentBuilder(buffer, { name: fileName });
    }

    return { container, filePayload };
}
