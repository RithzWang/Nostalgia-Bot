const { SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ThanksLB = require('../../../src/models/ThanksLB');
const { updateLeaderboardVisual } = require('./thanksLeaderboard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('thanks')
        .setDescription('Give a thanks to someone')
        .addUserOption(opt => 
            opt.setName('to')
               .setDescription('The user to thank')
               .setRequired(true)
        ),

    async execute(interaction) {
        const target = interaction.options.getUser('to');
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        // Basic Checks
        if (target.id === userId) {
            return interaction.reply({ content: "🚫 You cannot thank yourself!", flags: MessageFlags.Ephemeral });
        }
        if (target.bot) {
            return interaction.reply({ content: "🚫 You cannot thank bots.", flags: MessageFlags.Ephemeral });
        }

        // Load DB
        let data = await ThanksLB.findOne({ guildId });
        if (!data) {
            return interaction.reply({ content: "⚠️ The Thanks system is not enabled yet.", flags: MessageFlags.Ephemeral });
        }

        // --- PROCESS THANKS ---
        const targetIndex = data.users.findIndex(u => u.userId === target.id);
        let newCount = 0;

        if (targetIndex === -1) {
            data.users.push({ userId: target.id, count: 1 });
            newCount = 1;
        } else {
            data.users[targetIndex].count += 1;
            newCount = data.users[targetIndex].count;
        }

        await data.save();

        // Update the visual leaderboard
        updateLeaderboardVisual(interaction.client, guildId, data.currentPage); 

        // --- PREPARE RESPONSE ---
        const channelLink = data.channelId ? `<#${data.channelId}>` : 'the leaderboard channel';

        // 1. Create Embed
        const embed = new EmbedBuilder()
            .setTitle('Thank You 💖')
            .setDescription(`<@${userId}> thanked <@${target.id}>\nThey now have **${newCount}** thanks.\n\nSee leaderboard [Click Here](https://discord.com/channels/1456197054782111756/1456345518962905171)`)
            .setColor(0x808080);

        // 2. Create Time Button (dd/mm/yyyy, hh:mm:ss (GMT+7))
        const now = new Date();
        const timeStr = now.toLocaleString('en-GB', { 
            timeZone: 'Asia/Bangkok', 
            hour12: false,
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        }) + ' (GMT+7)';

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('thanks_time')
                .setLabel(timeStr)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    }
};
