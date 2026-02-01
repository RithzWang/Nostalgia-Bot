const { 
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
    SectionBuilder, ButtonBuilder, ButtonStyle, MessageFlags 
} = require('discord.js');
const TrackedServer = require('../src/models/TrackedServerSchema');
const DashboardLocation = require('../src/models/DashboardLocationSchema');
const { runGatekeeper } = require('./gatekeeperUtils');

// 🔒 CONFIGURATION
const MAIN_GUILD_ID = '1456197054782111756'; 
const GLOBAL_TAG_ROLE_ID = '1462217123433545812'; 

// ==========================================
// 1. ROLE MANAGER (Main & Satellite)
// ==========================================
async function runRoleUpdates(client) {
    const trackedServers = await TrackedServer.find();
    
    // -------------------------------------------------------
    // PART A: MAIN SERVER HUB UPDATES (Existing Logic)
    // -------------------------------------------------------
    const mainGuild = client.guilds.cache.get(MAIN_GUILD_ID);
    if (mainGuild) {
        // Prepare Maps
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
            await mainGuild.members.fetch();
            const globalRole = mainGuild.roles.cache.get(GLOBAL_TAG_ROLE_ID);

            for (const [memberId, member] of mainGuild.members.cache) {
                if (member.user.bot) continue;

                const identity = member.user.primaryGuild; 
                const isTagEnabled = identity && identity.identityEnabled === true;
                const currentTagGuildId = isTagEnabled ? identity.identityGuildId : null;
                const isWearingAnyValidTag = currentTagGuildId && validTagServerIds.has(currentTagGuildId);

                // 1. Specific Server Roles (in Hub)
                if (currentTagGuildId && tagToRoleMap.has(currentTagGuildId)) {
                    const targetRoleId = tagToRoleMap.get(currentTagGuildId);
                    const role = mainGuild.roles.cache.get(targetRoleId);
                    if (role && !member.roles.cache.has(targetRoleId)) {
                        await member.roles.add(role).catch(() => {});
                    }
                }

                // 2. Remove Mismatched Roles (in Hub)
                for (const [rId, sourceGuildId] of roleToGuildMap.entries()) {
                    if (member.roles.cache.has(rId)) {
                        if (currentTagGuildId !== sourceGuildId) {
                            const roleToRemove = mainGuild.roles.cache.get(rId);
                            if (roleToRemove) await member.roles.remove(roleToRemove).catch(() => {});
                        }
                    }
                }

                // 3. Global Tag Role (in Hub)
                if (globalRole) {
                    if (isWearingAnyValidTag && !member.roles.cache.has(GLOBAL_TAG_ROLE_ID)) {
                        await member.roles.add(globalRole).catch(() => {});
                    } else if (!isWearingAnyValidTag && member.roles.cache.has(GLOBAL_TAG_ROLE_ID)) {
                        await member.roles.remove(globalRole).catch(() => {});
                    }
                }
            }
        } catch (e) {
            console.error(`[Role Manager] Main Hub Error:`, e.message);
        }
    }

    // -------------------------------------------------------
    // PART B: SATELLITE SERVER UPDATES (New Logic!)
    // -------------------------------------------------------
    for (const data of trackedServers) {
        // Skip Main Server (handled above) or servers without a local role configured
        if (data.guildId === MAIN_GUILD_ID || !data.localRoleId) continue;

        const satelliteGuild = client.guilds.cache.get(data.guildId);
        if (!satelliteGuild) continue;

        try {
            const localRole = satelliteGuild.roles.cache.get(data.localRoleId);
            if (!localRole) continue; // Role might be deleted

            // Ensure cache is full
            if (satelliteGuild.members.cache.size < satelliteGuild.memberCount) {
                try { await satelliteGuild.members.fetch(); } catch (e) {}
            }

            for (const [memberId, member] of satelliteGuild.members.cache) {
                if (member.user.bot) continue;

                const identity = member.user.primaryGuild;
                const isTagEnabled = identity && identity.identityEnabled === true;
                
                // Does the user have THIS server's tag equipped?
                const isWearingThisServerTag = isTagEnabled && identity.identityGuildId === data.guildId;

                if (isWearingThisServerTag) {
                    // GIVE Role
                    if (!member.roles.cache.has(localRole.id)) {
                        await member.roles.add(localRole).catch(() => {});
                    }
                } else {
                    // REMOVE Role (Optional: remove if they stop wearing it)
                    if (member.roles.cache.has(localRole.id)) {
                        await member.roles.remove(localRole).catch(() => {});
                    }
                }
            }
        } catch (e) {
            console.error(`[Role Manager] Satellite Error (${data.displayName}):`, e.message);
        }
    }
}

// ==========================================
// 2. DASHBOARD UI GENERATOR (EXACT REQUESTED LAYOUT)
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
                    const identity = member.user.primaryGuild;
                    return identity && 
                           identity.identityGuildId === data.guildId &&
                           identity.identityEnabled === true;
                });
                currentServerTagCount = tagWearers.size;
                totalTagUsers += currentServerTagCount; 
            }

            const boostCount = guild.premiumSubscriptionCount || 0;
            const boostsNeeded = 3 - boostCount;

            if (boostsNeeded > 0) {
                const plural = boostsNeeded === 1 ? "Boost" : "Boosts";
                const remainPlural = boostsNeeded === 1 ? "Remains" : "Remain";
                tagStatusLine = `<:no_boost:1463272235056889917> **${boostsNeeded} ${plural} ${remainPlural}**`;
            } else {
                if (!hasClanFeature) {
                    tagStatusLine = `<:no_tag:1463272172201050336> **Not Enabled**`;
                } else {
                    tagStatusLine = `<:greysword:1462853724824404069> **Tag Users:** ${currentServerTagCount}`;
                }
            }
        } else {
            tagStatusLine = `<:no_tag:1463272172201050336> **Not Connected**`;
        }

        const inviteButton = new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Server Link");
        if (data.inviteLink && data.inviteLink.startsWith('http')) {
            inviteButton.setURL(data.inviteLink).setDisabled(false);
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
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# <:A2Q_1:1466981218758426634><:A2Q_2:1466981281060360232> » Servers")
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `Total Members: ${totalNetworkMembers}\nTotal Tag Users: ${totalTagUsers}`
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
        );

    for (let i = 0; i < serverComponents.length; i++) {
        container.addSectionComponents(serverComponents[i]);
        const isLastItem = i === serverComponents.length - 1;
        if (!isLastItem) {
            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
            );
        }
    }

    container
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# <a:loading:1447184742934909032> Next Update: <t:${nextUpdateUnix}:R>`)
        );

    return [container];
}

// ==========================================
// 3. MASTER UPDATE FUNCTION (CONTROLLER)
// ==========================================
async function updateAllDashboards(client) {
    console.log('[Dashboard] Starting Global Update Cycle...');

    await runRoleUpdates(client);
    await runGatekeeper(client);

    const payload = await generateDashboardPayload(client);
    const locations = await DashboardLocation.find();
    
    for (const loc of locations) {
        const channel = client.channels.cache.get(loc.channelId);
        if (!channel) continue;

        try {
            const msg = await channel.messages.fetch(loc.messageId);
            await msg.edit({ 
                components: payload,
                flags: [MessageFlags.IsComponentsV2]
            });
        } catch (e) {
            console.error(`[Dashboard] 🛑 ERROR in Guild ${loc.guildId}:`);
            if (e.rawError && e.rawError.errors) {
                console.error(JSON.stringify(e.rawError.errors, null, 2));
            } else {
                console.error(e);
            }
        }
    }
    if (locations.length > 0) console.log(`[Dashboard] Updated ${locations.length} dashboards.`);
}

module.exports = { runRoleUpdates, generateDashboardPayload, updateAllDashboards, runGatekeeper };
