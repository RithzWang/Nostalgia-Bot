const { 
    ContainerBuilder, TextDisplayBuilder, ThumbnailBuilder, SectionBuilder, 
    ButtonBuilder, ButtonStyle, SeparatorBuilder, SeparatorSpacingSize,
    MessageFlags 
} = require('discord.js');
const TrackedServer = require('../src/models/TrackedServerSchema');
const DashboardLocation = require('../src/models/DashboardLocationSchema');

// 🔒 REPLACE THIS WITH YOUR MAIN SERVER ID (The "Hub" where roles are added)
const MAIN_GUILD_ID = '1456197054782111756'; // <--- PUT YOUR MAIN SERVER ID HERE

// ==========================================
// 1. ROLE MANAGER (UPDATED FOR HUB SERVER)
// ==========================================
async function runRoleUpdates(client) {
    // 1. Get the Main Hub Server
    const mainGuild = client.guilds.cache.get(MAIN_GUILD_ID);
    if (!mainGuild) return console.log('[Role Manager] ❌ Bot is not in the Main Server defined!');

    // 2. Load all tracked servers (to map Tag IDs -> Role IDs)
    const trackedServers = await TrackedServer.find();
    
    // 3. Create a quick lookup map: "GuildID" -> "RoleID"
    // This lets us instantly know which role to give based on the tag they are wearing
    const tagMap = new Map();
    for (const server of trackedServers) {
        if (server.roleId) {
            tagMap.set(server.guildId, server.roleId);
        }
    }

    try {
        // 4. Force fetch all members in the Main Server to ensure tag data is fresh
        await mainGuild.members.fetch({ force: true });

        // 5. Loop through every member in your Main Server
        for (const [memberId, member] of mainGuild.members.cache) {
            if (member.user.bot) continue;

            // Get their official Primary Guild data
            const identity = member.user.primaryGuild; //

            // Check if they are officially wearing a tag enabled
            const isWearingTag = identity && identity.identityEnabled === true;
            
            // If wearing a tag, which server is it from?
            const tagSourceGuildId = isWearingTag ? identity.identityGuildId : null;
            
            // Does that source server correspond to a Role in our database?
            const targetRoleId = tagSourceGuildId ? tagMap.get(tagSourceGuildId) : null;

            // --- SYNC ROLES ---
            
            // A. If they should have a role (Target Role Found)
            if (targetRoleId) {
                const role = mainGuild.roles.cache.get(targetRoleId);
                
                if (role && !member.roles.cache.has(targetRoleId)) {
                    // Give the role
                    await member.roles.add(role).catch(e => console.error(`[Role Manager] Failed to add role: ${e.message}`));
                }

                // (Optional) Remove OTHER clan roles? 
                // If you want them to only have 1 clan role at a time, you can loop through 'tagMap.values()' here and remove others.
            }

            // B. (Optional) If they disable their tag, should we remove the role?
            // This loop checks if they have a role they shouldn't have anymore
            /*
            for (const [sId, rId] of tagMap.entries()) {
                // If they have a role (rId) BUT their current tag (tagSourceGuildId) does not match the server (sId)
                if (member.roles.cache.has(rId) && tagSourceGuildId !== sId) {
                    const roleToRemove = mainGuild.roles.cache.get(rId);
                    if (roleToRemove) await member.roles.remove(roleToRemove).catch(() => {});
                }
            }
            */
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
                    tagStatusLine = `<:no_tag:1463260221412605994> **__Not Enabled__**`;
                } else {
                    // 🟢 COUNT REAL TAG WEARERS (Global Strength)
                    // We check the actual clan server to see how many people are representing it globally
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
            tagStatusLine = `<:no_tag:1463260221412605994> **__Not Connected__**`;
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
