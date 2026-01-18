const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    MessageFlags, 
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    FileBuilder,
    AttachmentBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

const FileContainer = require('../../../src/models/FileContainerSchema'); 

module.exports = {
    guildOnly: true,
    data: new SlashCommandBuilder()
        .setName('filecontainer')
        .setDescription('Manage File Container Messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // --- 1. SETUP ---
        .addSubcommand(sub => 
            sub.setName('setup')
                .setDescription('Create a new File Container')
                .addStringOption(opt => opt.setName('title').setDescription('The Main Title').setRequired(true))
                .addStringOption(opt => opt.setName('message_id').setDescription('Use existing message ID (Optional)'))
                .addChannelOption(opt => opt.setName('channel').setDescription('Target Channel (Optional)').addChannelTypes(ChannelType.GuildText))
        )

        // --- 2. ADD ---
        .addSubcommand(sub => 
            sub.setName('add')
                .setDescription('Add a file to a container')
                .addStringOption(opt => opt.setName('message_id').setDescription('The Message ID').setRequired(true))
                .addStringOption(opt => opt.setName('name').setDescription('Display Name').setRequired(true))
                .addAttachmentOption(opt => opt.setName('file').setDescription('Upload the file').setRequired(true))
                .addChannelOption(opt => opt.setName('channel').setDescription('Where is the message? (Optional)').addChannelTypes(ChannelType.GuildText))
        )

        // --- 3. EDIT (New Feature) ---
        .addSubcommand(sub => 
            sub.setName('edit')
                .setDescription('Edit the Title or a specific File')
                .addStringOption(opt => opt.setName('message_id').setDescription('The Message ID').setRequired(true))
                // Options
                .addStringOption(opt => opt.setName('title').setDescription('New Main Title (Optional)'))
                .addIntegerOption(opt => opt.setName('number').setDescription('File Number to edit (Optional)'))
                .addStringOption(opt => opt.setName('name').setDescription('New File Name (Optional)'))
                .addAttachmentOption(opt => opt.setName('file').setDescription('New File Attachment (Optional)'))
                .addChannelOption(opt => opt.setName('channel').setDescription('Where is the message? (Optional)').addChannelTypes(ChannelType.GuildText))
        )

        // --- 4. REMOVE ---
        .addSubcommand(sub => 
            sub.setName('remove')
                .setDescription('Remove a file by number')
                .addStringOption(opt => opt.setName('message_id').setDescription('The Message ID').setRequired(true))
                .addIntegerOption(opt => opt.setName('number').setDescription('The number of the file to remove').setRequired(true))
                .addChannelOption(opt => opt.setName('channel').setDescription('Where is the message? (Optional)').addChannelTypes(ChannelType.GuildText))
        ),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // --- HELPER: RENDER CONTAINER ---
        const renderContainer = (data) => {
            const container = new ContainerBuilder();
                // .setAccentColor(0x5865F2); 

            // 1. Main Title
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# ${data.title}`)
            );

            const payloadFiles = [];

            if (data.files.length > 0) {
                data.files.forEach((fileData, index) => {
                    const num = index + 1;

                    // Separator
                    container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                    );

                    // Sub-Header
                    container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## ${num}. ${fileData.name}`)
                    );

                    // File Attachment
                    const uniqueFileName = `${num}_${fileData.filename}`;
                    const attachment = new AttachmentBuilder(fileData.url, { name: uniqueFileName });
                    payloadFiles.push(attachment);

                    // File Component UI
                    const fileComponent = new FileBuilder()
                        .setURL(`attachment://${uniqueFileName}`);
                    
                    container.addFileComponents(fileComponent);
                });
            } else {
                container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('*No files added yet.*')
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
            // ===========================================
            //                 SETUP
            // ===========================================
            if (sub === 'setup') {
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

                await message.edit(renderContainer(newData));
                return interaction.editReply(`<:yes:1297814648417943565> Container created! ID: \`${message.id}\``);
            }

            // ===========================================
            //      COMMON LOGIC (Find DB & Message)
            // ===========================================
            const targetMsgId = interaction.options.getString('message_id');
            const data = await FileContainer.findOne({ messageId: targetMsgId });
            
            if (!data) return interaction.editReply(`<:no:1297814819105144862> No container found with ID \`${targetMsgId}\`.`);

            const targetChannel = interaction.options.getChannel('channel') || await interaction.guild.channels.fetch(data.channelId);
            const message = await targetChannel.messages.fetch(targetMsgId).catch(() => null);

            if (!message) return interaction.editReply(`<:no:1297814819105144862> The actual message seems to be deleted.`);

            // ===========================================
            //                 ADD
            // ===========================================
            if (sub === 'add') {
                const name = interaction.options.getString('name');
                const attachment = interaction.options.getAttachment('file');

                data.files.push({
                    name: name,
                    url: attachment.url, 
                    filename: attachment.name
                });

                await data.save();
                await message.edit(renderContainer(data));

                return interaction.editReply(`<:yes:1297814648417943565> Added **${name}**.`);
            }

            // ===========================================
            //                 EDIT
            // ===========================================
            if (sub === 'edit') {
                const newTitle = interaction.options.getString('title');
                const number = interaction.options.getInteger('number');
                const newName = interaction.options.getString('name');
                const newFile = interaction.options.getAttachment('file');

                let changes = [];

                // 1. Edit Main Title
                if (newTitle) {
                    data.title = newTitle;
                    changes.push('Title');
                }

                // 2. Edit Specific File
                if (number) {
                    const index = number - 1;
                    if (index < 0 || index >= data.files.length) {
                        return interaction.editReply(`<:no:1297814819105144862> Invalid file number: ${number}`);
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
                } else if (newName || newFile) {
                    // User provided name/file but forgot the number
                    return interaction.editReply(`<:no:1297814819105144862> You must provide the \`number\` option to edit a file.`);
                }

                if (changes.length === 0) {
                    return interaction.editReply(`<:no:1297814819105144862> You didn't provide any changes (title, name, or file).`);
                }

                await data.save();
                await message.edit(renderContainer(data));

                return interaction.editReply(`<:yes:1297814648417943565> Updated: **${changes.join(', ')}**.`);
            }

            // ===========================================
            //                 REMOVE
            // ===========================================
            if (sub === 'remove') {
                const number = interaction.options.getInteger('number');
                const index = number - 1;

                if (index < 0 || index >= data.files.length) {
                    return interaction.editReply(`<:no:1297814819105144862> Invalid number. Only ${data.files.length} files exist.`);
                }

                const removedName = data.files[index].name;
                data.files.splice(index, 1);
                
                await data.save();
                await message.edit(renderContainer(data));

                return interaction.editReply(`<:yes:1297814648417943565> Removed **${removedName}**.`);
            }

        } catch (error) {
            console.error(error);
            return interaction.editReply(`<:no:1297814819105144862> Error: ${error.message}`);
        }
    }
};
