const { 
    SlashCommandBuilder, 
    ContainerBuilder, 
    FileBuilder, 
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
                .setDescription('Send a new file container')
                .addStringOption(option => 
                    option.setName('name').setDescription('The title/header for the file').setRequired(true))
                .addAttachmentOption(option => 
                    option.setName('file').setDescription('The file to upload').setRequired(true))
                .addStringOption(option => 
                    option.setName('message_id').setDescription('Optional: Message ID to reply to'))
                .addChannelOption(option => 
                    option.setName('channel').setDescription('Optional: Channel to send to (defaults to current)'))
        )
        // Subcommand: EDIT
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit an existing file container')
                .addStringOption(option => 
                    option.setName('message_id').setDescription('The ID of the message to edit').setRequired(true))
                .addStringOption(option => 
                    option.setName('name').setDescription('New title (optional)'))
                .addAttachmentOption(option => 
                    option.setName('file').setDescription('New file (optional)'))
                .addChannelOption(option => 
                    option.setName('channel').setDescription('Channel where the message is (defaults to current)'))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        // Defer reply immediately
        await interaction.deferReply({ ephemeral: true });

        try {
            if (subcommand === 'send') {
                await handleSend(interaction);
            } else if (subcommand === 'edit') {
                await handleEdit(interaction);
            }
        } catch (error) {
            console.error('File Command Error:', error);
            await interaction.editReply(`${EMOJI.NO} **An error occurred:** ${error.message}`);
        }
    },
};

// ==========================================
// Logic: SEND
// ==========================================
async function handleSend(interaction) {
    const name = interaction.options.getString('name');
    const attachment = interaction.options.getAttachment('file');
    const replyMessageId = interaction.options.getString('message_id');
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    // 1. Build Payload
    const { container, filePayload } = buildContainerPayload(name, attachment.name, attachment.url);

    // 2. Determine Send Method
    const sendOptions = {
        components: [container],
        files: [filePayload],
        flags: MessageFlags.IsComponentsV2
    };

    if (replyMessageId) {
        try {
            const messageToReply = await targetChannel.messages.fetch(replyMessageId);
            await messageToReply.reply(sendOptions);
            await interaction.editReply(`${EMOJI.YES} File sent as a reply in ${targetChannel}!`);
        } catch (e) {
            throw new Error(`Could not reply to message ${replyMessageId}. Check ID and permissions.`);
        }
    } else {
        await targetChannel.send(sendOptions);
        await interaction.editReply(`${EMOJI.YES} File sent to ${targetChannel}!`);
    }
}

// ==========================================
// Logic: EDIT
// ==========================================
async function handleEdit(interaction) {
    const messageId = interaction.options.getString('message_id');
    const newName = interaction.options.getString('name');
    const newFile = interaction.options.getAttachment('file');
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    // 1. Fetch Message
    let message;
    try {
        message = await targetChannel.messages.fetch(messageId);
    } catch (e) {
        throw new Error("Message not found. Check the ID and Channel.");
    }

    if (!message.editable) throw new Error("I cannot edit that message (wrong author?).");

    // 2. Determine Data
    const titleToUse = newName || "Updated File";

    const editOptions = {
        flags: MessageFlags.IsComponentsV2
    };

    if (newFile) {
        // Scenario A: Replacing the file (New file, New Container)
        const { container, filePayload } = buildContainerPayload(titleToUse, newFile.name, newFile.url);
        editOptions.components = [container];
        editOptions.files = [filePayload];
    } else {
        // Scenario B: Updating Text Only (Keep existing file)
        const existingAttachment = message.attachments.first();
        if (!existingAttachment) throw new Error("The message has no existing file to preserve.");

        // Rebuild container pointing to EXISTING filename
        const container = new ContainerBuilder()
            .addTextDisplayComponents(t => t.setContent(`### ${titleToUse}`))
            .addSeparatorComponents(s => s)
            .addFileComponents(f => f.setURL(`attachment://${existingAttachment.name}`)); 

        editOptions.components = [container];
        // Note: We deliberately do NOT add `files: []` here, which tells Discord to keep the current attachments.
    }

    // 3. Execute Edit
    await message.edit(editOptions);
    await interaction.editReply(`${EMOJI.YES} Message updated successfully.`);
}

// ==========================================
// Helper: Container Builder
// ==========================================
function buildContainerPayload(nameText, fileName, fileUrl) {
    const filePayload = new AttachmentBuilder(fileUrl, { name: fileName });

    const container = new ContainerBuilder()
        .addTextDisplayComponents(text => 
            text.setContent(`### ${nameText}`)
        )
        .addSeparatorComponents(sep => sep)
        .addFileComponents(file => 
            file.setURL(`attachment://${fileName}`)
        );

    return { container, filePayload };
}
