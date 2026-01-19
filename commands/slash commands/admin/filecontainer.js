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

        // --- 3. EDIT ---
        .addSubcommand(sub => 
            sub.setName('edit')
                .setDescription('Edit the Title or a specific File')
                .addStringOption(opt => opt.setName('message_id').setDescription('The Message ID').setRequired(true))
                .addStringOption(opt => opt.setName('title').setDescription('New Main Title (Optional)'))
                .addIntegerOption(opt => opt.setName('number').setDescription('File Number to edit (Optional)'))
                .addStringOption(opt => opt.setName('name').setDescription('New Display Name (Optional)'))
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

        // --- RENDER FUNCTION ---
        const renderContainer = (data) => {
            const container = new ContainerBuilder();

            // Main Title
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${data.title}`)
            );

            const payloadFiles = [];

            if (data.files.length > 0) {
                const usedFilenames = new Set();

                data.files.forEach((fileData, index) => {
                    const num = index + 1;

                    container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                    );

                    container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### ${num}. ${fileData.name}`)
                    );

                    // Ensure unique filenames for Discord attachments
                    let uniqueFileName = fileData.filename;
                    if (usedFilenames.has(uniqueFileName)) {
                        uniqueFileName = `${num}_${uniqueFileName}`;
                    }
                    usedFilenames.add(uniqueFileName);
                    
                    const attachment = new AttachmentBuilder(fileData.url, { name: uniqueFileName });
                    payloadFiles.push(attachment);

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

                // 1. ADD TO LOCAL OBJECT (Memory Only)
                data.files.push({
                    name: name,                
                    url: attachment.url,       
                    filename: attachment.name  
                });

                // 2. TRY TO UPDATE DISCORD MESSAGE
                try {
                    await message.edit(renderContainer(data));
                    
                    // 3. IF SUCCESS -> SAVE TO DB
                    await data.save();
                    return interaction.editReply(`<:yes:1297814648417943565> Added **${name}**.`);

                } catch (err) {
                    // 4. IF FAILED -> REVERT LOCAL OBJECT & DO NOT SAVE
                    // We remove the file we just pushed so the object is clean again
                    data.files.pop(); 
                    console.error(err);

                    return interaction.editReply(`<:no:1297814819105144862> **Upload Failed!**\nThe total size of all files combined exceeds the Discord limit for this bot.\n\n*Changes were NOT saved.*`);
                }
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
                // Backup original files in case we need to revert
                const originalFiles = JSON.parse(JSON.stringify(data.files));
                const originalTitle = data.title;

                if (newTitle) {
                    data.title = newTitle;
                    changes.push('Title');
                }

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
                    return interaction.editReply(`<:no:1297814819105144862> You must provide the \`number\` option to edit a file.`);
                }

                if (changes.length === 0) {
                    return interaction.editReply(`<:no:1297814819105144862> You didn't provide any changes.`);
                }

                // TRY UPDATING DISCORD FIRST
                try {
                    await message.edit(renderContainer(data));
                    
                    // IF SUCCESS -> SAVE TO DB
                    await data.save();
                    return interaction.editReply(`<:yes:1297814648417943565> Updated: **${changes.join(', ')}**.`);

                } catch (err) {
                    // IF FAILED -> REVERT CHANGES
                    // We simply do nothing (since we haven't saved to DB yet)
                    // But to be safe for memory, we can restore:
                    return interaction.editReply(`<:no:1297814819105144862> **Update Failed!**\nThe changes would make the container too large.\n\n*Changes were NOT saved.*`);
                }
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
                
                // Removing files is always safe (size goes down), so we can save immediately
                await data.save();
                await message.edit(renderContainer(data));

                return interaction.editReply(`<:yes:1297814648417943565> Removed **${removedName}**.`);
            }

        } catch (error) {
            console.error(error);
            // Catch "Request entity too large" specifically
            if (error.code === 50035 || (error.message && error.message.includes('too large'))) {
                 return interaction.editReply(`<:no:1297814819105144862> **Critical Error:** Discord rejected the request because the files are too big.`);
            }
            return interaction.editReply(`<:no:1297814819105144862> Error: ${error.message}`);
        }
    }
};
