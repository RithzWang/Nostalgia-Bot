const { 
    ContainerBuilder, TextDisplayBuilder, SectionBuilder, 
    ButtonBuilder, ButtonStyle, SeparatorBuilder, SeparatorSpacingSize,
    ActionRowBuilder, MessageFlags 
} = require('discord.js');

const NetworkConfig = require('../src/models/NetworkConfig');
const { ServerList } = require('../src/models/Network');

// ==========================================
// 1. HELPERS (From your original code)
// ==========================================
function createInviteButton(link) {
    const isValid = link && link.startsWith('http');
    const btn = new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel("Server Link")
        .setURL(isValid ? link : 'https://discord.com');
    
    if (!isValid) btn.setDisabled(true);
    return btn;
}

function getServerStats(guild, currentTagCount) {
    let tagStatusLine = "";
    let isEnabled = false;
    if (guild) {
        const hasClanFeature = guild.features.includes('CLAN') || guild.features.includes('GUILD_TAGS') || guild.features.includes('MEMBER_VERIFICATION_GATE_ENABLED'); 
        const hasActiveAdopters = currentTagCount > 0; 
        const boostCount = guild.premiumSubscriptionCount || 0;
        const boostsNeeded = 3 - boostCount;
        if (boostsNeeded > 0) {
             const s = boostsNeeded === 1 ? '' : 's';
             tagStatusLine = `<:no_boost:1468470028302024776> **${boostsNeeded} Boost${s} Remain**`; 
             if(boostsNeeded === 1) tagStatusLine = `<:no_boost:1468470028302024776> **1 Boost Remains**`;
        } 
        else if (!hasClanFeature && !hasActiveAdopters) {
             tagStatusLine = `<:no_tag:1468470099026510001> **Not Enabled**`;
        } else {
             tagStatusLine = `<:greysword:1462853724824404069> **Tag Adopters:** ${currentTagCount}`;
             isEnabled = true;
        }
    } else {
        tagStatusLine = `<:no_tag:1468470099026510001> **Not Connected**`;
    }
    return { tagStatusLine, isEnabled };
}

// ==========================================
// 2. DASHBOARD UPDATER (Restored & Upgraded)
// ==========================================
async function updateAllPanels(client, force = false) {
    const networkConfigs = await NetworkConfig.find();
    const serverListData = await ServerList.find();
    
    // Process networks grouped by their Main Hub ID
    const hubs = networkConfigs.filter(c => c.isMainServer === true);

    for (const hubConfig of hubs) {
        if (!hubConfig.channelId) continue; 
        
        const mainGuild = client.guilds.cache.get(hubConfig.guildId);
        if (!mainGuild) continue;

        const channel = mainGuild.channels.cache.get(hubConfig.channelId) || await client.channels.fetch(hubConfig.channelId).catch(() => null);
        if (!channel) continue;

        // Fetch Main Guild UI data
        const mainData = serverListData.find(s => s.serverId === hubConfig.guildId) || {
            name: mainGuild.name, inviteLink: "https://discord.com", tagText: "None"
        };

        const satellites = networkConfigs.filter(c => !c.isMainServer && c.mainServerId === hubConfig.guildId);
        
        // Calculate Adopters for Main Hub
        let mainTagCount = 0;
        for (const [memberId, member] of mainGuild.members.cache) {
            if (member.user.bot) continue;
            if (member.user.primaryGuild && member.user.primaryGuild.identityEnabled && member.user.primaryGuild.identityGuildId === hubConfig.guildId) {
                mainTagCount++;
            }
        }

        let totalTagsAdopters = mainTagCount;
        let mainHumanCount = mainGuild.members.cache.filter(m => !m.user.bot).size;

        // Calculate for Satellites
        const satellitePayloadData = [];
        for (const satConfig of satellites) {
            const satGuild = client.guilds.cache.get(satConfig.guildId);
            const satData = serverListData.find(s => s.serverId === satConfig.guildId) || {
                name: satGuild ? satGuild.name : "Unknown Server", inviteLink: "https://discord.com", tagText: "None"
            };
            
            let satTagCount = 0;
            let satHumanCount = 0;

            if (satGuild) {
                satHumanCount = satGuild.members.cache.filter(m => !m.user.bot).size;
                for (const [memberId, member] of satGuild.members.cache) {
                    if (member.user.bot) continue;
                    if (member.user.primaryGuild && member.user.primaryGuild.identityEnabled && member.user.primaryGuild.identityGuildId === satConfig.guildId) {
                        satTagCount++;
                    }
                }
            }
            totalTagsAdopters += satTagCount;
            satellitePayloadData.push({ guild: satGuild, data: satData, tagCount: satTagCount, humanCount: satHumanCount });
        }

        // --- BUILD CONTAINER 1 (MAIN SERVER) ---
        const { tagStatusLine: mainStatus } = getServerStats(mainGuild, mainTagCount);
        const mainInviteLink = mainData.inviteLink && mainData.inviteLink.startsWith('http') ? mainData.inviteLink : 'https://discord.com';
        
        const container1 = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("# <:A2Q_1:1466981218758426634><:A2Q_2:1466981281060360232> » Tags Statistics")
            )
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('1474321044314783767')
                        .setLabel(`Total Tags Adopters: ${totalTagsAdopters}/${mainHumanCount}`)
                        .setDisabled(true)
                        .setCustomId("stats_adopt_btn")
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
            .addSectionComponents(
                new SectionBuilder()
                    .setButtonAccessory(createInviteButton(mainInviteLink))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## [${mainData.name}](${mainInviteLink})`),
                        new TextDisplayBuilder().setContent(
                            `<:badge:1468618581427097724> **Server Tag:** ${mainData.tagText || "None"}\n` +
                            `<:members:1468470163081924608> **Members:** ${mainHumanCount}\n` +
                            `${mainStatus}`
                        )
                    )
            );

        // --- BUILD CONTAINER 2 (SATELLITES LIST) ---
        const container2 = new ContainerBuilder();
        
        if (satellitePayloadData.length === 0) {
            container2.addTextDisplayComponents(new TextDisplayBuilder().setContent("No satellite servers connected yet."));
        } else {
            satellitePayloadData.forEach((sat, index) => {
                const { tagStatusLine } = getServerStats(sat.guild, sat.tagCount);
                const inviteUrl = sat.data.inviteLink && sat.data.inviteLink.startsWith('http') ? sat.data.inviteLink : 'https://discord.com';
                
                container2.addSectionComponents(
                    new SectionBuilder()
                        .setButtonAccessory(createInviteButton(inviteUrl))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`## [${sat.data.name || "Unknown Server"}](${inviteUrl})`),
                            new TextDisplayBuilder().setContent(
                                `<:badge:1468618581427097724> **Server Tag:** ${sat.data.tagText || "None"}\n` +
                                `<:members:1468470163081924608> **Members:** ${sat.humanCount}\n` +
                                `${tagStatusLine}`
                            )
                        )
                );
                
                if (index < satellitePayloadData.length - 1) {
                    container2.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false));
                }
            });
        }

        // --- FOOTER ---
        const nextUpdateUnix = Math.floor((Date.now() + 60 * 1000) / 1000);
        container2
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# <a:loading:1447184742934909032> Next Update: <t:${nextUpdateUnix}:R>`));

        // --- UPDATE MESSAGE ---
        try {
            let msg = null;
            if (hubConfig.messageId) msg = await channel.messages.fetch(hubConfig.messageId).catch(() => null);

            if (msg && msg.editable) {
                await msg.edit({ components: [container1, container2], flags: [MessageFlags.IsComponentsV2] });
            } else {
                const newMsg = await channel.send({ components: [container1, container2], flags: [MessageFlags.IsComponentsV2] });
                hubConfig.messageId = newMsg.id;
                await hubConfig.save();
            }
        } catch (err) {
            console.error(`[NetworkManager] Failed to update dashboard in ${mainGuild.name}`);
        }
    }
}

// ==========================================
// 3. GATEKEEPER & ROLE ENFORCEMENT
// ==========================================
async function enforceNetworkRules(client) {
    const configs = await NetworkConfig.find();
    const hubs = configs.filter(c => c.isMainServer === true);

    for (const hubConfig of hubs) {
        const mainGuild = client.guilds.cache.get(hubConfig.guildId);
        if (!mainGuild) continue;

        try { await mainGuild.members.fetch(); } catch (e) {}
        const mainMemberIds = new Set(mainGuild.members.cache.keys());

        const satellites = configs.filter(c => !c.isMainServer && c.mainServerId === hubConfig.guildId);

        for (const config of satellites) {
            const satelliteGuild = client.guilds.cache.get(config.guildId);
            if (!satelliteGuild) continue;

            try { await satelliteGuild.members.fetch(); } catch (e) {}

            for (const [memberId, member] of satelliteGuild.members.cache) {
                if (member.user.bot) continue;

                if (config.kickIfNoMain && !mainMemberIds.has(memberId)) {
                    await member.send({
                        content: `⚠️ You were removed from **${satelliteGuild.name}** because you are no longer in our Main Hub server.`
                    }).catch(() => {});
                    await member.kick('Network Grid Purge: Left Main Hub.').catch(() => {});
                    continue; 
                }

                if (config.globalTagRoleId) {
                    const mainMember = mainGuild.members.cache.get(memberId);
                    const mainTagRole = hubConfig.globalTagRoleId;

                    if (mainMember && mainTagRole) {
                        const hasTagInMain = mainMember.roles.cache.has(mainTagRole);
                        const hasTagInSatellite = member.roles.cache.has(config.globalTagRoleId);

                        if (hasTagInMain && !hasTagInSatellite) {
                            await member.roles.add(config.globalTagRoleId).catch(() => {});
                        } 
                        else if (!hasTagInMain && hasTagInSatellite) {
                            await member.roles.remove(config.globalTagRoleId).catch(() => {});
                        }
                    }
                }
            }
        }
    }
}

module.exports = { updateAllPanels, enforceNetworkRules };
