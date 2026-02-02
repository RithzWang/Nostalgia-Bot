const { 
    ContainerBuilder, TextDisplayBuilder, SectionBuilder, 
    ButtonBuilder, ButtonStyle, SeparatorBuilder, SeparatorSpacingSize,
    MessageFlags 
} = require('discord.js');
const TrackedServer = require('../models/TrackedServerSchema');
const DashboardLocation = require('../models/DashboardLocationSchema');
const { runGatekeeper } = require('./gatekeeperUtils');

// 🔒 CONFIGURATION
const MAIN_GUILD_ID = '1456197054782111756'; 
const GLOBAL_TAG_ROLE_ID = '1462217123433545812'; 

// 🕒 HELPER: Pause execution to prevent Rate Limits
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// 1. ROLE MANAGER (CACHE ONLY - NO FETCHING)
// ==========================================
async function runRoleUpdates(client) {
    const trackedServers = await TrackedServer.find();
    const mainGuild = client.guilds.cache.get(MAIN_GUILD_ID);

    // A. Main Hub Logic
    if (mainGuild) {
        const tagToRoleMap = new Map();
        const roleToGuildMap = new Map();
        const validTagServerIds = new Set(); 

        for (const server of trackedServers) {
            validTagServerIds.add(server.guildId); 
            if (server.roleId) {
                tagToRoleMap.set(server.guildId, server.roleId);
                roleToGuildMap.set(server.roleId, server.guildId);
            }
        }

        try {
            // 🛑 CRITICAL FIX: Removed await mainGuild.members.fetch(); 
            // We now ONLY iterate the cache to stop Opcode 8 errors.
            const globalRole = mainGuild.roles.cache.get(GLOBAL_TAG_ROLE_ID);

            for (const [memberId, member] of mainGuild.members.cache) {
                if (member.user.bot) continue;

                const identity = member.user?.primaryGuild || null; 
                const isTagEnabled = identity?.identityEnabled === true;
                const currentTagGuildId = isTagEnabled ? identity.identityGuildId : null;
                const isWearingAnyValidTag = currentTagGuildId && validTagServerIds.has(currentTagGuildId);

                // 1. Specific Server Role
                if (currentTagGuildId && tagToRoleMap.has(currentTagGuildId)) {
                    const targetRoleId = tagToRoleMap.get(currentTagGuildId);
                    if (!member.roles.cache.has(targetRoleId)) await member.roles.add(targetRoleId).catch(() => {});
                }

                // 2. Remove Wrong Server Roles
                for (const [rId, sourceGuildId] of roleToGuildMap.entries()) {
                    if (member.roles.cache.has(rId) && currentTagGuildId !== sourceGuildId) {
                        await member.roles.remove(rId).catch(() => {});
                    }
                }

                // 3. Global Tag Role
                if (globalRole) {
                    if (isWearingAnyValidTag && !member.roles.cache.has(GLOBAL_TAG_ROLE_ID)) {
                        await member.roles.add(GLOBAL_TAG_ROLE_ID).catch(() => {});
                    } else if (!isWearingAnyValidTag && member.roles.cache.has(GLOBAL_TAG_ROLE_ID)) {
                        await member.roles.remove(GLOBAL_TAG_ROLE_ID).catch(() => {});
                    }
                }
            }
        } catch (e) { console.error(`[Role Manager] Hub Error: ${e.message}`); }
    }

    // B. Local Satellite Logic
    for (const server of trackedServers) {
        if (!server.localRoleId) continue;
        const guild = client.guilds.cache.get(server.guildId);
        if (!guild || server.guildId === MAIN_GUILD_ID) continue;

        try {
            // 🛑 CRITICAL FIX: Removed guild.members.fetch();
            for (const [mId, member] of guild.members.cache) {
                if (member.user.bot) continue;
                const identity = member.user?.primaryGuild;
                const wearsCorrectTag = identity && identity.identityGuildId === server.guildId && identity.identityEnabled === true;

                if (wearsCorrectTag && !member.roles.cache.has(server.localRoleId)) {
                    await member.roles.add(server.localRoleId).catch(() => {});
                } else if (!wearsCorrectTag && member.roles.cache.has(server.localRoleId)) {
                    await member.roles.remove(server.localRoleId).catch(() => {});
                }
            }
        } catch (e) { console.error(`[Role Manager] Local Error: ${e.message}`); }
    }
}

// ==========================================
// 2. DASHBOARD UI GENERATOR (Standard V2)
// ==========================================
async function generateDashboardPayload(client) {
    const servers = await TrackedServer.find();
    let totalNetworkMembers = 0;
    let totalTagUsers = 0; 
    const serverComponents = [];

    for (const data of servers) {
        const guild = client.guilds.cache.get(data.guildId);
        const memberCount = guild ? guild.memberCount : 0;
        totalNetworkMembers += memberCount;
        
        let displayTagText = data.tagText || "None";
        let tagStatusLine = ""; 

        if (guild) {
            const hasClanFeature = guild.features.includes('CLAN') || guild.features.includes('GUILD_TAGS');
            let currentServerTagCount = 0;

            if (hasClanFeature) {
                const tagWearers = guild.members.cache.filter(member => {
                    const identity = member.user?.primaryGuild;
                    return identity && identity.identityGuildId === data.guildId && identity.identityEnabled === true;
                });
                currentServerTagCount = tagWearers.size;
                totalTagUsers += currentServerTagCount; 
            }

            const boostCount = guild.premiumSubscriptionCount || 0;
            const boostsNeeded = 3 - boostCount;

            tagStatusLine = (boostsNeeded > 0)
                ? `<:no_boost:1463272235056889917> **${boostsNeeded} Boosts Remain**`
                : (!hasClanFeature 
                    ? `<:no_tag:1463272172201050336> **Not Enabled**` 
                    : `<:greysword:1462853724824404069> **Tag Adopters:** ${currentServerTagCount}`);
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
                        `## [${data.displayName}](${data.inviteLink || "https://discord.com"})\n` +
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

    container
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# <a:loading:1447184742934909032> Next Update: <t:${nextUpdateUnix}:R>`));

    return [container];
}

// ==========================================
// 3. MASTER UPDATE (NUCLEAR FIX)
// ==========================================
async function updateAllDashboards(client) {
    console.log('--- 🚀 STARTING ROBUST UPDATE ---');

    try {
        await runRoleUpdates(client).catch(e => console.error("[Role Error]", e.message));
        await runGatekeeper(client).catch(e => console.error("[Gatekeeper Error]", e.message)); 

        const payload = await generateDashboardPayload(client);
        const locations = await DashboardLocation.find();
        
        console.log(`📍 Processing ${locations.length} dashboard locations...`);

        for (const loc of locations) {
            // STEP 1: Stagger Updates (Slow down to prevent crashes)
            await sleep(2000);

            // STEP 2: Find Channel. If gone, DESTROY DB ENTRY.
            let channel;
            try {
                channel = await client.channels.fetch(loc.channelId);
            } catch (e) {
                console.log(`🗑️ Channel ${loc.channelId} invalid. DELETING from DB.`);
                await DashboardLocation.deleteOne({ _id: loc._id });
                continue;
            }

            if (!channel) {
                console.log(`🗑️ Channel ${loc.channelId} not found. DELETING from DB.`);
                await DashboardLocation.deleteOne({ _id: loc._id });
                continue;
            }

            // STEP 3: Handle Message (Fail-Forward Strategy)
            try {
                let msg = null;
                
                // If we have an ID, try to fetch the specific message
                if (loc.messageId) {
                    try {
                        msg = await channel.messages.fetch(loc.messageId);
                    } catch (e) {
                        msg = null; // Message deleted or ID invalid
                    }
                }

                // If msg is valid AND matches the Discord Message class, edit it.
                // Otherwise, treat it as dead and spawn a new one.
                if (msg && typeof msg.edit === 'function') {
                    await msg.edit({ components: payload, flags: [MessageFlags.IsComponentsV2] });
                    console.log(`✅ Updated: ${channel.guild.name}`);
                } else {
                    console.log(`⚠️ Invalid Message in ${channel.guild.name}. Spawning FRESH one.`);
                    const newMsg = await channel.send({ components: payload, flags: [MessageFlags.IsComponentsV2] });
                    
                    // Save new ID to DB immediately
                    loc.messageId = newMsg.id;
                    await loc.save();
                }

            } catch (err) {
                console.error(`🛑 Failed update in ${channel.guild.name}: ${err.message}`);
                // If we encounter a hard error (like "Missing Access"), delete the dashboard
                if (err.message.includes("Missing Access") || err.message.includes("Unknown Channel")) {
                    console.log(`🗑️ Permissions lost in ${channel.guild.name}. Removing dashboard.`);
                    await DashboardLocation.deleteOne({ _id: loc._id });
                }
            }
        }
    } catch (error) {
        console.error('🛑 MASTER LOOP CRASHED:', error);
    }
    
    // Final check
    const count = await DashboardLocation.countDocuments();
    console.log(`--- 🏁 FINISHED. Active Dashboards in DB: ${count} ---`);
}

module.exports = { runRoleUpdates, generateDashboardPayload, updateAllDashboards, runGatekeeper };
