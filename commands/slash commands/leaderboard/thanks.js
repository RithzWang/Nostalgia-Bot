const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const ThanksLB = require('../../../src/models/ThanksLB');
const { updateLeaderboardVisual } = require('./thanksLeaderboard');

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
            return interaction.reply({ content: "⚠️ The Thanks system is not enabled yet.", flags: MessageFlags.Ephemeral });
        }

        // --- 1. CALCULATE BANKING DAY (GMT+7) ---
        const now = new Date();
        const bangkokTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
        
        let bankingDayStr = "";
        
        // GMT+7 logic: If before 7 AM, it counts as yesterday
        if (bangkokTime.getHours() < 7) {
            const yesterday = new Date(bangkokTime);
            yesterday.setDate(yesterday.getDate() - 1);
            bankingDayStr = yesterday.toDateString();
        } else {
            bankingDayStr = bangkokTime.toDateString();
        }

        // --- 2. CHECK USAGE LIMIT ---
        const userUsageIndex = data.usage.findIndex(u => u.userId === userId);
        let currentUsage = 0;

        if (userUsageIndex === -1) {
            data.usage.push({ userId, thanksUsed: 0, lastResetDate: bankingDayStr });
        } else {
            const usageData = data.usage[userUsageIndex];
            if (usageData.lastResetDate !== bankingDayStr) {
                // Reset for new day
                usageData.thanksUsed = 0;
                usageData.lastResetDate = bankingDayStr;
            }
            currentUsage = usageData.thanksUsed;
        }

        // --- LIMIT REACHED LOGIC ---
        if (currentUsage >= 3) {
            // Calculate NEXT 7 AM GMT+7 in UNIX timestamp
            // 7 AM GMT+7 is exactly 00:00 UTC.
            const nowUTC = new Date();
            const resetTime = new Date(nowUTC);
            
            resetTime.setUTCHours(0, 0, 0, 0); // Set to today 00:00 UTC (07:00 BKK)

            // If we have passed today's 00:00 UTC, the next reset is tomorrow 00:00 UTC
            if (nowUTC > resetTime) {
                resetTime.setDate(resetTime.getDate() + 1);
            }

            const timestamp = Math.floor(resetTime.getTime() / 1000);

            return interaction.reply({ 
                content: `⏳ **You have used all 3 thanks for today!**\nLimit resets daily at <t:${timestamp}:t> (<t:${timestamp}:R>)`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        // --- 3. PROCESS THANKS ---
        const finalUsageIndex = data.usage.findIndex(u => u.userId === userId);
        data.usage[finalUsageIndex].thanksUsed += 1;
        const remaining = 3 - data.usage[finalUsageIndex].thanksUsed;

        const targetIndex = data.users.findIndex(u => u.userId === target.id);
        if (targetIndex === -1) {
            data.users.push({ userId: target.id, count: 1 });
        } else {
            data.users[targetIndex].count += 1;
        }

        await data.save();

        updateLeaderboardVisual(interaction.client, guildId, data.currentPage); 

        // PINGING MEMBER HERE vvv
        return interaction.reply({ 
            content: `💖 **${interaction.user.displayName}** thanked <@${target.id}>!\nThey now have **${targetIndex === -1 ? 1 : data.users[targetIndex].count}** thanks.\n*(You have ${remaining} thanks left today)*` 
        });
    }
};
