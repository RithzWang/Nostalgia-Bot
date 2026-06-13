const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    MessageFlags, 
    ChannelType,
    EmbedBuilder
} = require('discord.js');

const Sticky = require('../../../src/models/StickySchema'); // Adjust path as needed

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
                .setDescription('Convert a channel\'s sticky message to a formatted Embed Template')
                .addStringOption(opt => opt.setName('title').setDescription('The Embed Title').setRequired(true))
                .addChannelOption(opt => opt.setName('channel').setDescription('Target Channel (Defaults to current)').addChannelTypes(ChannelType.GuildText))
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            // ===========================================
            //                 ADD
            // ===========================================
            if (sub === 'add') {
                const content = interaction.options.getString('content');
                const channel = interaction.options.getChannel('channel') || interaction.channel;

                // Check if one already exists
                let data = await Sticky.findOne({ guildId, channelId: channel.id });
                if (data) {
                    return interaction.editReply(`<:no:1297814819105144862> ${channel} already has a sticky message. Remove it first!`);
                }

                // Send the first sticky message
                const sentMsg = await channel.send({ content: content });

                // Save to database
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

                // Try to delete the lingering message
                if (data.lastMessageId) {
                    try {
                        const oldMsg = await channel.messages.fetch(data.lastMessageId);
                        if (oldMsg) await oldMsg.delete();
                    } catch (e) {
                        // Ignore if already deleted
                    }
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

                const listContent = data.map((d, i) => `**${i + 1}.** <#${d.channelId}> - ${d.isTemplate ? '[Embed Template]' : '[Plain Text]'}`).join('\n');
                
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

                // Delete old message and send new template
                if (data.lastMessageId) {
                    try {
                        const oldMsg = await channel.messages.fetch(data.lastMessageId);
                        if (oldMsg) await oldMsg.delete();
                    } catch (e) {}
                }

                const embed = new EmbedBuilder()
                    .setTitle(`📌 ${title}`)
                    .setDescription(data.content)
                    .setColor('Yellow');

                const sentMsg = await channel.send({ embeds: [embed] });
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
