const { 
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, 
    SeparatorSpacingSize, SectionBuilder, ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const { Panel, ServerList } = require('../models/Qabilatan'); 

// The Main Server ID (A2-Q)
const MAIN_SERVER_ID = "1456197054782111756"; 

async function buildDashboard(client) {
    const servers = await ServerList.find();
    
    // 1. Create Lookup Maps for faster processing
    // serverMap: Maps 'Server ID' -> 'Role ID in Main Server'
    const serverToRoleMap = new Map();
    // allTrackedRoles: A list of all roles managed by this system (to know what to remove)
    const allTrackedRoles = new Set();

    servers.forEach(s => {
        if (s.tagRoleID) {
            serverToRoleMap.set(s.serverId, s.tagRoleID);
            allTrackedRoles.add(s.tagRoleID);
        }
    });

    const mainGuild = client.guilds.cache.get(MAIN_SERVER_ID);
    const adoptersMap = new Map(); // Stores { serverId: count }

    // ====================================================
    // 2. CALCULATE ADOPTERS & SYNC ROLES
    // ====================================================
    
    if (mainGuild) {
        try {
            // Force fetch to ensure we see the 'Primary Guild' data
            const members = await mainGuild.members.fetch(); 

            for (const [memberId, member] of members) {
                const user = member.user;
                if (user.bot) continue;

                let targetRoleId = null; // The role they SHOULD have
                let adoptedServerId = null;

                // A. Check what tag they are wearing
                if (user.primaryGuild && user.primaryGuild.identityEnabled && user.primaryGuild.identityGuildId) {
                    adoptedServerId = user.primaryGuild.identityGuildId;
                    
                    // Count stats for dashboard
                    // We count it even if they don't have a role set up, just for stats
                    const currentCount = adoptersMap.get(adoptedServerId) || 0;
                    adoptersMap.set(adoptedServerId, currentCount + 1);

                    // Determine the specific role for this server
                    if (serverToRoleMap.has(adoptedServerId)) {
                        targetRoleId = serverToRoleMap.get(adoptedServerId);
                    }
                }

                // B. Role Sync Logic
                // 1. GRANT: If they should have a role but don't, give it.
                if (targetRoleId && !member.roles.cache.has(targetRoleId)) {
                    await member.roles.add(targetRoleId).catch(e => console.error(`Failed to add role to ${user.tag}:`, e));
                }

                // 2. REVOKE: Check all other "Qabilatan Roles". 
                // If they have a role that isn't their current target role, remove it.
                // (This handles switching tags or disabling tags completely)
                for (const trackedRole of allTrackedRoles) {
                    if (trackedRole !== targetRoleId && member.roles.cache.has(trackedRole)) {
                        await member.roles.remove(trackedRole).catch(e => console.error(`Failed to remove old role from ${user.tag}:`, e));
                    }
                }
            }
        } catch (e) {
            console.error("Error syncing roles/stats:", e);
        }
    }

    // ====================================================
    // 3. PREPARE DATA FOR DASHBOARD
    // ====================================================
    let totalMembers = 0;
    let totalAdopters = 0;
    const serverSectionData = [];

    // Filter to ensure we only show stats for servers in our DB
    const validServerIds = new Set(servers.map(s => s.serverId));

    for (const srv of servers) {
        const guildObj = client.guilds.cache.get(srv.serverId);
        
        const memberCount = guildObj ? guildObj.memberCount : 0;
        const boosts = guildObj ? (guildObj.premiumSubscriptionCount || 0) : 0;
        
        // Only count adopters if the server is actually in our list
        const adopters = adoptersMap.get(srv.serverId) || 0;

        totalMembers += memberCount;
        totalAdopters += adopters;

        // --- STATUS LINE LOGIC ---
        let statusLine = "";
        
        if (boosts < 3) {
            const needed = 3 - boosts;
            const s = needed === 1 ? '' : 's';
            statusLine = `<:no_boost:1463272235056889917> ${needed} Boost${s} Remain`;
            // Grammar fix: "1 Boost Remain" -> "1 Boost Remains" handled implicitly or simply:
            if(needed === 1) statusLine = `<:no_boost:1463272235056889917> 1 Boost Remains`;

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

    // ====================================================
    // 4. BUILD COMPONENTS (V2)
    // ====================================================
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

    // Footer
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
