const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const ThanksLB = require('../../../src/models/ThanksLB');
const { updateLeaderboardVisual } = require('./thanksLeaderboard'); // Import helper

module.exports = {
    data: new SlashCommandBuilder()
        .setName('thanks')
        .setDescription('Give a thanks to someone (Max 3 per day)')
        .addUserOption(opt => 
            opt.setName('to')
               .setDescription('The user to thank')
               .setRequired(true)
        ),

    async execute(interaction) {
        const target = interaction.options.getUser('to');
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        if (target.id === userId) {
            return interaction.reply({ content: "🚫 You cannot thank yourself!", flags: MessageFlags.Ephemeral });
        }
        if (target.bot) {
            return interaction.reply({ content: "🚫 You cannot thank bots.", flags: MessageFlags.Ephemeral });
        }

        // Load DB
        let data = await ThanksLB.findOne({ guildId });
        if (!data) {
            return interaction.reply({ content: "⚠️ The Thanks system is not enabled yet. Ask an admin to use `/thanks-leaderboard enable`.", flags: MessageFlags.Ephemeral });
        }

        // --- 1. CALCULATE "BANKING DAY" (07:00 AM GMT+7 Logic) ---
        // We get current time in Bangkok time
        const now = new Date();
        const bangkokTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
        
        let bankingDayStr = "";
        
        // If it is BEFORE 7 AM, it belongs to "Yesterday's" cycle
        if (bangkokTime.getHours() < 7) {
            const yesterday = new Date(bangkokTime);
            yesterday.setDate(yesterday.getDate() - 1);
            bankingDayStr = yesterday.toDateString(); // e.g., "Thu Jan 01 2026"
        } else {
            // It is AFTER 7 AM, so it is "Today's" cycle
            bankingDayStr = bangkokTime.toDateString();
        }

        // --- 2. CHECK USAGE LIMIT ---
        const userUsageIndex = data.usage.findIndex(u => u.userId === userId);
        let currentUsage = 0;

        if (userUsageIndex === -1) {
            // New user, never thanked before
            data.usage.push({ userId, thanksUsed: 0, lastResetDate: bankingDayStr });
        } else {
            const usageData = data.usage[userUsageIndex];
            
            // Check reset
            if (usageData.lastResetDate !== bankingDayStr) {
                // It's a new day! Reset count
                usageData.thanksUsed = 0;
                usageData.lastResetDate = bankingDayStr;
            }
            currentUsage = usageData.thanksUsed;
        }

        if (currentUsage >= 3) {
            return interaction.reply({ 
                content: `⏳ **You have used all 3 thanks for today!**\nResets at **07:00 AM (GMT+7)**.`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        // --- 3. PROCESS THE THANKS ---
        
        // A. Increment Usage
        const finalUsageIndex = data.usage.findIndex(u => u.userId === userId);
        data.usage[finalUsageIndex].thanksUsed += 1;
        const remaining = 3 - data.usage[finalUsageIndex].thanksUsed;

        // B. Increment Target Score
        const targetIndex = data.users.findIndex(u => u.userId === target.id);
        if (targetIndex === -1) {
            data.users.push({ userId: target.id, count: 1 });
        } else {
            data.users[targetIndex].count += 1;
        }

        await data.save();

        // C. Update Visuals
        // We defer the update so it doesn't block the reply
        updateLeaderboardVisual(interaction.client, guildId, data.currentPage); 

        return interaction.reply({ 
            content: `💖 **${interaction.user.displayName}** thanked **${target.displayName}**!\nThey now have **${targetIndex === -1 ? 1 : data.users[targetIndex].count}** thanks.\n*(You have ${remaining} thanks left today)*` 
        });
    }
};
