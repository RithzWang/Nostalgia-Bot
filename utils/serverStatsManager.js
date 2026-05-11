const { 
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, 
    SeparatorSpacingSize, MessageFlags, MediaGalleryBuilder, 
    MediaGalleryItemBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder 
} = require('discord.js');
const ServerStatsConfig = require('../src/models/ServerStats');

async function generateServerStatsPayload(guild, config) {
    let tagAdoptersCount = 0;

    try {
        await guild.members.fetch();
        for (const [memberId, member] of guild.members.cache) {
            if (member.user.bot) continue;
            const user = member.user;
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

    const container = new ContainerBuilder()
        .addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder()
                        .setURL("https://cdn.discordapp.com/attachments/853503167706693632/1466977972685766851/Untitled102_20260131090625.png?ex=6a028b33&is=6a0139b3&hm=ca6a6523bed88d2ee71c620138a393f6d967295f5b492fcbc7798bdb3541507d&")
                )
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("## Server Statistics"))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${guild.name}\n` +
                `<:id:1468487725912166596> **ID:** \`${guild.id}\`\n` +
                `<:calendar:1470475413175144530> **Created:** <t:${createdAtUnix}:R>\n` +
                `<:server_boost:1468633171758284872> **Boosts:** ${boostsCount}\n` +
                `<:members:1468470163081924608> **Members:** ${humanCount}`
            )
        );

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
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("## Server Tag"))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `<:badge:1468618581427097724> **Name:** ${config.tagText || "None"}\n${tagStatusLine}`
                )
            );
    }

    const nextUpdateUnix = Math.floor((Date.now() + 60 * 1000) / 1000);
    container
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# <a:loading:1447184742934909032> Next Update: <t:${nextUpdateUnix}:R>`));

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
            if (config.messageId) msg = await channel.messages.fetch(config.messageId).catch(() => null);

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

// --- UI BUILDERS FOR THE SETUP MENU ---
function buildHomeMenu(config) {
    const isEnabled = !!config && !!config.channelId;
    const tagEnabled = config ? !!config.tagEnabled : false;

    return [
        new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("# Server Stats Set-up"))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Server Stats:** (${isEnabled ? '<:Yes:1297814648417943565>' : '<:No:1297814819105144862>'})\n**Server Tag Stats:** (${tagEnabled ? '<:Yes:1297814648417943565>' : '<:No:1297814819105144862>'})`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setStyle(isEnabled ? ButtonStyle.Danger : ButtonStyle.Success).setLabel(isEnabled ? "Disable" : "Enable").setCustomId("ss_btn_toggle"),
                    new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel("Server Stats").setCustomId("ss_btn_menu_stats").setDisabled(!isEnabled),
                    new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel("Server Tag Stats").setCustomId("ss_btn_menu_tags").setDisabled(!isEnabled)
                )
            )
    ];
}

function buildStatsMenu(config) {
    const msgStr = config.messageId ? `\`${config.messageId}\`` : "None";
    const chStr = config.channelId ? `<#${config.channelId}>` : "None";

    return [
        new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("# Server Stats"))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Message ID:** ${msgStr}\n**Channel:** ${chStr}`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel("Edit Message").setCustomId("ss_btn_edit_stats"),
                    new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel("Home").setCustomId("ss_btn_home")
                )
            )
    ];
}

function buildTagStatsMenu(config) {
    const tagStr = config.tagText ? `\`${config.tagText}\`` : "<:No:1297814819105144862>";
    const roleStr = config.tagRoleId ? `<@&${config.tagRoleId}>` : "<:No:1297814819105144862>";

    return [
        new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("# Server Tag Stats"))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Server Tag:** ${tagStr}\n**Tag Adopter Role:** ${roleStr}`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel("Server Tag Text").setCustomId("ss_btn_edit_tag"),
                    new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel("Tag Adopter Role").setCustomId("ss_btn_edit_role"),
                    new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel("Home").setCustomId("ss_btn_home")
                )
            )
    ];
}

module.exports = { generateServerStatsPayload, updateServerStatsPanels, buildHomeMenu, buildStatsMenu, buildTagStatsMenu };
