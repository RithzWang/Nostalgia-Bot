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
    LabelBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ComponentType
} = require('discord.js');

// Native Node fetch (Node 18+)
// const { fetch } = require('undici'); // Uncomment if needed

const FileContainer = require('../../../src/models/FileContainerSchema'); 

module.exports = {
    guildOnly: true,
    data: new SlashCommandBuilder()
        .setName('filecontainer')
        .setDescription('Manage Multi-File Container Messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // --- 1. SETUP ---
        .addSubcommand(sub => 
            sub.setName('setup')
                .setDescription('Create a new File Container')
                .addStringOption(opt => opt.setName('title').setDescription('The Main Title').setRequired(true))
                .addStringOption(opt => opt.setName('message_id').setDescription('Use existing message ID (Optional)'))
                .addChannelOption(opt => opt.setName('channel').setDescription('Target Channel (Optional)').addChannelTypes(ChannelType.GuildText))
        )

        // --- 2. ADD (Modal) ---
        .addSubcommand(sub => 
            sub.setName('add')
                .setDescription('Add a file to a container')
                .addStringOption(opt => opt.setName('message_id').setDescription('The Container Message ID').setRequired(true))
                .addChannelOption(opt => opt.setName('channel').setDescription('Where is the message? (Optional)'))
        )

        // --- 3. EDIT (Select Menu -> Modal) ---
        .addSubcommand(sub => 
            sub.setName('edit')
                .setDescription('Edit the Title or a specific File')
                .addStringOption(opt => opt.setName('message_id').setDescription('The Container Message ID').setRequired(true))
                .addChannelOption(opt => opt.setName('channel').setDescription('Where is the message? (Optional)'))
        )

        // --- 4. REMOVE (Select Menu) ---
        .addSubcommand(sub => 
            sub.setName('remove')
                .setDescription('Remove a file')
                .addStringOption(opt => opt.setName('message_id').setDescription('The Container Message ID').setRequired(true))
                .addChannelOption(opt => opt.setName('channel').setDescription('Where is the message? (Optional)'))
        ),

    async execute(interaction) {
        // Do NOT defer globally, as Modals need immediate response.

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            // ===========================================
            //                 SETUP (Standard)
            // ===========================================
            if (sub === 'setup') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const title = interaction.options.getString('title');
                const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
                const targetMsgId = interaction.options.getString('message_id');
                
                let message;
                if (targetMsgId) {
                    try {
                        message = await targetChannel.messages.fetch(targetMsgId);
                    } catch (e) {
                        return interaction.editReply(`<:no:1297814819105144862> Message \`${targetMsgId}\` not found in ${targetChannel}.`);
                    }
                } else {
                    message = await targetChannel.send({ content: 'Initializing Container...' });
                }

                await FileContainer.findOneAndDelete({ messageId: message.id });

                const newData = await FileContainer.create({
                    guildId,
                    channelId: targetChannel.id,
                    messageId: message.id,
                    title: title,
                    files: []
                });

                await message.edit(await renderContainer(newData));
                return interaction.editReply(`<:yes:1297814648417943565> Container created! ID: \`${message.id}\``);
            }

            // --- COMMON: Fetch Data ---
            const targetMsgId = interaction.options.getString('message_id');
            const data = await FileContainer.findOne({ messageId: targetMsgId });
            
            if (!data) return interaction.reply({ content: `<:no:1297814819105144862> No container found with ID \`${targetMsgId}\`.`, flags: MessageFlags.Ephemeral });

            const targetChannel = interaction.options.getChannel('channel') || await interaction.guild.channels.fetch(data.channelId);
            const message = await targetChannel.messages.fetch(targetMsgId).catch(() => null);

            if (!message) return interaction.reply({ content: `<:no:1297814819105144862> The actual message seems to be deleted.`, flags: MessageFlags.Ephemeral });

            // ===========================================
            //                 ADD (Modal)
            // ===========================================
            if (sub === 'add') {
                const modal = new ModalBuilder()
                    .setCustomId('fc_add_modal')
                    .setTitle('Add File');

                const nameInput = new TextInputBuilder()
                    .setCustomId('name_input')
                    .setLabel("Display Name")
                    .setPlaceholder("e.g. Chapter 1 PDF")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const fileUpload = new FileUploadBuilder()
                    .setCustomId('file_upload')
                    .setRequired(true)
                    .setMaxValues(1);

                modal.addLabelComponents(
                    new LabelBuilder().setLabel('Display Name').setTextInputComponent(nameInput),
                    new LabelBuilder().setLabel('Upload File').setFileUploadComponent(fileUpload)
                );

                await interaction.showModal(modal);

                const submitted = await interaction.awaitModalSubmit({
                    time: 300000,
                    filter: i => i.user.id === interaction.user.id
                }).catch(() => null);

                if (!submitted) return;
                await submitted.deferReply({ flags: MessageFlags.Ephemeral });

                const nameText = submitted.fields.getTextInputValue('name_input');
                const uploadedFiles = submitted.fields.getUploadedFiles('file_upload');
                const uploadedFile = uploadedFiles ? uploadedFiles.first() : null;

                if (!uploadedFile) return submitted.editReply(`<:no:1297814819105144862> No file received.`);

                // Add to local data
                data.files.push({
                    name: nameText,
                    url: uploadedFile.url,
                    filename: uploadedFile.name
                });

                try {
                    await message.edit(await renderContainer(data));
                    await data.save();
                    await submitted.editReply(`<:yes:1297814648417943565> Added **${nameText}** successfully.`);
                } catch (err) {
                    data.files.pop(); // Revert
                    console.error(err);
                    await submitted.editReply(`<:no:1297814819105144862> Failed to update message (likely too large).`);
                }
            }

            // ===========================================
            //                 EDIT (Select -> Modal)
            // ===========================================
            if (sub === 'edit') {
                // 1. Build Options (Main Title + Files)
                const options = [
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`📝 Edit Main Title`)
                        .setDescription(`Current: ${data.title.substring(0, 50)}...`)
                        .setValue('EDIT_MAIN_TITLE')
                ];

                data.files.forEach((f, i) => {
                    options.push(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`File #${i+1}: ${f.name.substring(0, 50)}`)
                            .setValue(i.toString())
                    );
                });

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('fc_edit_select')
                    .setPlaceholder('What do you want to edit?')
                    .addOptions(options);

                const response = await interaction.reply({
                    content: 'Select an element to edit:',
                    components: [new ActionRowBuilder().addComponents(selectMenu)],
                    flags: MessageFlags.Ephemeral
                });

                const selection = await response.awaitMessageComponent({
                    componentType: ComponentType.StringSelect,
                    time: 60000
                }).catch(() => null);

                if (!selection) return interaction.deleteReply().catch(() => {});

                // 2. Show Modal based on selection
                const value = selection.values[0];

                if (value === 'EDIT_MAIN_TITLE') {
                    // --- EDIT TITLE ---
                    const modal = new ModalBuilder()
                        .setCustomId('fc_edit_title_modal')
                        .setTitle('Edit Container Title');

                    const titleInput = new TextInputBuilder()
                        .setCustomId('title_input')
                        .setLabel("New Title")
                        .setStyle(TextInputStyle.Short)
                        .setValue(data.title)
                        .setRequired(true);

                    modal.addLabelComponents(new LabelBuilder().setLabel('Main Title').setTextInputComponent(titleInput));
                    
                    await selection.showModal(modal);

                    const submitted = await selection.awaitModalSubmit({ time: 300000, filter: i => i.user.id === interaction.user.id }).catch(() => null);
                    if (!submitted) return;

                    await submitted.deferReply({ flags: MessageFlags.Ephemeral });
                    data.title = submitted.fields.getTextInputValue('title_input');
                    
                    await message.edit(await renderContainer(data));
                    await data.save();
                    await submitted.editReply(`<:yes:1297814648417943565> Title updated.`);

                } else {
                    // --- EDIT FILE ---
                    const index = parseInt(value);
                    const fileData = data.files[index];

                    const modal = new ModalBuilder()
                        .setCustomId(`fc_edit_file_modal_${index}`)
                        .setTitle(`Edit File #${index + 1}`);

                    const nameInput = new TextInputBuilder()
                        .setCustomId('name_input')
                        .setLabel("Display Name")
                        .setStyle(TextInputStyle.Short)
                        .setValue(fileData.name)
                        .setRequired(true);

                    const fileUpload = new FileUploadBuilder()
                        .setCustomId('file_upload')
                        .setRequired(false); // Optional for edit

                    modal.addLabelComponents(
                        new LabelBuilder().setLabel('Name').setTextInputComponent(nameInput),
                        new LabelBuilder().setLabel('New File (Optional)').setFileUploadComponent(fileUpload)
                    );

                    await selection.showModal(modal);

                    const submitted = await selection.awaitModalSubmit({ time: 300000, filter: i => i.user.id === interaction.user.id }).catch(() => null);
                    if (!submitted) return;

                    await submitted.deferReply({ flags: MessageFlags.Ephemeral });

                    const newName = submitted.fields.getTextInputValue('name_input');
                    const uploadedFiles = submitted.fields.getUploadedFiles('file_upload');
                    const newFile = uploadedFiles ? uploadedFiles.first() : null;

                    data.files[index].name = newName;
                    if (newFile) {
                        data.files[index].url = newFile.url;
                        data.files[index].filename = newFile.name;
                    }

                    try {
                        await message.edit(await renderContainer(data));
                        await data.save();
                        await submitted.editReply(`<:yes:1297814648417943565> File #${index+1} updated.`);
                    } catch (e) {
                        console.error(e);
                        await submitted.editReply(`<:no:1297814819105144862> Update failed (File might be too large).`);
                    }
                }
            }

            // ===========================================
            //                 REMOVE
            // ===========================================
            if (sub === 'remove') {
                if (data.files.length === 0) return interaction.reply({ content: `<:no:1297814819105144862> No files to remove.`, flags: MessageFlags.Ephemeral });

                const options = data.files.map((f, i) => 
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`File #${i+1}: ${f.name.substring(0, 50)}`)
                        .setValue(i.toString())
                );

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('fc_remove_select')
                    .setPlaceholder('Select files to remove (Multiple allowed)')
                    .setMinValues(1)
                    .setMaxValues(options.length)
                    .addOptions(options);

                const response = await interaction.reply({
                    content: 'Select files to delete:',
                    components: [new ActionRowBuilder().addComponents(selectMenu)],
                    flags: MessageFlags.Ephemeral
                });

                const selection = await response.awaitMessageComponent({
                    componentType: ComponentType.StringSelect,
                    time: 60000
                }).catch(() => null);

                if (!selection) return interaction.deleteReply().catch(() => {});
                await selection.deferUpdate();

                // Sort indices descending to delete correctly
                const indices = selection.values.map(v => parseInt(v)).sort((a, b) => b - a);
                
                indices.forEach(idx => data.files.splice(idx, 1));

                await message.edit(await renderContainer(data));
                await data.save();
                
                await selection.editReply({ content: `<:yes:1297814648417943565> Removed ${indices.length} file(s).`, components: [] });
            }

        } catch (error) {
            console.error(error);
            if (!interaction.replied) await interaction.reply({ content: `<:no:1297814819105144862> Error: ${error.message}`, flags: MessageFlags.Ephemeral });
        }
    }
};

// ===========================================
// HELPER: MANUAL STREAMING RENDER
// ===========================================
const renderContainer = async (data) => {
    const container = new ContainerBuilder().setAccentColor(0x5865F2);

    // 1. Header
    container.addSectionComponents(new SectionBuilder()
        .addTextDisplayComponents(t => t.setContent(`## ${data.title}`))
    );

    const payloadFiles = [];

    if (data.files.length > 0) {
        const usedFilenames = new Set();

        // We use a for loop to await fetch operations
        for (let index = 0; index < data.files.length; index++) {
            const fileData = data.files[index];
            const num = index + 1;

            // Separator
            container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

            // Sub-Header
            container.addSectionComponents(new SectionBuilder()
                .addTextDisplayComponents(t => t.setContent(`### ${num}. ${fileData.name}`))
            );

            // Filename Handling
            let uniqueFileName = fileData.filename;
            if (usedFilenames.has(uniqueFileName)) {
                uniqueFileName = `${num}_${uniqueFileName}`;
            }
            usedFilenames.add(uniqueFileName);

            // Manual Fetch & Buffer (Prevents 413 Errors & URL issues)
            try {
                const res = await fetch(fileData.url);
                if (res.ok) {
                    const arrayBuffer = await res.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    
                    const attachment = new AttachmentBuilder(buffer, { name: uniqueFileName });
                    payloadFiles.push(attachment);

                    const fileComponent = new FileBuilder().setURL(`attachment://${uniqueFileName}`);
                    container.addFileComponents(fileComponent);
                } else {
                    // Fallback if URL expired/dead: Just Text
                    container.addSectionComponents(new SectionBuilder()
                        .addTextDisplayComponents(t => t.setContent(`⚠️ *File download failed (Source URL Expired)*`))
                    );
                }
            } catch (e) {
                console.error(`Failed to download ${fileData.url}`, e);
            }
        }
    } else {
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
        container.addSectionComponents(new SectionBuilder()
            .addTextDisplayComponents(t => t.setContent('_No files added yet._'))
        );
    }

    return { 
        content: '', 
        components: [container],
        files: payloadFiles,
        flags: MessageFlags.IsComponentsV2
    };
};
