const { 
    ContainerBuilder, TextDisplayBuilder, SectionBuilder, 
    ButtonBuilder, ButtonStyle, SeparatorBuilder, SeparatorSpacingSize,
    ActionRowBuilder,
    MessageFlags 
} = require('discord.js');

const { Panel, ServerList } = require('../src/models/Qabilatan'); 

// 🔒 CONFIGURATION
const MAIN_GUILD_ID = '1456197054782111756'; 
const GLOBAL_TAG_ROLE_ID = '1462217123433545812'; 

// 💾 MEMORY CACHE
let lastKnownCounts = new Map();

function createInviteButton(link) {
    const isValid = link && link.startsWith('http');
    const btn = new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel("Server Link")
        .setURL(isValid ? link : 'https://discord.com');
    
    if (!isValid) btn.setDisabled(true);
    return btn;
}

// Helper to determine status line & whether a tag is "Enabled"
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
// 1. ROLE MANAGER (Main Server)
// ==========================================
async function runRoleUpdates(client) {
    const servers = await ServerList.find();
    const mainGuild = client.guilds.cache.get(MAIN_GUILD_ID);
    if (!mainGuild) return lastKnownCounts; 

    const serverConfig = new Map(); 
    const allManagedRoles = new Set();
    allManagedRoles.add(GLOBAL_TAG_ROLE_ID);

    servers.forEach(s => {
        serverConfig.set(s.serverId, { roleId: s.tagRoleID || null });
        if (s.tagRoleID) allManagedRoles.add(s.tagRoleID);
    });

    const currentCounts = new Map();

    try {
        await mainGuild.members.fetch(); 
        const members = mainGuild.members.cache; 

        for (const [memberId, member] of members) {
            if (member.user.bot) continue;
            const user = member.user;
            const rolesToKeep = new Set();
            
            if (user.primaryGuild && user.primaryGuild.identityEnabled && user.primaryGuild.identityGuildId) {
                const targetId = user.primaryGuild.identityGuildId;
                if (serverConfig.has(targetId)) {
                    const val = currentCounts.get(targetId) || 0;
                    currentCounts.set(targetId, val + 1);

                    rolesToKeep.add(GLOBAL_TAG_ROLE_ID);
                    const config = serverConfig.get(targetId);
                    if (config.roleId) rolesToKeep.add(config.roleId);
                }
            }

            for (const roleId of rolesToKeep) {
                if (!member.roles.cache.has(roleId)) await member.roles.add(roleId).catch(() => {});
            }

            for (const managedRoleId of allManagedRoles) {
                if (member.roles.cache.has(managedRoleId) && !rolesToKeep.has(managedRoleId)) {
                    await member.roles.remove(managedRoleId).catch(() => {});
                }
            }
        }

        if (currentCounts.size > 0) lastKnownCounts = currentCounts;

    } catch (e) { 
        console.error(`[Role Manager] Update failed (Using Cache): ${e.message}`); 
    }

    return currentCounts.size > 0 ? currentCounts : lastKnownCounts; 
}

// ==========================================
// 2. SATELLITE SERVER ROLE MANAGER
// ==========================================
async function runSatelliteRoleUpdates(client) {
    const servers = await ServerList.find();
    
    for (const data of servers) {
        // Skip if feature is disabled or role isn't set
        if (!data.satelliteRoleEnabled || !data.satelliteRoleId) continue;

        const guild = client.guilds.cache.get(data.serverId);
        if (!guild) continue;

        try {
            // Loop through cached members of the satellite server
            for (const [memberId, member] of guild.members.cache) {
                if (member.user.bot) continue;
                
                const user = member.user;
                // Check if they are adopting this specific server's tag
                const hasTag = user.primaryGuild && user.primaryGuild.identityEnabled && user.primaryGuild.identityGuildId === data.serverId;
                
                if (hasTag) {
                    if (!member.roles.cache.has(data.satelliteRoleId)) {
                        await member.roles.add(data.satelliteRoleId).catch(() => {});
                    }
                } else {
                    if (member.roles.cache.has(data.satelliteRoleId)) {
                        await member.roles.remove(data.satelliteRoleId).catch(() => {});
                    }
                }
            }
        } catch (e) {
            console.error(`[Satellite Role Manager] Error in ${guild.name}: ${e.message}`);
        }
    }
}

// =======================================================
// 3. DETAILED PAYLOAD (For Main Server)
// =======================================================
async function generateDetailedPayload(client, preCalcCounts) {
    const servers = await ServerList.find();
    const adoptersMap = preCalcCounts || lastKnownCounts || new Map();

    // --- 1. PREPARE MAIN SERVER DATA ---
    const mainGuild = client.guilds.cache.get(MAIN_GUILD_ID);
    const mainData = servers.find(s => s.serverId === MAIN_GUILD_ID) || {
        name: mainGuild ? mainGuild.name : "Unknown Server",
        inviteLink: "https://discord.com",
        tagText: "None"
    };

    let mainHumanCount = 0;
    if (mainGuild) {
        mainHumanCount = mainGuild.members.cache.filter(m => !m.user.bot).size;
    }

    // --- 2. CALCULATE AGGREGATES ---
    let totalTagsAdopters = 0;

    for (const data of servers) {
        const count = adoptersMap.get(data.serverId) || 0;
        totalTagsAdopters += count;
    }

    // --- 3. BUILD CONTAINER 1 (MAIN SERVER INFO & AGGREGATES IN BUTTONS) ---
    const mainTagCount = adoptersMap.get(MAIN_GUILD_ID) || 0;
    const { tagStatusLine: mainStatus } = getServerStats(mainGuild, mainTagCount);
    const mainInviteLink = mainData.inviteLink && mainData.inviteLink.startsWith('http') ? mainData.inviteLink : 'https://discord.com';

    const container1 = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# <:A2Q_1:1466981218758426634><:A2Q_2:1466981281060360232> » Tags Statistics")
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
        )
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
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
        )
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

    // --- 4. BUILD CONTAINER 2 (SATELLITES LIST) ---
    const container2 = new ContainerBuilder();

    const satelliteServers = servers.filter(s => s.serverId !== MAIN_GUILD_ID);

    satelliteServers.forEach((data, index) => {
        const guild = client.guilds.cache.get(data.serverId);
        const tagCount = adoptersMap.get(data.serverId) || 0;
        const { tagStatusLine } = getServerStats(guild, tagCount);
        
        const humanCount = guild ? guild.members.cache.filter(m => !m.user.bot).size : 0;
        const inviteUrl = data.inviteLink && data.inviteLink.startsWith('http') ? data.inviteLink : 'https://discord.com';

        container2.addSectionComponents(
            new SectionBuilder()
                .setButtonAccessory(createInviteButton(inviteUrl))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## [${data.name || "Unknown"}](${inviteUrl})`),
                    new TextDisplayBuilder().setContent(
                        `<:badge:1468618581427097724> **Server Tag:** ${data.tagText || "None"}\n` +
                        `<:members:1468470163081924608> **Members:** ${humanCount}\n` +
                        `${tagStatusLine}`
                    )
                )
        );

        if (index < satelliteServers.length - 1) {
            container2.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
            );
        }
    });

    // 5. FOOTER
    const nextUpdateUnix = Math.floor((Date.now() + 60 * 1000) / 1000);
    container2
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# <a:loading:1447184742934909032> Next Update: <t:${nextUpdateUnix}:R>`)
        );

    return [container1, container2];
}

// ==========================================
// 4. MASTER UPDATE (MAIN SERVER ONLY)
// ==========================================
async function updateAllPanels(client) {
    try {
        const counts = await runRoleUpdates(client);
        
        // ✅ CALL NEW SATELLITE ROLE SYNC LOGIC HERE
        await runSatelliteRoleUpdates(client); 
        
        const detailedPayload = await generateDetailedPayload(client, counts);

        // Fetch ONLY the main server panel
        const mainPanel = await Panel.findOne({ guildId: MAIN_GUILD_ID });
        if (!mainPanel) return;

        let channel;
        try { channel = await client.channels.fetch(mainPanel.channelId); } 
        catch (e) { return; }

        if (!channel) return;

        try {
            let msg = null;
            if (mainPanel.messageId) {
                try { msg = await channel.messages.fetch(mainPanel.messageId); } 
                catch (e) { msg = null; }
            }

            if (msg && msg.editable) {
                await msg.edit({ components: detailedPayload, flags: [MessageFlags.IsComponentsV2] });
            } else {
                const newMsg = await channel.send({ components: detailedPayload, flags: [MessageFlags.IsComponentsV2] });
                mainPanel.messageId = newMsg.id;
                await mainPanel.save();
            }
        } catch (err) {
            console.error(`🛑 Failed to update main panel.`);
        }
        
    } catch (error) {
        console.error('🛑 FATAL ERROR:', error);
    }
}

module.exports = { 
    updateAllPanels, 
    generateDetailedPayload, 
    generateDashboardPayload: generateDetailedPayload 
};
