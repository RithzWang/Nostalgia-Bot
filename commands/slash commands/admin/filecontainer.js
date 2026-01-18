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
    // --- Modal Imports ---
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    FileUploadBuilder,
    LabelBuilder,
    ActionRowBuilder
} = require('discord.js');

const FileContainer = require('../../../src/models/FileContainerSchema'); 

module.exports = {
    guildOnly: true,
    data: new SlashCommandBuilder()
        .setName('filecontainer')
        .setDescription('Manage Multi-File Container Messages via Modals')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // --- 1. SETUP (Creates new) ---
        .addSubcommand(sub => 
            sub.setName('setup')
                .setDescription('Create a new File Container')
                .addChannelOption(opt => opt.setName('channel').setDescription('Where to create it? (Optional)').addChannelTypes(ChannelType.GuildText))
        )

        // --- 2. ADD (Adds file) ---
        .addSubcommand(sub => 
            sub.setName('add')
                .setDescription('Add a file to a container')
                .addStringOption(opt => opt.setName('message_id').setDescription('The Container Message ID').setRequired(true))
        )

        // --- 3. EDIT (Edits file/title) ---
        .addSubcommand(sub => 
            sub.setName('edit')
                .setDescription('Edit the Title or a specific File')
                .addStringOption(opt => opt.setName('message_id').setDescription('The Container Message ID').setRequired(true))
        )

        // --- 4. REMOVE (Removes file) ---
        .addSubcommand(sub => 
            sub.setName('remove')
                .setDescription('Remove a file by number')
                .addStringOption(opt => opt.setName('message_id').setDescription('The Container Message ID').setRequired(true))
        ),

    async execute(interaction) {
        // NOTE: Do NOT deferReply here yet. We must showModal first!
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // ====================================================
        // 1. BUILD THE MODAL BASED ON SUBCOMMAND
        // ====================================================
        const modal = new ModalBuilder()
            .setCustomId(`fc_modal_${sub}`)
            .setTitle(`File Container: ${sub.toUpperCase()}`);

        if (sub === 'setup') {
            const titleLabel = new LabelBuilder()
                .setLabel('Container Title')
                .setTextInputComponent(
                    new TextInputBuilder()
                        .setCustomId('title_input')
                        .setLabel('Main Title')
                        .setPlaceholder('e.g. Server Resources')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                );
            modal.addLabelComponents(titleLabel);
        }

        if (sub === 'add') {
            const nameLabel = new LabelBuilder()
                .setLabel('File Display Name')
                .setTextInputComponent(
                    new TextInputBuilder()
                        .setCustomId('name_input')
                        .setLabel('Display Name')
                        .setPlaceholder('e.g. Chapter 1 Notes')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                );
            
            const fileLabel = new LabelBuilder()
                .setLabel('Upload File')
                .setFileUploadComponent(
                    new FileUploadBuilder()
                        .setCustomId('file_upload')
                        .setMaxValues(1)
                        .setRequired(true)
                );
            
            modal.addLabelComponents(nameLabel, fileLabel);
        }

        if (sub === 'edit') {
            const numberLabel = new LabelBuilder()
                .setLabel('File Number')
                .setTextInputComponent(
                    new TextInputBuilder()
                        .setCustomId('number_input')
                        .setLabel('File # to Edit (Leave empty if editing Title)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                );

            const titleLabel = new LabelBuilder()
                .setLabel('New Title')
                .setTextInputComponent(
                    new TextInputBuilder()
                        .setCustomId('title_input')
                        .setLabel('New Main Title (Optional)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                );

            const nameLabel = new LabelBuilder()
                .setLabel('New File Name')
                .setTextInputComponent(
                    new TextInputBuilder()
                        .setCustomId('name_input')
                        .setLabel('New Display Name (Optional)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                );

            const fileLabel = new LabelBuilder()
                .setLabel('New File')
                .setFileUploadComponent(
                    new FileUploadBuilder()
                        .setCustomId('file_upload')
                        .setRequired(false)
                );

            modal.addLabelComponents(numberLabel, titleLabel, nameLabel, fileLabel);
        }

        if (sub === 'remove') {
             const numberLabel = new LabelBuilder()
                .setLabel('File Number')
                .setTextInputComponent(
                    new TextInputBuilder()
                        .setCustomId('number_input')
                        .setLabel('Which file number to delete?')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                );
             modal.addLabelComponents(numberLabel);
        }

        // ====================================================
        // 2. SHOW MODAL & WAIT
        // ====================================================
        await interaction.showModal(modal);

        let submission;
        try {
            submission = await interaction.awaitModalSubmit({
                time: 300_000,
                filter: (i) => i.customId.startsWith('fc_modal_') && i.user.id === interaction.user.id
            });
        } catch (err) {
            return; // Timed out
        }

        // NOW we defer reply because processing takes time
        await submission.deferReply({ flags: MessageFlags.Ephemeral });

        // ====================================================
        // 3. PROCESS SUBMISSION
        // ====================================================
        
        // --- RENDER HELPER ---
        const renderContainer = (data) => {
            const container = new ContainerBuilder().setAccentColor(0x5865F2);

            // Title
            container.addSectionComponents(
                new SectionBuilder().addTextDisplayComponents(t => t.setContent(`## ${data.title}`))
            );

            const payloadFiles = [];

            if (data.files.length > 0) {
                const usedFilenames = new Set();
                data.files.forEach((fileData, index) => {
                    const num = index + 1;

                    // Separator
                    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

                    // Sub-Header
                    container.addSectionComponents(
                        new SectionBuilder().addTextDisplayComponents(t => t.setContent(`### ${num}. ${fileData.name}`))
                    );

                    // Unique Filename Logic
                    let uniqueFileName = fileData.filename;
                    if (usedFilenames.has(uniqueFileName)) uniqueFileName = `${num}_${uniqueFileName}`;
                    usedFilenames.add(uniqueFileName);
                    
                    // Attachment & Component
                    payloadFiles.push(new AttachmentBuilder(fileData.url, { name: uniqueFileName }));
                    container.addFileComponents(new FileBuilder().setURL(`attachment://${uniqueFileName}`));
                });
            } else {
                container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
                container.addSectionComponents(
                     new SectionBuilder().addTextDisplayComponents(t => t.setContent('*No files added yet.*'))
                );
            }

            return { 
                content: '', 
                components: [container],
                files: payloadFiles,
                flags: MessageFlags.IsComponentsV2
            };
        };

        try {
            // --- SETUP ---
            if (sub === 'setup') {
                const title = submission.fields.getTextInputValue('title_input');
                const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
                
                const message = await targetChannel.send({ content: 'Initializing...' });
                
                await FileContainer.findOneAndDelete({ messageId: message.id }); // Cleanup ghosts
                const newData = await FileContainer.create({
                    guildId,
                    channelId: targetChannel.id,
                    messageId: message.id,
                    title: title,
                    files: []
                });

                await message.edit(renderContainer(newData));
                return submission.editReply(`<:yes:1297814648417943565> Container created! ID: \`${message.id}\``);
            }

            // --- COMMON LOGIC FOR ADD/EDIT/REMOVE ---
            const targetMsgId = interaction.options.getString('message_id');
            const data = await FileContainer.findOne({ messageId: targetMsgId });

            if (!data) return submission.editReply(`<:no:1297814819105144862> Container ID \`${targetMsgId}\` not found in database.`);

            const targetChannel = await interaction.guild.channels.fetch(data.channelId);
            const message = await targetChannel.messages.fetch(targetMsgId).catch(() => null);
            if (!message) return submission.editReply(`<:no:1297814819105144862> The actual message seems to be deleted.`);

            // --- ADD ---
            if (sub === 'add') {
                const name = submission.fields.getTextInputValue('name_input');
                const files = submission.fields.getUploadedFiles('file_upload');
                const file = files[0];

                data.files.push({ name: name, url: file.url, filename: file.name });

                try {
                    await message.edit(renderContainer(data)); // Try Discord first
                    await data.save(); // Save if success
                    return submission.editReply(`<:yes:1297814648417943565> Added **${name}**.`);
                } catch (err) {
                    data.files.pop(); // Revert
                    return submission.editReply(`<:no:1297814819105144862> **Failed:** Total size too large.`);
                }
            }

            // --- EDIT ---
            if (sub === 'edit') {
                const numberStr = submission.fields.getTextInputValue('number_input');
                const newTitle = submission.fields.getTextInputValue('title_input');
                const newName = submission.fields.getTextInputValue('name_input');
                const files = submission.fields.getUploadedFiles('file_upload');
                const newFile = files ? files[0] : null;

                let changes = [];
                
                if (newTitle) {
                    data.title = newTitle;
                    changes.push('Title');
                }

                if (numberStr) {
                    const number = parseInt(numberStr);
                    const index = number - 1;

                    if (isNaN(number) || index < 0 || index >= data.files.length) {
                        return submission.editReply(`<:no:1297814819105144862> Invalid file number.`);
                    }

                    if (newName) {
                        data.files[index].name = newName;
                        changes.push(`File #${number} Name`);
                    }
                    if (newFile) {
                        data.files[index].url = newFile.url;
                        data.files[index].filename = newFile.name;
                        changes.push(`File #${number} Attachment`);
                    }
                }

                if (changes.length === 0) return submission.editReply(`<:no:1297814819105144862> No changes made.`);

                try {
                    await message.edit(renderContainer(data));
                    await data.save();
                    return submission.editReply(`<:yes:1297814648417943565> Updated: **${changes.join(', ')}**.`);
                } catch (err) {
                    return submission.editReply(`<:no:1297814819105144862> **Failed:** New size is too large.`);
                }
            }

            // --- REMOVE ---
            if (sub === 'remove') {
                const numberStr = submission.fields.getTextInputValue('number_input');
                const number = parseInt(numberStr);
                const index = number - 1;

                if (isNaN(number) || index < 0 || index >= data.files.length) {
                    return submission.editReply(`<:no:1297814819105144862> Invalid file number.`);
                }

                const removedName = data.files[index].name;
                data.files.splice(index, 1);

                await data.save();
                await message.edit(renderContainer(data));
                return submission.editReply(`<:yes:1297814648417943565> Removed **${removedName}**.`);
            }

        } catch (error) {
            console.error(error);
            return submission.editReply(`<:no:1297814819105144862> Error: ${error.message}`);
        }
    }
};
