const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const { GuildConfig, LootDrop, UserLootTracking } = require('../models/LootDropSchema'); 
const { buildLootContainer } = require('../commands/slash commands/admin/loot-drops'); 

async function handleLootInteraction(interaction) {
    // 5. LOOT DROPS (CLAIM BUTTON)
    if (interaction.customId === '536bd0f667bc4218861e4760b5fff9cd') {
        const drop = await LootDrop.findOne({ messageId: interaction.message.id });
        if (!drop) return interaction.reply({ content: `<:no:1297814819105144862> This loot drop is invalid.`, flags: MessageFlags.Ephemeral });

        if (drop.status === 'closed' || (drop.expireTime && Date.now() > drop.expireTime)) {
            if (drop.status !== 'closed') {
                drop.status = 'closed';
                await drop.save();
                await interaction.message.edit({ components: buildLootContainer(drop.type, drop), flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
            }
            return interaction.reply({ content: `<:no:1297814819105144862> This loot drop is no longer available.`, flags: MessageFlags.Ephemeral });
        }

        if (drop.claimedUsers.includes(interaction.user.id)) return interaction.reply({ content: `### <:no:1297814819105144862> You’ve already claimed this!`, flags: MessageFlags.Ephemeral });
        if (drop.specialRole && !interaction.member.roles.cache.has(drop.specialRole)) return interaction.reply({ content: `### <:no:1297814819105144862> You’re not eligible.`, flags: MessageFlags.Ephemeral });

        const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        let userTracking = null;
        let logicalDate = null;
        
        if (drop.type === 'link' && config && config.dailyClaimLimit > 0) {
            logicalDate = new Date(Date.now() + 3600000).toISOString().split('T')[0];
            userTracking = await UserLootTracking.findOne({ userId: interaction.user.id });
            if (userTracking && userTracking.lastLinkClaimDate === logicalDate && userTracking.claimsToday >= config.dailyClaimLimit) {
                return interaction.reply({ content: `### <:no:1297814819105144862> Daily limit reached (${config.dailyClaimLimit} per day).`, flags: MessageFlags.Ephemeral });
            }
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
            if (drop.type === 'link') {
                const prize = drop.prizes[drop.claimedCount];
                drop.claimedCount++; drop.claimedUsers.push(interaction.user.id);
                if (drop.claimedCount >= drop.maxAmount) drop.status = 'closed';
                await drop.save();
                if (config?.dailyClaimLimit > 0) {
                    if (!userTracking) await UserLootTracking.create({ userId: interaction.user.id, lastLinkClaimDate: logicalDate, claimsToday: 1 });
                    else { userTracking.lastLinkClaimDate = logicalDate; userTracking.claimsToday += 1; await userTracking.save(); }
                }
                await interaction.message.edit({ components: buildLootContainer(drop.type, drop), flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
                return interaction.editReply({ content: `## 🎉 Loot Claimed\n\n||${prize}||`, allowedMentions: { parse: [] } });
            } else {
                await interaction.member.roles.add(drop.rolePrizeId).catch(() => null);
                drop.claimedCount++; drop.claimedUsers.push(interaction.user.id);
                if (drop.maxAmount && drop.claimedCount >= drop.maxAmount) drop.status = 'closed';
                await drop.save();
                await interaction.message.edit({ components: buildLootContainer(drop.type, drop), flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
                return interaction.editReply({ content: `## 🎉 Role Added!`, allowedMentions: { parse: [] } });
            }
        } catch (e) { return interaction.editReply(`<:no:1297814819105144862> Error processing claim.`); }
    }

    // 6. VIEW REMAINING PRIZES
    if (interaction.customId === '26d2457488434623f04d00ddcb327a48') {
        const allowed = ['837741275603009626', '1469705529306910753'];
        if (!allowed.includes(interaction.user.id)) return interaction.reply({ content: "No permission.", flags: MessageFlags.Ephemeral });
        const drop = await LootDrop.findOne({ messageId: interaction.message.id });
        if (!drop || drop.type !== 'link') return;
        const prizeList = drop.prizes.slice(drop.claimedCount).map((p, i) => `**${i + 1}.** ||${p}||`).join('\n');
        return interaction.reply({ content: `### 💰 Remaining Prizes\n${prizeList}`, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
    }
}

module.exports = { handleLootInteraction };
