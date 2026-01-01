const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const ThanksLB = require('../../../src/models/ThanksLB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('thanks-leaderboard')
        .setDescription('Manage the Thanks Leaderboard')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => 
            sub.setName('enable')
               .setDescription('Create the leaderboard message')
               .addChannelOption(opt => opt.setName('channel').setDescription('Where to post?').addChannelTypes(ChannelType.GuildText))
        )
        .addSubcommand(sub => 
            sub.setName('reset')
               .setDescription('Reset ALL thanks counts to 0 and update start date')
        )
        .addSubcommand(sub => 
            sub.setName('disable')
               .setDescription('Stop and delete the leaderboard data')
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // --- ENABLE ---
        if (sub === 'enable') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const channel = interaction.options.getChannel('channel') || interaction.channel;

            let data = await ThanksLB.findOne({ guildId });
            // Initialize with current time as start date
            if (!data) data = new ThanksLB({ guildId, startDate: Date.now() });

            // Send the initial leaderboard
            const embed = new EmbedBuilder()
                .setTitle('💖 Thanks Leaderboard')
                .setDescription('No data yet. Start thanking people!')
                .setColor(0x808080) // <--- GREY COLOR
                .setFooter({ text: 'Page 1' });
            // (Note: No .setTimestamp() here)

            // Format Date for Button
            const dateStr = new Date(data.startDate).toLocaleDateString('en-GB', { timeZone: 'Asia/Bangkok' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('thanks_prev').setEmoji('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(true),
                // MIDDLE BUTTON: DISABLED, SHOWS DATE
                new ButtonBuilder().setCustomId('thanks_date').setLabel(`Started: ${dateStr}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('thanks_next').setEmoji('➡️').setStyle(ButtonStyle.Secondary).setDisabled(true)
            );

            const msg = await channel.send({ embeds: [embed], components: [row] });

            data.channelId = channel.id;
            data.messageId = msg.id;
            data.currentPage = 1;
            // Ensure start date is set
            if (!data.startDate) data.startDate = Date.now();
            await data.save();

            return interaction.editReply(`<:yes:1297814648417943565> Leaderboard created in ${channel}.`);
        }

        // --- RESET ---
        if (sub === 'reset') {
            // Reset users AND update startDate to NOW
            await ThanksLB.findOneAndUpdate({ guildId }, { 
                users: [],
                startDate: Date.now() 
            });
            
            // Update visual immediately to show new date
            await updateLeaderboardVisual(interaction.client, guildId);
            
            return interaction.reply({ content: '<:yes:1297814648417943565> Leaderboard reset. Start date updated.', flags: MessageFlags.Ephemeral });
        }

        // --- DISABLE ---
        if (sub === 'disable') {
            const data = await ThanksLB.findOne({ guildId });
            if (data && data.channelId && data.messageId) {
                try {
                    const ch = await interaction.guild.channels.fetch(data.channelId);
                    const msg = await ch.messages.fetch(data.messageId);
                    await msg.delete();
                } catch (e) {}
            }
            await ThanksLB.deleteOne({ guildId });
            return interaction.reply({ content: '<:yes:1297814648417943565> Thanks Leaderboard disabled.', flags: MessageFlags.Ephemeral });
        }
    }
};

// --- VISUAL HELPER ---
async function updateLeaderboardVisual(client, guildId, page = 1) {
    const data = await ThanksLB.findOne({ guildId });
    if (!data || !data.channelId || !data.messageId) return;

    try {
        const guild = await client.guilds.fetch(guildId);
        const channel = await guild.channels.fetch(data.channelId);
        const msg = await channel.messages.fetch(data.messageId);

        const sorted = data.users.sort((a, b) => b.count - a.count);

        const ITEMS_PER_PAGE = 10;
        const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE) || 1;
        
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        const start = (page - 1) * ITEMS_PER_PAGE;
        const currentData = sorted.slice(start, start + ITEMS_PER_PAGE);

        const description = currentData.map((u, i) => {
            const rank = start + i + 1;
            let medal = '`' + rank + '.`';
            if (rank === 1) medal = '🥇';
            if (rank === 2) medal = '🥈';
            if (rank === 3) medal = '🥉';
            return `${medal} <@${u.userId}> — **${u.count}** thanks`;
        }).join('\n') || 'No thanks given yet.';

        // Use stored start date, or fallback to now if missing
        const startMillis = data.startDate || Date.now();
        const dateStr = new Date(startMillis).toLocaleDateString('en-GB', { timeZone: 'Asia/Bangkok' });

        const embed = EmbedBuilder.from(msg.embeds[0])
            .setDescription(description)
            .setColor(0x808080) // <--- ENSURE GREY ON UPDATES
            .setTimestamp(null) // <--- REMOVE TIMESTAMP
            .setFooter({ text: `Page ${page} of ${totalPages} • Limit resets daily at 07:00 AM (GMT+7)` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('thanks_prev').setEmoji('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(page === 1),
            // DATE BUTTON
            new ButtonBuilder().setCustomId('thanks_date').setLabel(`Started: ${dateStr}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('thanks_next').setEmoji('➡️').setStyle(ButtonStyle.Secondary).setDisabled(page === totalPages)
        );

        data.currentPage = page;
        await data.save();

        await msg.edit({ embeds: [embed], components: [row] });

    } catch (e) {
        console.error("Failed to update Thanks LB:", e);
    }
}

module.exports.updateLeaderboardVisual = updateLeaderboardVisual;
