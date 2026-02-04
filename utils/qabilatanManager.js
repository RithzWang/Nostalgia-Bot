const { 
    ContainerBuilder, TextDisplayBuilder, SectionBuilder, 
    ButtonBuilder, ButtonStyle, SeparatorBuilder, SeparatorSpacingSize,
    MessageFlags 
} = require('discord.js');
const { Panel, ServerList } = require('../models/Qabilatan'); 

// 🔒 CONFIGURATION
const MAIN_GUILD_ID = '1456197054782111756'; 
const GLOBAL_TAG_ROLE_ID = '1462217123433545812'; 

// 💾 MEMORY CACHE (Prevents "0" glitch on errors/restarts)
let lastKnownCounts = new Map();

// 🕒 HELPER
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// 1. ROLE MANAGER (Only needed for Main Server)
// ==========================================
async function runRoleUpdates(client) {
    const servers = await ServerList.find();
    const mainGuild = client.guilds.cache.get(MAIN_GUILD_ID);

    // If main guild is unreachable, return the cached data
    if (!mainGuild) return lastKnownCounts; 

    // Prepare Config for fast lookup
    const serverConfig = new Map(); 
    const allManagedRoles = new Set();
    allManagedRoles.add(GLOBAL_TAG_ROLE_ID);

    servers.forEach(s => {
        serverConfig.set(s.serverId, { roleId: s.tagRoleID || null });
        if (s.tagRoleID) allManagedRoles.add(s.tagRoleID);
    });

    const currentCounts = new Map(); // Temp map for this run

    try {
        // ✅ STANDARD FETCH: No { force: true } to keep Tag Data intact
        await mainGuild.members.fetch(); 
        const members = mainGuild.members.cache; 

        for (const [memberId, member] of members) {
            if (member.user.bot) continue;

            const user = member.user;
            const rolesToKeep = new Set();
            
            // --- CORE LOGIC: Check Primary Guild ---
            if (user.primaryGuild && user.primaryGuild.identityEnabled && user.primaryGuild.identityGuildId) {
                const targetId = user.primaryGuild.identityGuildId;
                
                // If the user's tag points to a server we are tracking
                if (serverConfig.has(targetId)) {
                    
                    // 1. Increment Count
                    const val = currentCounts.get(targetId) || 0;
                    currentCounts.set(targetId, val + 1);

                    // 2. Queue Roles
                    rolesToKeep.add(GLOBAL_TAG_ROLE_ID);
                    const config = serverConfig.get(targetId);
                    if (config.roleId) rolesToKeep.add(config.roleId);
                }
            }

            // --- SYNC ROLES ---
            for (const roleId of rolesToKeep) {
                if (!member.roles.cache.has(roleId)) await member.roles.add(roleId).catch(() => {});
            }

            for (const managedRoleId of allManagedRoles) {
                if (member.roles.cache.has(managedRoleId) && !rolesToKeep.has(managedRoleId)) {
                    await member.roles.remove(managedRoleId).catch(() => {});
                }
            }
        }

        // ✅ Success! Update the global cache
        if (currentCounts.size > 0) {
            lastKnownCounts = currentCounts;
        }

    } catch (e) { 
        console.error(`[Role Manager] Update failed (Using Cache): ${e.message}`); 
    }

    // Return current counts if successful, otherwise fallback to cache
    return currentCounts.size > 0 ? currentCounts : lastKnownCounts; 
}

// =======================================================
// 2. DETAILED PAYLOAD (For Main Server - With Stats)
// =======================================================
async function generateDetailedPayload(client, preCalcCounts) {
    const servers = await ServerList.find();
    
    // Logic: Use passed counts -> If missing, use Cache -> If missing, Empty Map
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

        // USE THE COUNT
        const currentServerTagCount = adoptersMap.get(data.serverId) || 0;
        totalTagUsers += currentServerTagCount;

        if (guild) {
            const hasClanFeature = guild.features.includes('CLAN') || guild.features.includes('GUILD_TAGS') || guild.features.includes('MEMBER_VERIFICATION_GATE_ENABLED'); 
            const hasActiveAdopters = currentServerTagCount > 0; 

            const boostCount = guild.premiumSubscriptionCount || 0;
            const boostsNeeded = 3 - boostCount;

            if (boostsNeeded > 0) {
                 const s = boostsNeeded === 1 ? '' : 's';
                 // ✅ FIXED BOLDING
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
                        `### [${data.name || "Unknown"}](${data.inviteLink || "https://discord.com"})\n` +
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
async function generateDirectoryPayload() {
    const servers = await ServerList.find();
    
    // Create the Main Container
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# <:A2Q_1:1466981218758426634><:A2Q_2:1466981281060360232> » Servers"),
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true),
        );

    // Loop through servers and add Sections
    servers.forEach((data, index) => {
        const inviteUrl = (data.inviteLink && data.inviteLink.startsWith('http')) ? data.inviteLink : 'https://discord.com';
        const serverName = data.name || "Unknown Server";
        
        // Build Texts: Always Name, optionally Tag if it exists
        const texts = [new TextDisplayBuilder().setContent(`## [${serverName}](${inviteUrl})`)];
        
        if (data.tagText && data.tagText.length > 0) {
            texts.push(new TextDisplayBuilder().setContent(`<:sparkles:1462851309219872841> **Server Tag:** ${data.tagText}`));
        }

        container.addSectionComponents(
            new SectionBuilder()
                .setButtonAccessory(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setLabel("Server Link")
                        .setURL(inviteUrl)
                )
                .addTextDisplayComponents(texts)
        );

        // Add separator between items (except after the last one)
        if (index < servers.length - 1) {
            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
            );
        }
    });

    return [container];
}

// ==========================================
// 4. MASTER UPDATE
// ==========================================
async function updateAllPanels(client) {
    try {
        // 1. Get stats (needed for Main Server)
        const counts = await runRoleUpdates(client);

        // 2. Pre-generate BOTH types of payloads
        const detailedPayload = await generateDetailedPayload(client, counts);
        const directoryPayload = await generateDirectoryPayload(); // Static

        const locations = await Panel.find(); 
        
        for (const loc of locations) {
            let channel;
            try { channel = await client.channels.fetch(loc.channelId); } 
            catch (e) { await Panel.deleteOne({ _id: loc._id }); continue; }

            if (!channel) { await Panel.deleteOne({ _id: loc._id }); continue; }

            await sleep(2500);

            // 3. DECIDE WHICH PAYLOAD TO SEND
            const isMainServer = (loc.guildId === MAIN_GUILD_ID);
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

// EXPORT EVERYTHING SO THE COMMAND FILE CAN USE THEM
module.exports = { 
    updateAllPanels, 
    generateDetailedPayload, // Use this for Main Server
    generateDirectoryPayload, // Use this for Satellite Servers
    generateDashboardPayload: generateDetailedPayload // Alias for backward compatibility if needed
};
