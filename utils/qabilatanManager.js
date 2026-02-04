const { 
    ContainerBuilder, TextDisplayBuilder, SectionBuilder, 
    ButtonBuilder, ButtonStyle, SeparatorBuilder, SeparatorSpacingSize,
    MessageFlags 
} = require('discord.js');
const { Panel, ServerList } = require('../src/models/Qabilatan'); 

// 🔒 CONFIGURATION
const MAIN_GUILD_ID = '1456197054782111756'; 
const GLOBAL_TAG_ROLE_ID = '1462217123433545812'; 

// 💾 MEMORY CACHE
let lastKnownCounts = new Map();

// 🕒 HELPER
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// 1. ROLE MANAGER (Main Server Only)
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

// =======================================================
// 2. DETAILED PAYLOAD (For Main Server)
// =======================================================
async function generateDetailedPayload(client, preCalcCounts) {
    const servers = await ServerList.find();
    const adoptersMap = preCalcCounts || lastKnownCounts || new Map();

    let totalNetworkMembers = 0;
    let totalTagUsers = 0; 
    const serverComponents = [];

    for (const data of servers) {
        const guild = client.guilds.cache.get(data.serverId);
        const memberCount = guild ? guild.memberCount : 0;
        totalNetworkMembers += memberCount;
        
        let displayTagText = data.tagText || "None";
        let tagStatusLine = ""; 

        const currentServerTagCount = adoptersMap.get(data.serverId) || 0;
        totalTagUsers += currentServerTagCount;

        if (guild) {
            const hasClanFeature = guild.features.includes('CLAN') || guild.features.includes('GUILD_TAGS') || guild.features.includes('MEMBER_VERIFICATION_GATE_ENABLED'); 
            const hasActiveAdopters = currentServerTagCount > 0; 

            const boostCount = guild.premiumSubscriptionCount || 0;
            const boostsNeeded = 3 - boostCount;

            if (boostsNeeded > 0) {
                 const s = boostsNeeded === 1 ? '' : 's';
                 tagStatusLine = `<:no_boost:1463272235056889917> **${boostsNeeded} Boost${s} Remain**`; 
                 if(boostsNeeded === 1) tagStatusLine = `<:no_boost:1463272235056889917> **1 Boost Remains**`;
            } 
            else if (!hasClanFeature && !hasActiveAdopters) {
                 tagStatusLine = `<:no_tag:1463272172201050336> **Not Enabled**`;
            } else {
                 tagStatusLine = `<:greysword:1462853724824404069> **Tag Adopters:** ${currentServerTagCount}`;
            }
        } else {
            tagStatusLine = `<:no_tag:1463272172201050336> **Not Connected**`;
        }

        const inviteButton = new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Server Link");
        inviteButton.setURL((data.inviteLink && data.inviteLink.startsWith('http')) ? data.inviteLink : 'https://discord.com');
        if (!data.inviteLink) inviteButton.setDisabled(true);

        serverComponents.push(
            new SectionBuilder()
                .setButtonAccessory(inviteButton)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## [${data.name || "Unknown"}](${data.inviteLink || "https://discord.com"})\n` +
                        `**<:sparkles:1462851309219872841> Server Tag:** ${displayTagText}\n` +
                        `**<:members:1462851249836654592> Members:** ${memberCount}\n` +
                        `${tagStatusLine}`
                    )
                )
        );
    }

    const nextUpdateUnix = Math.floor((Date.now() + 60 * 1000) / 1000);
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("# <:A2Q_1:1466981218758426634><:A2Q_2:1466981281060360232> » Servers"))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Total Members: ${totalNetworkMembers}\n-# Total Tags Adopters: ${totalTagUsers}`))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));

    serverComponents.forEach((section, i) => {
        container.addSectionComponents(section);
        if (i !== serverComponents.length - 1) container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false));
    });

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# <a:loading:1447184742934909032> Next Update: <t:${nextUpdateUnix}:R>`));

    return [container];
}

// =======================================================
// 3. STATIC DIRECTORY PAYLOAD (For Satellite Servers)
// =======================================================
async function generateDirectoryPayload(client) {
    const servers = await ServerList.find();
    
    // 1. Header
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# <:A2Q_1:1466981218758426634><:A2Q_2:1466981281060360232> » Servers"),
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true),
        );

    // 2. Loop through servers
    for (let i = 0; i < servers.length; i++) {
        const data = servers[i];
        const inviteUrl = (data.inviteLink && data.inviteLink.startsWith('http')) ? data.inviteLink : 'https://discord.com';
        const serverName = data.name || "Unknown Server";
        
        // -- Start Building Text Components --
        const textComponents = [
            new TextDisplayBuilder().setContent(`## [${serverName}](${inviteUrl})`)
        ];
        
        // -- Logic: Try to Fetch Owner & Add Tag Info --
        let detailsText = "";
        
        try {
            const guild = client.guilds.cache.get(data.serverId);
            if (guild) {
                // Fetch Owner (Cached or API)
                let owner = client.users.cache.get(guild.ownerId);
                if (!owner) owner = await client.users.fetch(guild.ownerId).catch(() => null);

                if (owner) {
                    const gName = owner.globalName || owner.username;
                    // Owner Line
                    detailsText += `<:owner:1468458871864426557> **Owner:** ${gName} \`(${owner.username})\``;
                }
            }
        } catch (e) { /* Ignore errors if bot not in server */ }

        // Tag Line
        if (data.tagText && data.tagText.length > 0) {
            if (detailsText.length > 0) detailsText += "\n"; // Add new line if owner exists
            detailsText += `<:sparkles:1462851309219872841> **Server Tag:** ${data.tagText}`;
        }

        // If we have details (Owner or Tag), add them as a second text component
        if (detailsText.length > 0) {
            textComponents.push(new TextDisplayBuilder().setContent(detailsText));
        }

        // -- Add Section --
        container.addSectionComponents(
            new SectionBuilder()
                .setButtonAccessory(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setLabel("Server Link")
                        .setURL(inviteUrl)
                )
                .addTextDisplayComponents(textComponents)
        );

        // -- Add Small Separator (Between items only) --
        if (i < servers.length - 1) {
            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
            );
        }
    }

    // 3. Footer
    const timestampUnix = Math.floor(Date.now() / 1000);
    container
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Last Update <t:${timestampUnix}:R>`),
        );

    return [container];
}

// ==========================================
// 4. MASTER UPDATE
// ==========================================
async function updateAllPanels(client, updateSatellites = false) {
    try {
        const counts = await runRoleUpdates(client);

        const detailedPayload = await generateDetailedPayload(client, counts);
        let directoryPayload = null; 

        if (updateSatellites) {
            directoryPayload = await generateDirectoryPayload(client); // ✅ Pass client to fetch owners
        }

        const locations = await Panel.find(); 
        
        for (const loc of locations) {
            const isMainServer = (loc.guildId === MAIN_GUILD_ID);

            if (!isMainServer && !updateSatellites) continue; 

            let channel;
            try { channel = await client.channels.fetch(loc.channelId); } 
            catch (e) { await Panel.deleteOne({ _id: loc._id }); continue; }

            if (!channel) { await Panel.deleteOne({ _id: loc._id }); continue; }

            await sleep(2500);

            const selectedPayload = isMainServer ? detailedPayload : directoryPayload;

            try {
                let msg = null;
                if (loc.messageId) {
                    try { msg = await channel.messages.fetch(loc.messageId); } 
                    catch (e) { msg = null; }
                }

                if (msg && msg.editable) {
                    await msg.edit({ components: selectedPayload, flags: [MessageFlags.IsComponentsV2] });
                } else {
                    const newMsg = await channel.send({ components: selectedPayload, flags: [MessageFlags.IsComponentsV2] });
                    loc.messageId = newMsg.id;
                    await loc.save();
                }
            } catch (err) {
                console.error(`🛑 Failed in ${channel.guild.name}. Removing location.`);
                await Panel.deleteOne({ _id: loc._id });
            }
        }
    } catch (error) {
        console.error('🛑 FATAL ERROR:', error);
    }
}

module.exports = { 
    updateAllPanels, 
    generateDetailedPayload, 
    generateDirectoryPayload,
    generateDashboardPayload: generateDetailedPayload 
};
