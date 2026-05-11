const { 
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, 
    SeparatorSpacingSize, MessageFlags 
} = require('discord.js');
const ServerStatsConfig = require('../src/models/ServerStats');

async function generateServerStatsPayload(guild, config) {
    let tagAdoptersCount = 0;

    // 1. Calculate adopters and assign roles
    try {
        await guild.members.fetch();
        for (const [memberId, member] of guild.members.cache) {
            if (member.user.bot) continue;

            const user = member.user;
            // Check if user is using THIS server's tag via Identity
            const hasTag = user.primaryGuild && user.primaryGuild.identityEnabled && user.primaryGuild.identityGuildId === guild.id;
            
            if (hasTag) {
                tagAdoptersCount++;
                if (config.tagEnabled && config.tagRoleId && !member.roles.cache.has(config.tagRoleId)) {
                    await member.roles.add(config.tagRoleId).catch(() => {});
                }
            } else {
                if (config.tagEnabled && config.tagRoleId && member.roles.cache.has(config.tagRoleId)) {
                    await member.roles.remove(config.tagRoleId).catch(() => {});
                }
            }
        }
    } catch (e) {
        console.error(`[ServerStats] Failed to fetch members for ${guild.name}:`, e.message);
    }

    const humanCount = guild.members.cache.filter(m => !m.user.bot).size;
    const createdAtUnix = Math.floor(guild.createdTimestamp / 1000);
    const boostsCount = guild.premiumSubscriptionCount || 0;

    // 2. Build Base Container
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${guild.name}`)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `<:id:1468487725912166596> **ID:** \`${guild.id}\`\n` +
                `<:calendar:1470475413175144530> **Created:** <t:${createdAtUnix}:R>\n` +
                `<:server_boost:1468633171758284872> **Boosts:** ${boostsCount}\n` +
                `<:members:1468470163081924608> **Members:** ${humanCount}`
            )
        );

    // 3. Add Tag Statistics if Enabled
    if (config.tagEnabled) {
        let tagStatusLine = "";
        const hasClanFeature = guild.features.includes('CLAN') || guild.features.includes('GUILD_TAGS') || guild.features.includes('MEMBER_VERIFICATION_GATE_ENABLED');
        const boostsNeeded = 3 - boostsCount;

        if (boostsNeeded > 0) {
            const s = boostsNeeded === 1 ? '' : 's';
            const sRemain = boostsNeeded === 1 ? 's' : '';
            tagStatusLine = `<:no_boost:1468470028302024776> **${boostsNeeded} Boost${s} Remain${sRemain}**`;
        } else if (!hasClanFeature && tagAdoptersCount === 0) {
            tagStatusLine = `<:no_tag:1468470099026510001> **Not Enabled**`;
        } else {
            tagStatusLine = `<:greysword:1462853724824404069> **Tag Adopters:** ${tagAdoptersCount}`;
        }

        container
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("## Server Tag Statistics")
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `<:badge:1468618581427097724> **Tag:** ${config.tagText || "None"}\n` +
                    `${tagStatusLine}`
                )
            );
    }

    // 4. Add Footer (Next Update)
    const nextUpdateUnix = Math.floor((Date.now() + 60 * 1000) / 1000);
    container
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# <a:loading:1447184742934909032> Next Update: <t:${nextUpdateUnix}:R>`)
        );

    return [container];
}

async function updateServerStatsPanels(client) {
    const configs = await ServerStatsConfig.find();
    
    for (const config of configs) {
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) continue;

        const channel = guild.channels.cache.get(config.channelId) || await client.channels.fetch(config.channelId).catch(() => null);
        if (!channel) continue;

        const payload = await generateServerStatsPayload(guild, config);

        try {
            let msg = null;
            if (config.messageId) {
                msg = await channel.messages.fetch(config.messageId).catch(() => null);
            }

            if (msg && msg.editable) {
                await msg.edit({ components: payload, flags: [MessageFlags.IsComponentsV2] });
            } else {
                const newMsg = await channel.send({ components: payload, flags: [MessageFlags.IsComponentsV2] });
                config.messageId = newMsg.id;
                await config.save();
            }
        } catch (err) {
            console.error(`[ServerStats] Failed to update panel in ${guild.name}`);
        }
    }
}

module.exports = { generateServerStatsPayload, updateServerStatsPanels };
