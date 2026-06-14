const { MessageFlags, ContainerBuilder, TextDisplayBuilder } = require('discord.js');
const { GuildConfig, LootDrop, UserLootTracking } = require('../src/models/LootDropSchema'); // Adjust path as needed
const { buildLootContainer } = require('../commands/slash commands/admin/loot-drops'); // Adjust path as needed

async function handleLootInteraction(interaction) {
    
    // ===============================================
    // 1. CLAIM LOOT BUTTON
    // ===============================================
    if (interaction.customId === '536bd0f667bc4218861e4760b5fff9cd') {
        const messageId = interaction.message.id;
        const drop = await LootDrop.findOne({ messageId });

        if (!drop) {
            return interaction.reply({ 
                content: `<:no:1297814819105144862> This loot drop is invalid or missing from the database.`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        if (drop.status === 'closed' || (drop.expireTime && Date.now() > drop.expireTime)) {
            if (drop.status !== 'closed') {
                drop.status = 'closed';
                await drop.save();
                const components = buildLootContainer(drop);
                await interaction.message.edit({ components, flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
            }
            return interaction.reply({ 
                content: `<:no:1297814819105144862> This loot drop is no longer available.`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        if (drop.claimedUsers.includes(interaction.user.id)) {
            return interaction.reply({ 
                content: `### <:no:1297814819105144862> You’ve already claimed this loot drop!\nEach user can only claim this loot once.`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        if (drop.specialRole && !interaction.member.roles.cache.has(drop.specialRole)) {
            return interaction.reply({ 
                content: `### <:no:1297814819105144862> You’re not eligible to claim this loot drop!\nOnly users with <@&${drop.specialRole}> can claim this loot drop.`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        let userTracking = null;
        let logicalDate = null;
        
        if (config && config.dailyClaimLimit > 0) {
            logicalDate = new Date(Date.now() + 3600000).toISOString().split('T')[0];
            userTracking = await UserLootTracking.findOne({ userId: interaction.user.id });
            
            if (userTracking && userTracking.lastLinkClaimDate === logicalDate) {
                if (userTracking.claimsToday >= config.dailyClaimLimit) {
                    return interaction.reply({ 
                        content: `### <:no:1297814819105144862> You've reached today’s claim limit!\nEach user can only claim ${config.dailyClaimLimit} prize(s) per day.`, 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            }
        }

        // Defer reply strictly using the MessageFlags.Ephemeral flag
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const prizeLink = drop.prizes[drop.claimedCount];
            drop.claimedCount++;
            drop.claimedUsers.push(interaction.user.id);
            if (drop.claimedCount >= drop.maxAmount) drop.status = 'closed';
            await drop.save();

            if (config && config.dailyClaimLimit > 0) {
                if (!userTracking) {
                    await UserLootTracking.create({ userId: interaction.user.id, lastLinkClaimDate: logicalDate, claimsToday: 1 });
                } else {
                    if (userTracking.lastLinkClaimDate !== logicalDate) {
                        userTracking.lastLinkClaimDate = logicalDate;
                        userTracking.claimsToday = 1; 
                    } else {
                        userTracking.claimsToday += 1; 
                    }
                    await userTracking.save();
                }
            }

            const components = buildLootContainer(drop);
            await interaction.message.edit({ components, flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });

            return interaction.editReply({ 
                content: `## 🎉 Loot Claimed\n\nHere’s your **${drop.lootName}**:\n||${prizeLink}||`, 
                allowedMentions: { parse: [] },
                flags: MessageFlags.Ephemeral 
            });
        } catch (error) {
            console.error(error);
            return interaction.editReply({ 
                content: `<:no:1297814819105144862> An error occurred processing your claim.`,
                flags: MessageFlags.Ephemeral 
            });
        }
    }

    // ===============================================
    // 2. VIEW REMAINING PRIZES (💰 BUTTON)
    // ===============================================
    if (interaction.customId === '26d2457488434623f04d00ddcb327a48') {
        const allowedUsers = ['837741275603009626', '1469705529306910753'];
        
        if (!allowedUsers.includes(interaction.user.id)) {
            return interaction.reply({ 
                content: `<:no:1297814819105144862> You do not have permission to view the prizes.`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        const messageId = interaction.message.id;
        const drop = await LootDrop.findOne({ messageId });

        if (!drop) {
            return interaction.reply({ 
                content: `<:no:1297814819105144862> This loot drop is invalid.`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        // --- Build the dynamically marked list ---
        const prizeList = drop.prizes.map((prize, index) => {
            const isClaimed = index < drop.claimedCount;
            
            if (isClaimed) {
                const userId = drop.claimedUsers[index];
                return `${index + 1}. ${prize} <:Yes:1297814648417943565>\n-# claimed by: <@${userId}> (ID: \`${userId}\`)`;
            } else {
                return `${index + 1}. ${prize}`;
            }
        }).join('\n');

        // --- Build the Container ---
        const containerComponents = [
            new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## 💰 Loot\n${prizeList}`)
                )
        ];

        return interaction.reply({ 
            components: containerComponents, 
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2, 
            allowedMentions: { parse: [] }
        });
    }
}

module.exports = { handleLootInteraction };
