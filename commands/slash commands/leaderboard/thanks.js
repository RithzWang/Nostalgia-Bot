const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const ThanksLB = require('../../../src/models/ThanksLB');
const { updateLeaderboardVisual } = require('./thanksLeaderboard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('thanks')
        .setDescription('Give a thanks to someone') // Removed "(Max 3 per day)"
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

        // --- PROCESS THANKS (Unlimited) ---
        // We no longer check usage arrays or timestamps. Just add the point.

        const targetIndex = data.users.findIndex(u => u.userId === target.id);
        if (targetIndex === -1) {
            // New person receiving thanks
            data.users.push({ userId: target.id, count: 1 });
        } else {
            // Existing person
            data.users[targetIndex].count += 1;
        }

        await data.save();

        // Update the visual leaderboard
        updateLeaderboardVisual(interaction.client, guildId, data.currentPage); 

        // Reply (Removed "You have X thanks left")
        return interaction.reply({ 
            content: `💖 **${interaction.user.displayName}** thanked <@${target.id}>!\nThey now have **${targetIndex === -1 ? 1 : data.users[targetIndex].count}** thanks.` 
        });
    }
};
