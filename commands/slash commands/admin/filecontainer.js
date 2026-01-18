const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    MessageFlags, 
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    FileBuilder,
    AttachmentBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    FileUploadBuilder,
    LabelBuilder
} = require('discord.js');

// Use native fetch (Node 18+) or require('undici').fetch
const fetch = global.fetch || require('undici').fetch;
const FileContainer = require('../../../src/models/FileContainerSchema'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('filecontainer')
        .setDescription('Manage Multi-File Containers via Modals')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        // 1. SETUP
        .addSubcommand(sub => sub.setName('setup').setDescription('Create a new Container')
            .addChannelOption(opt => opt.setName('channel').setDescription('Target Channel')))
        // 2. ADD
        .addSubcommand(sub => sub.setName('add').setDescription('Add file to Container')
            .addStringOption(opt => opt.setName('message_id').setDescription('Container Message ID').setRequired(true)))
        // 3. EDIT
        .addSubcommand(sub => sub.setName('edit').setDescription('Edit file/title in Container')
            .addStringOption(opt => opt.setName('message_id').setDescription('Container Message ID').setRequired(true)))
        // 4. REMOVE
        .addSubcommand(sub => sub.setName('remove').setDescription('Remove file from Container')
            .addStringOption(opt => opt.setName('message_id').setDescription('Container Message ID').setRequired(true))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        try {
            if (sub === 'setup') await showSetupModal(interaction);
            else if (sub === 'add') await showAddModal(interaction);
            else if (sub === 'edit') await showEditModal(interaction);
            else if (sub === 'remove') await showRemoveModal(interaction);
        } catch (error) {
            console.error(error);
            if (!interaction.replied) await interaction.reply({ content: `<:no:1297814819105144862> Error: ${error.message}`, ephemeral: true });
        }
    }
};

// ==========================================
// 1. MODAL BUILDERS
// ==========================================

async function showSetupModal(interaction) {
    const modal = new ModalBuilder().setCustomId('fc_setup').setTitle('Setup Container');
    const titleInput = new TextInputBuilder().setCustomId('title').setLabel('Main Title').setStyle(TextInputStyle.Short).setRequired(true);
    modal.addLabelComponents(new LabelBuilder().setLabel('Title').setTextInputComponent(titleInput));
    await interaction.showModal(modal);
    await handleSubmission(interaction);
}

async function showAddModal(interaction) {
    const msgId = interaction.options.getString('message_id');
    const modal = new ModalBuilder().setCustomId(`fc_add_${msgId}`).setTitle('Add File');
    
    const nameInput = new TextInputBuilder().setCustomId('name').setLabel('Display Name').setStyle(TextInputStyle.Short).setRequired(true);
    const fileUpload = new FileUploadBuilder().setCustomId('file').setMaxValues(1).setRequired(true); // Must upload
    
    modal.addLabelComponents(
        new LabelBuilder().setLabel('Name').setTextInputComponent(nameInput),
        new LabelBuilder().setLabel('File').setFileUploadComponent(fileUpload)
    );
    await interaction.showModal(modal);
    await handleSubmission(interaction);
}

async function showEditModal(interaction) {
    const msgId = interaction.options.getString('message_id');
    const modal = new ModalBuilder().setCustomId(`fc_edit_${msgId}`).setTitle('Edit Container');

    const numInput = new TextInputBuilder().setCustomId('number').setLabel('File # (Leave empty to edit Title)').setStyle(TextInputStyle.Short).setRequired(false);
    const titleInput = new TextInputBuilder().setCustomId('title').setLabel('New Main Title').setStyle(TextInputStyle.Short).setRequired(false);
    const nameInput = new TextInputBuilder().setCustomId('name').setLabel('New File Name').setStyle(TextInputStyle.Short).setRequired(false);
    const fileUpload = new FileUploadBuilder().setCustomId('file').setMaxValues(1).setRequired(false);

    modal.addLabelComponents(
        new LabelBuilder().setLabel('Selection').setTextInputComponent(numInput),
        new LabelBuilder().setLabel('New Title').setTextInputComponent(titleInput),
        new LabelBuilder().setLabel('New Name').setTextInputComponent(nameInput),
        new LabelBuilder().setLabel('New File').setFileUploadComponent(fileUpload)
    );
    await interaction.showModal(modal);
    await handleSubmission(interaction);
}

async function showRemoveModal(interaction) {
    const msgId = interaction.options.getString('message_id');
    const modal = new ModalBuilder().setCustomId(`fc_remove_${msgId}`).setTitle('Remove File');
    const numInput = new TextInputBuilder().setCustomId('number').setLabel('File Number to Remove').setStyle(TextInputStyle.Short).setRequired(true);
    modal.addLabelComponents(new LabelBuilder().setLabel('File #').setTextInputComponent(numInput));
    await interaction.showModal(modal);
    await handleSubmission(interaction);
}

// ==========================================
// 2. SUBMISSION HANDLER
// ==========================================
async function handleSubmission(originalInt) {
    const submission = await originalInt.awaitModalSubmit({
        time: 300_000, 
        filter: i => i.user.id === originalInt.user.id
    }).catch(() => null);

    if (!submission) return;

    // Defer immediately (Creating buffers takes time)
    await submission.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const [action, ...idParts] = submission.customId.replace('fc_', '').split('_');
        const targetMsgId = idParts.join('_'); // Handle IDs just in case
        
        // --- SETUP ---
        if (action === 'setup') {
            const title = submission.fields.getTextInputValue('title');
            const channel = originalInt.options.getChannel('channel') || originalInt.channel;
            
            const msg = await channel.send({ content: 'Initializing...' });
            await FileContainer.findOneAndDelete({ messageId: msg.id });
            
            const newData = await FileContainer.create({
                guildId: originalInt.guild.id,
                channelId: channel.id,
                messageId: msg.id,
                title: title,
                files: []
            });

            const { container } = await buildPayload(newData, []); // No files yet
            await msg.edit({ content: '', components: [container], flags: MessageFlags.IsComponentsV2 });
            return submission.editReply(`<:yes:1297814648417943565> Container created! ID: \`${msg.id}\``);
        }

        // --- LOAD DATA ---
        const data = await FileContainer.findOne({ messageId: targetMsgId });
        if (!data) return submission.editReply(`<:no:1297814819105144862> Container not found in DB.`);

        const channel = await originalInt.guild.channels.fetch(data.channelId);
        const message = await channel.messages.fetch(targetMsgId).catch(() => null);
        if (!message) return submission.editReply(`<:no:1297814819105144862> Message deleted.`);

        // --- ADD ---
        if (action === 'add') {
            const name = submission.fields.getTextInputValue('name');
            const uploadedFiles = submission.fields.getUploadedFiles('file');
            const file = uploadedFiles.first();

            // Temporarily push to object
            data.files.push({ name, url: file.url, filename: file.name });

            // Try Update
            await updateContainerSafe(message, data, submission);
        }

        // --- EDIT ---
        if (action === 'edit') {
            const numStr = submission.fields.getTextInputValue('number');
            const newTitle = submission.fields.getTextInputValue('title');
            const newName = submission.fields.getTextInputValue('name');
            const uploadedFiles = submission.fields.getUploadedFiles('file');
            const newFile = uploadedFiles ? uploadedFiles.first() : null;

            if (newTitle) data.title = newTitle;

            if (numStr) {
                const idx = parseInt(numStr) - 1;
                if (idx < 0 || idx >= data.files.length) throw new Error("Invalid file number.");
                
                if (newName) data.files[idx].name = newName;
                if (newFile) {
                    data.files[idx].url = newFile.url;
                    data.files[idx].filename = newFile.name; // Fixed typo (index -> idx)
                }
            }

            await updateContainerSafe(message, data, submission);
        }

        // --- REMOVE ---
        if (action === 'remove') {
            const numStr = submission.fields.getTextInputValue('number');
            const idx = parseInt(numStr) - 1;
            
            if (idx < 0 || idx >= data.files.length) throw new Error("Invalid file number.");
            
            const removed = data.files[idx].name;
            data.files.splice(idx, 1);

            await updateContainerSafe(message, data, submission);
            await submission.editReply(`<:yes:1297814648417943565> Removed **${removed}**.`);
        }

    } catch (e) {
        console.error(e);
        await submission.editReply(`<:no:1297814819105144862> **Error:** ${e.message}`);
    }
}

// ==========================================
// 3. CORE LOGIC: STREAMING & UPDATING
// ==========================================

async function updateContainerSafe(message, data, interaction) {
    try {
        // 1. Prepare Payloads (Download all files as Buffers)
        const { container, files } = await buildPayload(data);

        // 2. Try Update Discord
        await message.edit({
            content: '',
            components: [container],
            files: files, // Array of AttachmentBuilders (Buffers)
            flags: MessageFlags.IsComponentsV2
        });

        // 3. Save DB Only on Success
        await data.save();
        if (!interaction.replied) await interaction.editReply(`<:yes:1297814648417943565> Success!`);

    } catch (error) {
        // 4. Handle "Too Large" Error
        if (error.status === 413 || error.code === 50035 || error.message.includes('too large')) {
            throw new Error(`The total size of ALL files combined is too large for Discord to handle in one message.`);
        }
        throw error;
    }
}

async function buildPayload(data) {
    const container = new ContainerBuilder().setAccentColor(0x5865F2);
    
    // Title Section
    container.addSectionComponents(
        new SectionBuilder().addTextDisplayComponents(t => t.setContent(`## ${data.title}`))
    );

    const attachments = [];

    if (data.files.length > 0) {
        const usedNames = new Set();

        // We must process sequentially to handle downloads
        for (let i = 0; i < data.files.length; i++) {
            const fileData = data.files[i];
            const num = i + 1;

            // Separator
            container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

            // Sub-Header
            container.addSectionComponents(
                new SectionBuilder().addTextDisplayComponents(t => t.setContent(`### ${num}. ${fileData.name}`))
            );

            // Unique Filename Logic
            let fName = fileData.filename;
            if (usedNames.has(fName)) fName = `${num}_${fName}`;
            usedNames.add(fName);

            // --- CRITICAL: DOWNLOAD TO BUFFER ---
            const buffer = await downloadToBuffer(fileData.url);
            
            const attachment = new AttachmentBuilder(buffer, { name: fName });
            attachments.push(attachment);

            // File Component
            container.addFileComponents(new FileBuilder().setURL(`attachment://${fName}`));
        }
    } else {
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
        container.addSectionComponents(new SectionBuilder().addTextDisplayComponents(t => t.setContent('*Empty*')));
    }

    return { container, files: attachments };
}

// Helper to fetch file content into a Buffer
async function downloadToBuffer(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch file: ${url}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
