const { 
    ContainerBuilder, TextDisplayBuilder, SectionBuilder, 
    ButtonBuilder, ButtonStyle, SeparatorBuilder, SeparatorSpacingSize,
    MessageFlags 
} = require('discord.js');
const { Panel, ServerList } = require('../src/models/Qabilatan'); 

// 🔒 CONFIGURATION
const MAIN_GUILD_ID = '1456197054782111756'; 
const GLOBAL_TAG_ROLE_ID = '1462217123433545812'; 

// 🕒 HELPER: Pause execution to prevent Rate Limits
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// 1. ROLE MANAGER
// ==========================================
async function runRoleUpdates(client) {
    const servers = await ServerList.find();
    const mainGuild = client.guilds.cache.get(MAIN_GUILD_ID);

    if (!mainGuild) return;

    // Map Server IDs to their Role IDs
    const serverConfig = new Map(); 
    const allManagedRoles = new Set();
    
    // Always manage the Global Role
    allManagedRoles.add(GLOBAL_TAG_ROLE_ID);

    servers.forEach(s => {
        serverConfig.set(s.serverId, { roleId: s.tagRoleID || null });
        if (s.tagRoleID) allManagedRoles.add(s.tagRoleID);
    });

    try {
        // ⚠️ FORCE FETCH: Ensures we see the latest tags instantly
        const members = await mainGuild.members.fetch({ force: true });

        for (const [memberId, member] of members) {
            if (member.user.bot) continue;

            const user = member.user;
            const rolesToKeep = new Set();

            // --- CHECK: Official Discord "Primary Guild" (Clan Tag) ---
            if (user.primaryGuild && user.primaryGuild.identityEnabled && user.primaryGuild.identityGuildId) {
                const targetId = user.primaryGuild.identityGuildId;
                const config = serverConfig.get(targetId);
                
                // If they are representing one of our valid servers
                if (config) {
                    rolesToKeep.add(GLOBAL_TAG_ROLE_ID);
                    if (config.roleId) rolesToKeep.add(config.roleId);
                }
            }

            // --- SYNC ROLES ---
            // 1. ADD missing roles
            for (const roleId of rolesToKeep) {
                if (!member.roles.cache.has(roleId)) {
                    await member.roles.add(roleId).catch(() => {});
                }
            }

            // 2. REMOVE old roles
            for (const managedRoleId of allManagedRoles) {
                if (member.roles.cache.has(managedRoleId) && !rolesToKeep.has(managedRoleId)) {
                    await member.roles.remove(managedRoleId).catch(() => {});
                }
            }
        }
    } catch (e) { 
        console.error(`[Role Manager] Error: ${e.message}`); 
    }
}

// ==========================================
// 2. DASHBOARD UI GENERATOR
// ==========================================
async function generateDashboardPayload(client) {
    const servers = await ServerList.find();
    const mainGuild = client.guilds.cache.get(MAIN_GUILD_ID);

    // 1. Calculate Adopters Count
    const adoptersMap = new Map(); // serverId -> count

    if (mainGuild) {
        // ⚠️ FORCE FETCH: Get real-time data for the dashboard
        const members = await mainGuild.members.fetch({ force: true }).catch(() => new Map());
        
        members.forEach(m => {
            const u = m.user;

            // Check: Official Clan Tag Only
            if (u.primaryGuild && u.primaryGuild.identityEnabled && u.primaryGuild.identityGuildId) {
                const tId = u.primaryGuild.identityGuildId;
                // Only count if this server is in our list
                const srv = servers.find(s => s.serverId === tId);
                if (srv) {
                    adoptersMap.set(tId, (adoptersMap.get(tId) || 0) + 1);
                }
            }
        });
    }

    let totalNetworkMembers = 0;
    let totalTagUsers = 0; 
    const serverComponents = [];

    for (const data of servers) {
        const guild = client.guilds.cache.get(data.serverId);
        const memberCount = guild ? guild.memberCount : 0;
        totalNetworkMembers += memberCount;
        
        let displayTagText = data.tagText || "None";
        let tagStatusLine = ""; 

        // Get count from our map
        const currentServerTagCount = adoptersMap.get(data.serverId) || 0;
        totalTagUsers += currentServerTagCount;

        if (guild) {
            // Check for official feature flags
            const hasClanFeature = guild.features.includes('CLAN') || guild.features.includes('GUILD_TAGS') || guild.features.includes('MEMBER_VERIFICATION_GATE_ENABLED'); 
            const hasActiveAdopters = currentServerTagCount > 0; 

            const boostCount = guild.premiumSubscriptionCount || 0;
            const boostsNeeded = 3 - boostCount;

            if (boostsNeeded > 0) {
                 const s = boostsNeeded === 1 ? '' : 's';
                 tagStatusLine = `<:no_boost:1463272235056889917> **${boostsNeeded} Boost${s} Remain**`; 
                 if(boostsNeeded === 1) tagStatusLine = `<:no_boost:1463272235056889917> **1 Boost Remains**`;
            } 
            // If they have users representing them OR the feature is strictly on
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
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Next Update: <t:${nextUpdateUnix}:R>`));

    return [container];
}

// ==========================================
// 3. MASTER UPDATE
// ==========================================
async function updateAllPanels(client) {
    try {
        await runRoleUpdates(client).catch(e => console.error(e));

        const payload = await generateDashboardPayload(client);
        const locations = await Panel.find(); 
        
        for (const loc of locations) {
            let channel;
            try { channel = await client.channels.fetch(loc.channelId); } 
            catch (e) { await Panel.deleteOne({ _id: loc._id }); continue; }

            if (!channel) { await Panel.deleteOne({ _id: loc._id }); continue; }

            await sleep(2500);

            try {
                let msg = null;
                if (loc.messageId) {
                    try { msg = await channel.messages.fetch(loc.messageId); } 
                    catch (e) { msg = null; }
                }

                if (msg && msg.editable) {
                    await msg.edit({ components: payload, flags: [MessageFlags.IsComponentsV2] });
                } else {
                    const newMsg = await channel.send({ components: payload, flags: [MessageFlags.IsComponentsV2] });
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

module.exports = { updateAllPanels, generateDashboardPayload };
