const { 
    ContainerBuilder, TextDisplayBuilder, SectionBuilder, 
    ButtonBuilder, ButtonStyle, SeparatorBuilder, SeparatorSpacingSize,
    ActionRowBuilder, MessageFlags 
} = require('discord.js');
const { GTSHub, GTSServer } = require('../src/models/GTS');

function getStatusLine(guild, tagCount, badgePack = 'default') {
    if (!guild) return `<:no_tag:1518693542460129373> **Not Available**`;
    
    const currentBoosts = guild.premiumSubscriptionCount || 0;
    
    // 1. Base Server Tag Perk (Requires 3 Boosts)
    if (currentBoosts < 3) {
        const baseNeeded = 3 - currentBoosts;
        const boostGrammar = baseNeeded === 1 ? "1 Boost Remaining" : `${baseNeeded} Boosts Remaining`;
        return `<:no_boost:1518693461878902904> **${boostGrammar}**\n-# <:tl2:1519042925713952838> to enable the **Server Tag** perk`;
    }
    
    // 2. Badge Pack Requirement Check (Requires 3 Base + X Extra Boosts)
    let extraRequired = 0;
    let packName = "";
    
    switch (badgePack) {
        case 'creepy_crawlies': extraRequired = 2; packName = "Creepy Crawlies Badge"; break;
        case 'pet': extraRequired = 3; packName = "Pet Badge"; break;
        case 'plant': extraRequired = 3; packName = "Plant Badge"; break;
        case 'flex': extraRequired = 5; packName = "Flex Badge"; break;
    }
    
    if (extraRequired > 0) {
        const totalRequired = 3 + extraRequired;
        if (currentBoosts < totalRequired) {
            const packNeeded = totalRequired - currentBoosts;
            const packGrammar = packNeeded === 1 ? "1 Boost Remaining" : `${packNeeded} Boosts Remaining`;
            // Uses the no_tag emoji as requested for badge pack deficits
            return `<:no_tag:1518693542460129373> **${packGrammar}**\n-# <:tl2:1519042925713952838> to enable the **${packName}** pack`;
        }
    }
    
    // 3. Fully Enabled (All boost requirements met)
    const hasClanFeature = guild.features.includes('CLAN') || guild.features.includes('GUILD_TAGS') || guild.features.includes('MEMBER_VERIFICATION_GATE_ENABLED');
    
    if (!hasClanFeature && tagCount === 0) {
        return `<:no_tag:1518693542460129373> **Not Enabled**`;
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
    // 1. DATA CALCULATION & ROLE SYNC PHASE
    // ==========================================
    let globalTagAdopters = 0;

    // 🟢 MAIN SERVER SWEEP
    let mainLocalTags = 0;
    const mainData = allServers.find(s => s.serverId === hub.mainServerId) || {};
    
    for (const [id, m] of mainGuild.members.cache) {
        if (m.user.bot) continue;
        
        const identityId = m.user.primaryGuild?.identityGuildId;
        
        if (identityId === hub.mainServerId) mainLocalTags++;

        if (identityId) {
            const srvData = allServers.find(s => s.serverId === identityId);
            if (srvData) {
                if (hub.defaultTagRole && !m.roles.cache.has(hub.defaultTagRole)) {
                    m.roles.add(hub.defaultTagRole).catch(() => {});
                }
                if (srvData.mainTagRole && !m.roles.cache.has(srvData.mainTagRole)) {
                    m.roles.add(srvData.mainTagRole).catch(() => {});
                }
            }
        }
    }
    globalTagAdopters += mainLocalTags;

    // ✅ Pass the tagBadgePack to the status checker
    const mainStatus = getStatusLine(mainGuild, mainLocalTags, mainData.tagBadgePack);
    const mainInviteUrl = mainData.inviteLink && mainData.inviteLink.startsWith('http') ? mainData.inviteLink : "https://discord.com";

    // 🟢 SATELLITE SERVER SWEEP
    const satellites = allServers.filter(s => s.serverId !== hub.mainServerId);
    const satellitePayloadData = [];

    satellites.forEach(satData => {
        const guild = client.guilds.cache.get(satData.serverId);
        if (!guild) return;

        const humanCount = guild.members.cache.filter(m => !m.user.bot).size;
        
        let satLocalTags = 0;
        for (const [id, m] of guild.members.cache) {
            if (m.user.bot) continue;
            
            const identityId = m.user.primaryGuild?.identityGuildId;
            
            if (identityId === satData.serverId) {
                satLocalTags++;

                if (satData.localTagRole && !m.roles.cache.has(satData.localTagRole)) {
                    m.roles.add(satData.localTagRole).catch(() => {});
                }
            }
        }
        globalTagAdopters += satLocalTags;

        // ✅ Pass the tagBadgePack to the status checker
        const satStatus = getStatusLine(guild, satLocalTags, satData.tagBadgePack);
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
    // 2. BLUEPRINT RENDER ENGINE (Now requires targetGuildId)
    // ==========================================
    const renderPayload = (targetGuildId) => {
        const containers = [];

        // 📌 Check if the Main Server gets the pin
        const mainPin = mainGuild.id === targetGuildId ? " 📍" : "";

        // Build Container 1 (Header + Main Server)
        const container1 = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("# 📊 Server Statistics"))
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setStyle(ButtonStyle.Secondary)
                    .setLabel(`Total Tag Adopters: ${globalTagAdopters}/${mainHumanCount}`)
                    .setCustomId("stats_adopt_btn")
                    .setDisabled(true)
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
            .addSectionComponents(
                new SectionBuilder()
                    .setButtonAccessory(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Server Link").setURL(mainInviteUrl))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## [${mainGuild.name}](${mainInviteUrl})${mainPin}`),
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
                // 📌 Check if THIS satellite gets the pin
                const satPin = sat.id === targetGuildId ? " 📍" : "";

                container2.addSectionComponents(
                    new SectionBuilder()
                        .setButtonAccessory(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Server Link").setURL(sat.inviteUrl))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`## [${sat.name}](${sat.inviteUrl})${satPin}`),
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

    // Despatch A: Main Hub
    if (hub.dashboardChannelId) {
        const hubChannel = mainGuild.channels.cache.get(hub.dashboardChannelId) || await client.channels.fetch(hub.dashboardChannelId).catch(() => null);
        if (hubChannel) {
            try {
                // 🎯 Generate the custom payload specifically for the Main Server
                const hubPayload = renderPayload(hub.mainServerId);

                let msg = null;
                if (hub.dashboardMessageId) msg = await hubChannel.messages.fetch(hub.dashboardMessageId).catch(() => null);
                if (msg && msg.editable) {
                    await msg.edit({ components: hubPayload, flags: [MessageFlags.IsComponentsV2] });
                } else {
                    const newMsg = await hubChannel.send({ components: hubPayload, flags: [MessageFlags.IsComponentsV2] });
                    hub.dashboardMessageId = newMsg.id;
                    await hub.save();
                }
            } catch (err) { console.error("Failed handling Hub Dashboard distribution:", err); }
        }
    }

    // Despatch B: Satellites
    for (const satData of allServers) {
        if (!satData.localDashboardChannelId) continue; 

        const satGuild = client.guilds.cache.get(satData.serverId);
        if (!satGuild) continue;

        const satChannel = satGuild.channels.cache.get(satData.localDashboardChannelId) || await client.channels.fetch(satData.localDashboardChannelId).catch(() => null);
        if (!satChannel) continue;

        try {
            // 🎯 Generate the custom payload specifically for THIS Satellite Server
            const satPayload = renderPayload(satData.serverId);

            let msg = null;
            if (satData.localDashboardMessageId) msg = await satChannel.messages.fetch(satData.localDashboardMessageId).catch(() => null);
            
            if (msg && msg.editable) {
                await msg.edit({ components: satPayload, flags: [MessageFlags.IsComponentsV2] });
            } else {
                const newMsg = await satChannel.send({ components: satPayload, flags: [MessageFlags.IsComponentsV2] });
                satData.localDashboardMessageId = newMsg.id;
                await satData.save();
            }
        } catch (err) {
            console.error(`Failed distributing cloned tags dashboard to satellite server: ${satGuild.name}`, err);
        }
    }
}

module.exports = { updateGTSDashboard };
