const { 
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, 
    SeparatorSpacingSize, SectionBuilder, ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const { Panel, ServerList } = require('../src/models/Qabilatan'); 

// --- CONFIGURATION ---
const MAIN_SERVER_ID = "1456197054782111756"; 
const GLOBAL_REWARD_ROLE = "1462217123433545812"; // Given to ALL adopters

async function buildDashboard(client) {
    const servers = await ServerList.find();
    
    // 1. Prepare Data Structures
    const validServerIds = new Set();        // To check if a tag is valid
    const serverToSpecificRole = new Map();  // Map ServerID -> Specific Role ID
    const allManagedRoles = new Set();       // All roles we need to manage (Global + Specifics)

    // Add Global Role to the "Managed" list so we can remove it if they stop wearing a tag
    allManagedRoles.add(GLOBAL_REWARD_ROLE);

    servers.forEach(s => {
        validServerIds.add(s.serverId);
        if (s.tagRoleID) {
            serverToSpecificRole.set(s.serverId, s.tagRoleID);
            allManagedRoles.add(s.tagRoleID);
        }
    });

    const mainGuild = client.guilds.cache.get(MAIN_SERVER_ID);
    const adoptersMap = new Map(); // For statistics

    // ====================================================
    // 2. LOGIC: CALCULATE ROLES & SYNC
    // ====================================================
    if (mainGuild) {
        try {
            const members = await mainGuild.members.fetch(); 

            for (const [memberId, member] of members) {
                const user = member.user;
                if (user.bot) continue;

                // --- Step A: Determine what they SHOULD have ---
                const rolesToKeep = new Set();
                let adoptedServerId = null;

                // Check if they are wearing a valid tag
                if (user.primaryGuild && user.primaryGuild.identityEnabled && user.primaryGuild.identityGuildId) {
                    const targetId = user.primaryGuild.identityGuildId;

                    if (validServerIds.has(targetId)) {
                        adoptedServerId = targetId;
                        
                        // 1. Give Global Role
                        rolesToKeep.add(GLOBAL_REWARD_ROLE);

                        // 2. Give Specific Role (if it exists)
                        const specificRole = serverToSpecificRole.get(targetId);
                        if (specificRole) {
                            rolesToKeep.add(specificRole);
                        }

                        // Count for stats
                        const count = adoptersMap.get(targetId) || 0;
                        adoptersMap.set(targetId, count + 1);
                    }
                }

                // --- Step B: Sync Roles (Add missing, Remove old) ---
                
                // 1. ADD: Loop through roles they SHOULD have
                for (const roleId of rolesToKeep) {
                    if (!member.roles.cache.has(roleId)) {
                        await member.roles.add(roleId).catch(e => console.error(`Failed to add role ${roleId}:`, e));
                    }
                }

                // 2. REMOVE: Loop through ALL managed roles
                // If they have a managed role that is NOT in the "Keep" list, remove it.
                // (This handles disabling tags OR switching servers)
                for (const managedRoleId of allManagedRoles) {
                    if (member.roles.cache.has(managedRoleId) && !rolesToKeep.has(managedRoleId)) {
                        await member.roles.remove(managedRoleId).catch(e => console.error(`Failed to remove role ${managedRoleId}:`, e));
                    }
                }
            }
        } catch (e) {
            console.error("Error syncing roles:", e);
        }
    }

    // ====================================================
    // 3. BUILD DASHBOARD UI
    // ====================================================
    let totalMembers = 0;
    let totalAdopters = 0;
    const serverSectionData = [];

    for (const srv of servers) {
        const guildObj = client.guilds.cache.get(srv.serverId);
        
        const memberCount = guildObj ? guildObj.memberCount : 0;
        const boosts = guildObj ? (guildObj.premiumSubscriptionCount || 0) : 0;
        const adopters = adoptersMap.get(srv.serverId) || 0;

        totalMembers += memberCount;
        totalAdopters += adopters;

        // Status Line Logic
        let statusLine = "";
        
        if (boosts < 3) {
            const needed = 3 - boosts;
            if (needed === 1) {
                statusLine = `<:no_boost:1463272235056889917> 1 Boost Remains`;
            } else {
                statusLine = `<:no_boost:1463272235056889917> ${needed} Boosts Remain`;
            }
        } else if (!srv.tagText) {
            statusLine = `<:no_tag:1463272172201050336> Not Enabled`;
        } else {
            statusLine = `<:greysword:1462853724824404069> Tag Adopters: ${adopters}`;
        }

        serverSectionData.push({
            name: srv.name || (guildObj ? guildObj.name : "Unknown Server"),
            invite: srv.inviteLink,
            tag: srv.tagText || "None",
            members: memberCount,
            statusLine: statusLine
        });
    }

    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# <:A2Q_1:1466981218758426634><:A2Q_2:1466981281060360232> » Servers")
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Total Members: ${totalMembers}\n-# Total Tags Adopters: ${totalAdopters}`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
        );

    if (serverSectionData.length === 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("No server added yet.")
        );
    } else {
        serverSectionData.forEach(s => {
            container.addSectionComponents(
                new SectionBuilder()
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setLabel("Server Link")
                            .setURL(s.invite)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## [${s.name}](${s.invite})`),
                        new TextDisplayBuilder().setContent(`**<:sparkles:1462851309219872841> Server Tag: ${s.tag}\n<:members:1462851249836654592> Members: ${s.members}\n${s.statusLine}**`)
                    )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
            );
        });
    }

    const nextUpdate = Math.floor((Date.now() + 60000) / 1000); 
    container
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`<a:loading:1447184742934909032> -# Next Update: <t:${nextUpdate}:R>`)
        );

    return [container];
}

async function updateAllPanels(client) {
    const panels = await Panel.find();
    if (!panels || panels.length === 0) return;

    const components = await buildDashboard(client);

    for (const p of panels) {
        try {
            const channel = await client.channels.fetch(p.channelId).catch(() => null);
            if (!channel) continue;
            
            const msg = await channel.messages.fetch(p.messageId).catch(() => null);
            if (msg) {
                await msg.edit({ components: components });
            } else {
                await Panel.deleteOne({ _id: p._id });
            }
        } catch (e) {
            console.error(`Failed to update panel in ${p.guildId}:`, e);
        }
    }
}

module.exports = { buildDashboard, updateAllPanels };
