const { 
    ContainerBuilder, TextDisplayBuilder, ThumbnailBuilder, SectionBuilder, 
    ButtonBuilder, ButtonStyle, SeparatorBuilder, SeparatorSpacingSize,
    MessageFlags 
} = require('discord.js');
const TrackedServer = require('../src/models/TrackedServerSchema');
const DashboardLocation = require('../src/models/DashboardLocationSchema');

// 👇 IMPORT THE GATEKEEPER LOGIC
const { runGatekeeper } = require('./gatekeeperUtils');

// 🔒 CONFIGURATION
const MAIN_GUILD_ID = '1456197054782111756'; 
const GLOBAL_TAG_ROLE_ID = '1462217123433545812'; 

// ==========================================
// 1. ROLE MANAGER (Specific & Global)
// ==========================================
async function runRoleUpdates(client) {
    const mainGuild = client.guilds.cache.get(MAIN_GUILD_ID);
    if (!mainGuild) return console.log('[Role Manager] ❌ Bot is not in the Main Server defined!');

    const trackedServers = await TrackedServer.find();
    
    // Create Lookup Maps
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
        await mainGuild.members.fetch({ force: true });
        const globalRole = mainGuild.roles.cache.get(GLOBAL_TAG_ROLE_ID);

        for (const [memberId, member] of mainGuild.members.cache) {
            if (member.user.bot) continue;

            const identity = member.user.primaryGuild; 
            const isTagEnabled = identity && identity.identityEnabled === true;
            const currentTagGuildId = isTagEnabled ? identity.identityGuildId : null;

            // Flag: Is the user wearing a tag from ANY of our tracked servers?
            const isWearingAnyValidTag = currentTagGuildId && validTagServerIds.has(currentTagGuildId);

            // A. MANAGE SPECIFIC SERVER ROLES
            if (currentTagGuildId && tagToRoleMap.has(currentTagGuildId)) {
                const targetRoleId = tagToRoleMap.get(currentTagGuildId);
                const role = mainGuild.roles.cache.get(targetRoleId);
                if (role && !member.roles.cache.has(targetRoleId)) {
                    await member.roles.add(role).catch(() => {});
                }
            }

            // B. REMOVE Specific Roles (if mismatched)
            for (const [rId, sourceGuildId] of roleToGuildMap.entries()) {
                if (member.roles.cache.has(rId)) {
                    if (currentTagGuildId !== sourceGuildId) {
                        const roleToRemove = mainGuild.roles.cache.get(rId);
                        if (roleToRemove) await member.roles.remove(roleToRemove).catch(() => {});
                    }
                }
            }

            // C. MANAGE GLOBAL ROLE
            if (globalRole) {
                const hasGlobalRole = member.roles.cache.has(GLOBAL_TAG_ROLE_ID);

                if (isWearingAnyValidTag && !hasGlobalRole) {
                    await member.roles.add(globalRole).catch(() => {});
                } 
                else if (!isWearingAnyValidTag && hasGlobalRole) {
                    await member.roles.remove(globalRole).catch(() => {});
                }
            }
        }
    } catch (e) {
        console.error(`[Role Manager] Error processing Hub updates:`, e.message);
    }
}

// ==========================================
// 2. DASHBOARD UI GENERATOR
// ==========================================
async function generateDashboardPayload(client) {
    const servers = await TrackedServer.find();
    
    // 📊 Counters
    let totalNetworkMembers = 0;
    let totalTagUsers = 0; 
    
    const serverSections = [];

    for (const data of servers) {
        const guild = client.guilds.cache.get(data.guildId);
        const memberCount = guild ? guild.memberCount : 0;
        totalNetworkMembers += memberCount;
        
        let displayTagText = data.tagText || "None";
        let tagStatusLine = ""; 

        if (guild) {
            // 🔢 Calculate Tag Users for this server
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

            // 🔍 CHECK 1: Boost Level (Min 3)
            const boostCount = guild.premiumSubscriptionCount || 0;
            const boostsNeeded = 3 - boostCount;

            if (boostsNeeded > 0) {
                const plural = boostsNeeded === 1 ? "Boost" : "Boosts";
                const remainPlural = boostsNeeded === 1 ? "Remains" : "Remain";
                tagStatusLine = `<:no_boost:1463272235056889917> **${boostsNeeded} ${plural} ${remainPlural}**`;
            } else {
                // 🔍 CHECK 2: Feature Enabled?
                if (!hasClanFeature) {
                    tagStatusLine = `<:no_tag:1463272172201050336> **Not Enabled**`;
                } else {
                    // 🟢 Show Count
                    tagStatusLine = `<:greysword:1462853724824404069> **Tag Users:** ${currentServerTagCount}`;
                }
            }
        } else {
            tagStatusLine = `<:no_tag:1463272172201050336> **Not Connected**`;
        }

        const section = new SectionBuilder()
            .setButtonAccessory(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel("Join Server")
                    .setURL(data.inviteLink || "https://discord.gg/")
                    .setDisabled(!data.inviteLink)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `## [${data.displayName}](${data.inviteLink})\n` +
                        `**<:sparkles:1462851309219872841> Server Tag:** ${displayTagText}\n` +
                        `**<:members:1462851249836654592> Members:** ${memberCount}\n` +
                        `${tagStatusLine}`
                    )
            );
        serverSections.push(section);
    }

    const nextUpdateUnix = Math.floor((Date.now() + 60 * 1000) / 1000);
    
    // Header
    const PERMANENT_IMAGE_URL = "https://cdn.discordapp.com/attachments/853503167706693632/1463227084817039558/A2-Q_20260121004151.png?ex=69710fea&is=696fbe6a&hm=77aab04999980ef14e5e3d51329b20f84a2fd3e01046bd93d16ac71be4410ef9&"; 

    const headerSection = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(
                    `# A2-Qabīlatān\n` +
                    `\`\`\`\nTotal Members : ${totalNetworkMembers}\n` + 
                    `Total Tag Users : ${totalTagUsers}\`\`\``
                )
        )
        .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(PERMANENT_IMAGE_URL)
        );

    const container = new ContainerBuilder()
        .setSpoiler(false)
        .addSectionComponents(headerSection)
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));

    for (let i = 0; i < serverSections.length; i++) {
        container.addSectionComponents(serverSections[i]);
        
        const isLastItem = i === serverSections.length - 1;
        const spacingSize = isLastItem ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small;
        const visibleType = isLastItem ? true : false;

        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(spacingSize).setDivider(visibleType)
        );
    }

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# <a:loading:1447184742934909032> Next Update: <t:${nextUpdateUnix}:R>`)
    );

    return [container];
}

// ==========================================
// 3. MASTER UPDATE FUNCTION (CONTROLLER)
// ==========================================
async function updateAllDashboards(client) {
    console.log('[Dashboard] Starting Global Update Cycle...');

    // 1. Run Role Manager
    await runRoleUpdates(client);
    
    // 2. Run Gatekeeper (Imported Security Check)
    await runGatekeeper(client);

    // 3. Update Dashboard UI
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
            console.log(`[Dashboard] Failed to update in Guild ${loc.guildId}: ${e.message}`);
        }
    }
    if (locations.length > 0) console.log(`[Dashboard] Updated ${locations.length} dashboards.`);
}

module.exports = { runRoleUpdates, generateDashboardPayload, updateAllDashboards, runGatekeeper };
