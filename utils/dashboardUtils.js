const { 
    ContainerBuilder, TextDisplayBuilder, ThumbnailBuilder, SectionBuilder, 
    ButtonBuilder, ButtonStyle, SeparatorBuilder, SeparatorSpacingSize,
    MessageFlags 
} = require('discord.js');
const TrackedServer = require('../src/models/TrackedServerSchema');
const DashboardLocation = require('../src/models/DashboardLocationSchema');

// 🔒 REPLACE THIS WITH YOUR MAIN SERVER ID (The "Hub" where roles are added)
const MAIN_GUILD_ID = '837741275603009626'; 

// ==========================================
// 1. ROLE MANAGER (ADD + REMOVE)
// ==========================================
async function runRoleUpdates(client) {
    // 1. Get the Main Hub Server
    const mainGuild = client.guilds.cache.get(MAIN_GUILD_ID);
    if (!mainGuild) return console.log('[Role Manager] ❌ Bot is not in the Main Server defined!');

    const trackedServers = await TrackedServer.find();
    
    // 2. Create Lookup Maps
    // Map: GuildID -> RoleID (For Adding)
    const tagToRoleMap = new Map();
    // Map: RoleID -> GuildID (For Removing)
    const roleToGuildMap = new Map();

    for (const server of trackedServers) {
        if (server.roleId) {
            tagToRoleMap.set(server.guildId, server.roleId);
            roleToGuildMap.set(server.roleId, server.guildId);
        }
    }

    try {
        await mainGuild.members.fetch({ force: true });

        for (const [memberId, member] of mainGuild.members.cache) {
            if (member.user.bot) continue;

            const identity = member.user.primaryGuild; 
            const isTagEnabled = identity && identity.identityEnabled === true;
            
            // The Server ID of the tag they are currently wearing (or null)
            const currentTagGuildId = isTagEnabled ? identity.identityGuildId : null;

            // ---------------------------------------------------------
            // A. ADD ROLE (If they wear a tracked tag)
            // ---------------------------------------------------------
            if (currentTagGuildId && tagToRoleMap.has(currentTagGuildId)) {
                const targetRoleId = tagToRoleMap.get(currentTagGuildId);
                const role = mainGuild.roles.cache.get(targetRoleId);

                if (role && !member.roles.cache.has(targetRoleId)) {
                    await member.roles.add(role).catch(() => {});
                }
            }

            // ---------------------------------------------------------
            // B. REMOVE ROLE (If they stopped wearing the matching tag)
            // ---------------------------------------------------------
            // We check every tracked role. If they have the role, but their 
            // CURRENT tag does not match that role's source server -> Remove it.
            for (const [rId, sourceGuildId] of roleToGuildMap.entries()) {
                if (member.roles.cache.has(rId)) {
                    // If the tag they are wearing is NOT the one required for this role
                    if (currentTagGuildId !== sourceGuildId) {
                        const roleToRemove = mainGuild.roles.cache.get(rId);
                        if (roleToRemove) {
                            await member.roles.remove(roleToRemove).catch(() => {});
                        }
                    }
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
    let totalNetworkMembers = 0;
    const serverSections = [];

    for (const data of servers) {
        const guild = client.guilds.cache.get(data.guildId);
        const memberCount = guild ? guild.memberCount : 0;
        totalNetworkMembers += memberCount;
        
        let displayTagText = data.tagText || "None";
        let tagStatusLine = ""; 

        if (guild) {
            // 🔍 CHECK 1: Boost Level Requirement (Min 3 Boosts)
            const boostCount = guild.premiumSubscriptionCount || 0;
            const boostsNeeded = 3 - boostCount;

            if (boostsNeeded > 0) {
                const plural = boostsNeeded === 1 ? "Boost" : "Boosts";
                const remainPlural = boostsNeeded === 1 ? "Remains" : "Remain";
                tagStatusLine = `<:no_boost:1463260278241362086> **${boostsNeeded} ${plural} ${remainPlural}**`;
            } else {
                // 🔍 CHECK 2: Does the server have the Clan feature?
                const hasClanFeature = guild.features.includes('CLAN') || guild.features.includes('GUILD_TAGS');

                if (!hasClanFeature) {
                    tagStatusLine = `<:no_tag:1463260221412605994> **Not Enabled**`;
                } else {
                    // 🟢 COUNT REAL TAG WEARERS (Global Strength)
                    const tagWearers = guild.members.cache.filter(member => {
                        const identity = member.user.primaryGuild;
                        return identity && 
                               identity.identityGuildId === data.guildId &&
                               identity.identityEnabled === true;
                    });
                    
                    tagStatusLine = `<:greysword:1462853724824404069> **Tag Users:** ${tagWearers.size}`;
                }
            }
        } else {
            tagStatusLine = `<:no_tag:1463260221412605994> **Not Connected**`;
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
                .setContent(`# A2-Qabīlatān\n Total Members : ${totalNetworkMembers}`)
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
// 3. MASTER UPDATE FUNCTION
// ==========================================
async function updateAllDashboards(client) {
    console.log('[Dashboard] Starting Global Update Cycle...');

    await runRoleUpdates(client);
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

module.exports = { runRoleUpdates, generateDashboardPayload, updateAllDashboards };
