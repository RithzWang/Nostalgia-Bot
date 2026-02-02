const { 
    ContainerBuilder, TextDisplayBuilder, SectionBuilder, 
    ButtonBuilder, ButtonStyle, SeparatorBuilder, SeparatorSpacingSize,
    MessageFlags 
} = require('discord.js');
const { Panel, ServerList } = require('../src/models/Qabilatan'); // Using the models we created

// 🔒 CONFIGURATION
const MAIN_GUILD_ID = '1456197054782111756'; 
const GLOBAL_TAG_ROLE_ID = '1462217123433545812'; 

// 🕒 HELPER: Pause execution to prevent Rate Limits
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// 1. ROLE MANAGER (GLOBAL + SPECIFIC)
// ==========================================
async function runRoleUpdates(client) {
    const servers = await ServerList.find();
    const mainGuild = client.guilds.cache.get(MAIN_GUILD_ID);

    if (!mainGuild) return;

    // 1. Prepare Data Structures
    const validServerIds = new Set();        
    const serverToSpecificRole = new Map();  
    const allManagedRoles = new Set();       

    // Always track the Global Role
    allManagedRoles.add(GLOBAL_TAG_ROLE_ID);

    servers.forEach(s => {
        validServerIds.add(s.serverId);
        if (s.tagRoleID) {
            serverToSpecificRole.set(s.serverId, s.tagRoleID);
            allManagedRoles.add(s.tagRoleID);
        }
    });

    try {
        // We use fetch() to ensure we get the latest 'primaryGuild' (Tag) data
        const members = await mainGuild.members.fetch();

        for (const [memberId, member] of members) {
            if (member.user.bot) continue;

            const user = member.user;
            const rolesToKeep = new Set();

            // --- A. Determine what they SHOULD have ---
            // Check native Discord Tag (Primary Guild)
            if (user.primaryGuild && user.primaryGuild.identityEnabled && user.primaryGuild.identityGuildId) {
                const targetId = user.primaryGuild.identityGuildId;

                // Is this tag from one of our listed servers?
                if (validServerIds.has(targetId)) {
                    // 1. They get the Global Role
                    rolesToKeep.add(GLOBAL_TAG_ROLE_ID);

                    // 2. They get the Specific Server Role (if defined)
                    const specificRole = serverToSpecificRole.get(targetId);
                    if (specificRole) {
                        rolesToKeep.add(specificRole);
                    }
                }
            }

            // --- B. Sync Roles ---
            
            // 1. ADD missing roles
            for (const roleId of rolesToKeep) {
                if (!member.roles.cache.has(roleId)) {
                    await member.roles.add(roleId).catch(() => {});
                }
            }

            // 2. REMOVE old roles (Switching tags or disabling)
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
// 2. DASHBOARD UI GENERATOR (V2 Components)
// ==========================================
async function generateDashboardPayload(client) {
    const servers = await ServerList.find();
    const mainGuild = client.guilds.cache.get(MAIN_GUILD_ID);

    // 1. Pre-calculate Adopters Map (Counting users in Main Server)
    const adoptersMap = new Map();
    if (mainGuild) {
        const members = await mainGuild.members.fetch().catch(() => new Map());
        members.forEach(m => {
            const u = m.user;
            if (u.primaryGuild && u.primaryGuild.identityEnabled && u.primaryGuild.identityGuildId) {
                const tId = u.primaryGuild.identityGuildId;
                adoptersMap.set(tId, (adoptersMap.get(tId) || 0) + 1);
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

        // Get adopter count from our calculated map
        const currentServerTagCount = adoptersMap.get(data.serverId) || 0;
        totalTagUsers += currentServerTagCount;

        if (guild) {
            // ✅ THE FIX: Check actual Guild Features, not just text
            // 'CLAN' is the internal flag for Guild Tags
            const hasClanFeature = guild.features.includes('CLAN') || guild.features.includes('GUILD_TAGS') || guild.features.includes('MEMBER_VERIFICATION_GATE_ENABLED'); 
            
            const boostCount = guild.premiumSubscriptionCount || 0;
            const boostsNeeded = 3 - boostCount;

            // Logic:
            // 1. If not enough boosts -> Show boosts needed
            // 2. If boosts ok but feature missing -> Not Enabled
            // 3. If feature exists -> Show Adopters count
            if (boostsNeeded > 0) {
                 const s = boostsNeeded === 1 ? '' : 's';
                 tagStatusLine = `<:no_boost:1463272235056889917> **${boostsNeeded} Boost${s} Remain**`; // Grammar fixed
                 if(boostsNeeded === 1) tagStatusLine = `<:no_boost:1463272235056889917> **1 Boost Remains**`;
            } else if (!hasClanFeature) {
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
// 3. MASTER UPDATE (THE CLEANER)
// ==========================================
async function updateAllPanels(client) {
    // console.log('--- 🧹 STARTING UPDATE ---');

    try {
        await runRoleUpdates(client).catch(e => console.error(e));

        const payload = await generateDashboardPayload(client);
        const locations = await Panel.find(); // Using Panel model
        
        for (const loc of locations) {
            // STEP 1: Validate Channel
            let channel;
            try {
                channel = await client.channels.fetch(loc.channelId);
            } catch (e) {
                await Panel.deleteOne({ _id: loc._id });
                continue;
            }

            if (!channel) {
                await Panel.deleteOne({ _id: loc._id });
                continue;
            }

            // STEP 2: Wait (Prevents Rate Limits)
            await sleep(2500);

            // STEP 3: Safe Update Logic
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
                    // Update DB with new message ID immediately
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

// Exporting functions so your ready.js can use them
module.exports = { updateAllPanels, generateDashboardPayload };
