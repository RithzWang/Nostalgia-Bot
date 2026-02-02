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

// 🕒 HELPER: Prevents API spam by pausing execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// 1. ROLE MANAGER (Rate-Limit Safe)
// ==========================================
async function runRoleUpdates(client) {
    const trackedServers = await TrackedServer.find();
    const mainGuild = client.guilds.cache.get(MAIN_GUILD_ID);

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
            // Use cache only to avoid Opcode 8 Rate Limits
            const globalRole = mainGuild.roles.cache.get(GLOBAL_TAG_ROLE_ID);

            for (const [memberId, member] of mainGuild.members.cache) {
                if (member.user.bot) continue;

                const identity = member.user?.primaryGuild || null; 
                const isTagEnabled = identity && identity.identityEnabled === true;
                const currentTagGuildId = isTagEnabled ? identity.identityGuildId : null;
                const isWearingAnyValidTag = currentTagGuildId && validTagServerIds.has(currentTagGuildId);

                // Specific Main Roles
                if (currentTagGuildId && tagToRoleMap.has(currentTagGuildId)) {
                    const targetRoleId = tagToRoleMap.get(currentTagGuildId);
                    if (!member.roles.cache.has(targetRoleId)) await member.roles.add(targetRoleId).catch(() => {});
                }

                // Remove Mismatched Main Roles
                for (const [rId, sourceGuildId] of roleToGuildMap.entries()) {
                    if (member.roles.cache.has(rId) && currentTagGuildId !== sourceGuildId) {
                        await member.roles.remove(rId).catch(() => {});
                    }
                }

                // Global Hub Role
                if (globalRole) {
                    if (isWearingAnyValidTag && !member.roles.cache.has(GLOBAL_TAG_ROLE_ID)) {
                        await member.roles.add(GLOBAL_TAG_ROLE_ID).catch(() => {});
                    } else if (!isWearingAnyValidTag && member.roles.cache.has(GLOBAL_TAG_ROLE_ID)) {
                        await member.roles.remove(GLOBAL_TAG_ROLE_ID).catch(() => {});
                    }
                }
            }
        } catch (e) { console.error(`[Role Manager] Hub Error:`, e.message); }
    }

    // Local Satellite Logic
    for (const server of trackedServers) {
        if (!server.localRoleId) continue;
        const guild = client.guilds.cache.get(server.guildId);
        if (!guild || server.guildId === MAIN_GUILD_ID) continue;

        try {
            for (const [mId, member] of guild.members.cache) {
                if (member.user.bot) continue;
                const identity = member.user?.primaryGuild || null;
                const wearsCorrectTag = identity && identity.identityGuildId === server.guildId && identity.identityEnabled === true;

                if (wearsCorrectTag && !member.roles.cache.has(server.localRoleId)) {
                    await member.roles.add(server.localRoleId).catch(() => {});
                } else if (!wearsCorrectTag && member.roles.cache.has(server.localRoleId)) {
                    await member.roles.remove(server.localRoleId).catch(() => {});
                }
            }
        } catch (e) { console.error(`[Role Manager] Local Error in ${server.displayName}:`, e.message); }
    }
}

// ==========================================
// 2. DASHBOARD UI GENERATOR
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

            if (boostsNeeded > 0) {
                tagStatusLine = `<:no_boost:1463272235056889917> **${boostsNeeded} Boosts Remain**`;
            } else {
                tagStatusLine = !hasClanFeature 
                    ? `<:no_tag:1463272172201050336> **Not Enabled**` 
                    : `<:greysword:1462853724824404069> **Tag Adopters:** ${currentServerTagCount}`;
            }
        } else {
            tagStatusLine = `<:no_tag:1463272172201050336> **Not Connected**`;
        }

        const inviteButton = new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Server Link");
        if (data.inviteLink && data.inviteLink.startsWith('http')) {
            inviteButton.setURL(data.inviteLink);
        } else {
            inviteButton.setURL('https://discord.com').setDisabled(true);
        }

        const section = new SectionBuilder()
            .setButtonAccessory(inviteButton)
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `## [${data.displayName}](${data.inviteLink || "https://discord.com"})\n` +
                        `**<:sparkles:1462851309219872841> Server Tag:** ${displayTagText}\n` +
                        `**<:members:1462851249836654592> Members:** ${memberCount}\n` +
                        `${tagStatusLine}`
                    )
            );
        serverComponents.push(section);
    }

    const nextUpdateUnix = Math.floor((Date.now() + 60 * 1000) / 1000);
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("# <:A2Q_1:1466981218758426634><:A2Q_2:1466981281060360232> » Servers"))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Total Members: ${totalNetworkMembers}\n-# Total Tags Adopters: ${totalTagUsers}`))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));

    for (let i = 0; i < serverComponents.length; i++) {
        container.addSectionComponents(serverComponents[i]);
        if (i !== serverComponents.length - 1) {
            container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false));
        }
    }

    container
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# <a:loading:1447184742934909032> Next Update: <t:${nextUpdateUnix}:R>`));

    return [container];
}

// ==========================================
// 3. MASTER UPDATE FUNCTION (Clean-Sync)
// ==========================================
async function updateAllDashboards(client) {
    console.log('--- 🚀 STARTING CLEAN-SYNC UPDATE ---');

    try {
        await runRoleUpdates(client).catch(e => console.error("[Role Update Error]:", e.message));
        await runGatekeeper(client).catch(e => console.error("[Gatekeeper Error]:", e.message)); 

        const payload = await generateDashboardPayload(client);
        const locations = await DashboardLocation.find();
        
        console.log(`📍 DB contains ${locations.length} dashboard locations. Syncing...`);

        for (const loc of locations) {
            const channel = client.channels.cache.get(loc.channelId) || await client.channels.fetch(loc.channelId).catch(() => null);
            
            if (!channel) {
                console.log(`🗑️ Channel ${loc.channelId} missing. Deleting from DB.`);
                await DashboardLocation.deleteOne({ _id: loc._id });
                continue;
            }

            try {
                // 🕒 Staggered Update to avoid rate limits
                await sleep(2000);

                if (!loc.messageId) {
                    const newMsg = await channel.send({ components: payload, flags: [MessageFlags.IsComponentsV2] });
                    loc.messageId = newMsg.id;
                    await loc.save();
                } else {
                    const msg = await channel.messages.fetch(loc.messageId).catch(() => null);
                    
                    // FIXED: Safer check to avoid "edit is not a function"
                    if (msg && typeof msg.edit === 'function') {
                        await msg.edit({ components: payload, flags: [MessageFlags.IsComponentsV2] });
                        console.log(`📝 Edited dashboard in #${channel.name}`);
                    } else {
                        console.log(`🔄 Message lost or invalid in #${channel.name}. Re-spawning...`);
                        const freshMsg = await channel.send({ components: payload, flags: [MessageFlags.IsComponentsV2] });
                        loc.messageId = freshMsg.id;
                        await loc.save();
                    }
                }
            } catch (err) {
                console.error(`🛑 API Error in #${channel.name}:`, err.message);
            }
        }
    } catch (error) {
        console.error('🛑 MASTER CYCLE CRASHED:', error);
    }
    
    const finalCount = await DashboardLocation.countDocuments();
    console.log(`--- 🏁 FINISHED. Active Dashboards: ${finalCount} ---`);
}

module.exports = { runRoleUpdates, generateDashboardPayload, updateAllDashboards, runGatekeeper };
