const { 
    ContainerBuilder, TextDisplayBuilder, SectionBuilder, 
    ButtonBuilder, ButtonStyle, SeparatorBuilder, SeparatorSpacingSize,
    ActionRowBuilder, MessageFlags 
} = require('discord.js');
const { GTSHub, GTSServer } = require('../src/models/GTS');

function getStatusLine(guild, tagCount) {
    if (!guild) return `<:no_tag:1468470099026510001> **Not Available**`;
    
    const boostCount = guild.premiumSubscriptionCount || 0;
    const boostsNeeded = 3 - boostCount;
    
    if (boostsNeeded > 0) {
        return boostsNeeded === 1 
            ? `<:no_boost:1468470028302024776> **1 Boost Remains**` 
            : `<:no_boost:1468470028302024776> **${boostsNeeded} Boosts Remain**`;
    }
    
    const hasClanFeature = guild.features.includes('CLAN') || guild.features.includes('GUILD_TAGS') || guild.features.includes('MEMBER_VERIFICATION_GATE_ENABLED');
    
    if (!hasClanFeature && tagCount === 0) {
        return `<:no_tag:1468470099026510001> **Not Enabled**`;
    }
    
    return `<:greysword:1462853724824404069> **Tag Adopters:** ${tagCount}`;
}

async function updateGTSDashboard(client) {
    const hub = await GTSHub.findOne();
    if (!hub) return;

    const mainGuild = client.guilds.cache.get(hub.mainServerId);
    if (!mainGuild) return;

    const allServers = await GTSServer.find();
    const mainHumanCount = mainGuild.members.cache.filter(m => !m.user.bot).size;

    // ==========================================
    // 1. DATA CALCULATION PHASE
    // ==========================================
    let globalTagAdopters = 0;

    // Fetch and sync main hub local counts
    let mainLocalTags = 0;
    for (const [id, m] of mainGuild.members.cache) {
        if (!m.user.bot && m.user.primaryGuild && m.user.primaryGuild.identityGuildId === hub.mainServerId) mainLocalTags++;
    }
    globalTagAdopters += mainLocalTags;

    const mainData = allServers.find(s => s.serverId === hub.mainServerId) || {};
    const mainStatus = getStatusLine(mainGuild, mainLocalTags);
    const mainInviteUrl = mainData.inviteLink && mainData.inviteLink.startsWith('http') ? mainData.inviteLink : "https://discord.com";

    // Gather statistics arrays across all satellite clusters
    const satellites = allServers.filter(s => s.serverId !== hub.mainServerId);
    const satellitePayloadData = [];

    satellites.forEach(satData => {
        const guild = client.guilds.cache.get(satData.serverId);
        if (!guild) return;

        const humanCount = guild.members.cache.filter(m => !m.user.bot).size;
        
        let satLocalTags = 0;
        for (const [id, m] of guild.members.cache) {
            if (!m.user.bot && m.user.primaryGuild && m.user.primaryGuild.identityGuildId === satData.serverId) satLocalTags++;
        }
        globalTagAdopters += satLocalTags;

        const satStatus = getStatusLine(guild, satLocalTags);
        const satInviteUrl = satData.inviteLink && satData.inviteLink.startsWith('http') ? satData.inviteLink : "https://discord.com";

        satellitePayloadData.push({
            name: guild.name,
            id: guild.id,
            tagText: satData.tagText,
            inviteUrl: satInviteUrl,
            humanCount: humanCount,
            statusLine: satStatus
        });
    });

    // ==========================================
    // 2. BLUEPRINT RENDER ENGINE
    // ==========================================
    const renderPayload = () => {
        const containers = [];

        // Build Container 1 (Header + Main Server)
        const container1 = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("# » Our Server Tags Statistics"))
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setStyle(ButtonStyle.Secondary)
                    .setLabel(`Total Tags Adopters: ${globalTagAdopters}/${mainHumanCount}`)
                    .setCustomId("stats_adopt_btn")
                    .setDisabled(true)
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
            .addSectionComponents(
                new SectionBuilder()
                    .setButtonAccessory(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Server Link").setURL(mainInviteUrl))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## [${mainGuild.name}](${mainInviteUrl})`),
                        new TextDisplayBuilder().setContent(
                            `<:id:1468487725912166596> **ID:** \`${mainGuild.id}\`\n` +
                            `<:badge:1468618581427097724> **Server Tag:** ${mainData.tagText || "None"}\n` +
                            `<:members:1468470163081924608> **Members:** ${mainHumanCount}\n` +
                            `${mainStatus}`
                        )
                    )
            );
        containers.push(container1);

        // Build Container 2 (Satellites)
        if (satellitePayloadData.length > 0) {
            const container2 = new ContainerBuilder();

            satellitePayloadData.forEach((sat, index) => {
                container2.addSectionComponents(
                    new SectionBuilder()
                        .setButtonAccessory(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Server Link").setURL(sat.inviteUrl))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`## [${sat.name}](${sat.inviteUrl})`),
                            new TextDisplayBuilder().setContent(
                                `<:id:1468487725912166596> **ID:** \`${sat.id}\`\n` +
                                `<:badge:1468618581427097724> **Server Tag:** ${sat.tagText || "None"}\n` +
                                `<:members:1468470163081924608> **Members:** ${sat.humanCount}\n` +
                                `${sat.statusLine}`
                            )
                        )
                );

                if (index < satellitePayloadData.length - 1) {
                    container2.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false));
                }
            });

            const nextUpdateUnix = Math.floor((Date.now() + 60 * 1000) / 1000);
            container2
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# <a:loading:1447184742934909032> Next Update: <t:${nextUpdateUnix}:R>`));
            
            containers.push(container2);
        }

        return containers;
    };

    // ==========================================
    // 3. BROADCAST DESPATCH
    // ==========================================
    const sharedPayload = renderPayload();

    // Despatch A: Update Main Hub Dashboard Placement
    if (hub.dashboardChannelId) {
        const hubChannel = mainGuild.channels.cache.get(hub.dashboardChannelId) || await client.channels.fetch(hub.dashboardChannelId).catch(() => null);
        if (hubChannel) {
            try {
                let msg = null;
                if (hub.dashboardMessageId) msg = await hubChannel.messages.fetch(hub.dashboardMessageId).catch(() => null);
                if (msg && msg.editable) {
                    await msg.edit({ components: sharedPayload, flags: [MessageFlags.IsComponentsV2] });
                } else {
                    const newMsg = await hubChannel.send({ components: sharedPayload, flags: [MessageFlags.IsComponentsV2] });
                    hub.dashboardMessageId = newMsg.id;
                    await hub.save();
                }
            } catch (err) { console.error("Failed handling Hub Dashboard distribution:", err); }
        }
    }

    // Despatch B: Loop and distribute to all configured Satellite Placements
    for (const satData of allServers) {
        if (!satData.localDashboardChannelId) continue; 

        const satGuild = client.guilds.cache.get(satData.serverId);
        if (!satGuild) continue;

        const satChannel = satGuild.channels.cache.get(satData.localDashboardChannelId) || await client.channels.fetch(satData.localDashboardChannelId).catch(() => null);
        if (!satChannel) continue;

        try {
            let msg = null;
            if (satData.localDashboardMessageId) msg = await satChannel.messages.fetch(satData.localDashboardMessageId).catch(() => null);
            
            if (msg && msg.editable) {
                await msg.edit({ components: sharedPayload, flags: [MessageFlags.IsComponentsV2] });
            } else {
                const newMsg = await satChannel.send({ components: sharedPayload, flags: [MessageFlags.IsComponentsV2] });
                satData.localDashboardMessageId = newMsg.id;
                await satData.save();
            }
        } catch (err) {
            console.error(`Failed distributing cloned tags dashboard to satellite server: ${satGuild.name}`, err);
        }
    }
}

module.exports = { updateGTSDashboard };
