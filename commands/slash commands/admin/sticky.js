const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    MessageFlags, 
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

const Sticky = require('../../../src/models/StickySchema'); // Adjust path as needed

// --- HELPER FUNCTION TO RENDER THE CONTAINER ---
const renderSticky = (content, isTemplate, title = '') => {
    const container = new ContainerBuilder();

    if (isTemplate) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 📌 ${title}`)
        );
        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
        );
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(content)
        );
    } else {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(content)
        );
    }

    return { 
        content: '', 
        components: [container],
        flags: MessageFlags.IsComponentsV2
    };
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sticky')
        .setDescription('Manage Sticky Messages for your server')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        
        // --- 1. ADD ---
        .addSubcommand(sub => 
            sub.setName('add')
                .setDescription('Set a sticky message for a channel')
                .addStringOption(opt => opt.setName('content').setDescription('The message content').setRequired(true))
                .addChannelOption(opt => opt.setName('channel').setDescription('Target Channel (Defaults to current)').addChannelTypes(ChannelType.GuildText))
        )

        // --- 2. REMOVE ---
        .addSubcommand(sub => 
            sub.setName('remove')
                .setDescription('Remove a sticky message from a channel')
                .addChannelOption(opt => opt.setName('channel').setDescription('Target Channel (Defaults to current)').addChannelTypes(ChannelType.GuildText))
        )

        // --- 3. LIST ---
        .addSubcommand(sub => 
            sub.setName('list')
                .setDescription('List all active sticky messages in this server')
        )

        // --- 4. TEMPLATE ---
        .addSubcommand(sub => 
            sub.setName('template')
                .setDescription('Format a channel\'s sticky message into a Container Template')
                .addStringOption(opt => opt.setName('title').setDescription('The Heading Title').setRequired(true))
                .addChannelOption(opt => opt.setName('channel').setDescription('Target Channel (Defaults to current)').addChannelTypes(ChannelType.GuildText))
        ),

    async execute(interaction) {
        // Deferring with ephemeral: true ensures EVERYTHING after this is ephemeral
        await interaction.deferReply({ ephemeral: true });

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            // ===========================================
            //                 ADD
            // ===========================================
            if (sub === 'add') {
                const content = interaction.options.getString('content');
                const channel = interaction.options.getChannel('channel') || interaction.channel;

                let data = await Sticky.findOne({ guildId, channelId: channel.id });
                if (data) {
                    return interaction.editReply(`<:no:1297814819105144862> ${channel} already has a sticky message. Remove it first!`);
                }

                // Send using the new Container V2
                const payload = renderSticky(content, false);
                const sentMsg = await channel.send(payload);

                await Sticky.create({
                    guildId,
                    channelId: channel.id,
                    content: content,
                    lastMessageId: sentMsg.id,
                    isTemplate: false
                });

                return interaction.editReply(`<:yes:1297814648417943565> Sticky message added to ${channel}!`);
            }

            // ===========================================
            //                 REMOVE
            // ===========================================
            if (sub === 'remove') {
                const channel = interaction.options.getChannel('channel') || interaction.channel;

                const data = await Sticky.findOneAndDelete({ guildId, channelId: channel.id });
                if (!data) {
                    return interaction.editReply(`<:no:1297814819105144862> No sticky message found in ${channel}.`);
                }

                if (data.lastMessageId) {
                    try {
                        const oldMsg = await channel.messages.fetch(data.lastMessageId);
                        if (oldMsg) await oldMsg.delete();
                    } catch (e) {}
                }

                return interaction.editReply(`<:yes:1297814648417943565> Sticky message removed from ${channel}.`);
            }

            // ===========================================
            //                 LIST
            // ===========================================
            if (sub === 'list') {
                const data = await Sticky.find({ guildId });
                
                if (!data || data.length === 0) {
                    return interaction.editReply('*There are no active sticky messages in this server.*');
                }

                const listContent = data.map((d, i) => `**${i + 1}.** <#${d.channelId}> - ${d.isTemplate ? '[Container Template]' : '[Standard Container]'}`).join('\n');
                
                return interaction.editReply(`### 📌 Active Sticky Messages:\n${listContent}`);
            }

            // ===========================================
            //               TEMPLATE
            // ===========================================
            if (sub === 'template') {
                const channel = interaction.options.getChannel('channel') || interaction.channel;
                const title = interaction.options.getString('title');

                const data = await Sticky.findOne({ guildId, channelId: channel.id });
                if (!data) {
                    return interaction.editReply(`<:no:1297814819105144862> You need to \`/sticky add\` a message to ${channel} before turning it into a template.`);
                }

                data.isTemplate = true;
                data.title = title;
                await data.save();

                if (data.lastMessageId) {
                    try {
                        const oldMsg = await channel.messages.fetch(data.lastMessageId);
                        if (oldMsg) await oldMsg.delete();
                    } catch (e) {}
                }

                // Send using the structured Template Container
                const payload = renderSticky(data.content, true, data.title);
                const sentMsg = await channel.send(payload);
                
                data.lastMessageId = sentMsg.id;
                await data.save();

                return interaction.editReply(`<:yes:1297814648417943565> Converted the sticky message in ${channel} to a Template!`);
            }

        } catch (error) {
            console.error(error);
            return interaction.editReply(`<:no:1297814819105144862> Error: ${error.message}`);
        }
    }
};
