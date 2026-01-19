const { 
    ContainerBuilder, TextDisplayBuilder, SectionBuilder, 
    ButtonBuilder, ButtonStyle, SeparatorBuilder, SeparatorSpacingSize 
} = require('discord.js');
const TrackedServer = require('../src/models/TrackedServerSchema');

// ==========================================
// 1. ROLE MANAGER (Official Tag Check)
// ==========================================
async function runRoleUpdates(client) {
    const servers = await TrackedServer.find();
    
    for (const serverData of servers) {
        // We need a Role ID and a Tag Text (e.g. "A2-Q") to check against
        if (!serverData.tagText || !serverData.roleId) continue;

        const guild = client.guilds.cache.get(serverData.guildId);
        if (!guild) continue; 

        try {
            const role = guild.roles.cache.get(serverData.roleId);
            if (!role) continue; 

            // Force fetch members to ensure User objects have the latest 'primaryGuild' data
            await guild.members.fetch();

            for (const [id, member] of guild.members.cache) {
                const user = member.user;
                const hasRole = member.roles.cache.has(role.id);
                
                // 🔍 NEW LOGIC: Check the Official User Primary Guild Tag
                // We access the property from the code you showed me
                const userTag = user.primaryGuild?.tag; 
                
                // Check if the user's current tag matches the server's tracked tag
                const hasOfficialTag = userTag === serverData.tagText;

                // A. Give Role (Has Official Tag, missing role)
                if (hasOfficialTag && !hasRole) {
                    await member.roles.add(role).catch(() => {});
                }
                // B. Remove Role (Does NOT have Official Tag, but has role)
                else if (!hasOfficialTag && hasRole) {
                    await member.roles.remove(role).catch(() => {});
                }
            }
        } catch (e) {
            console.error(`[Role Manager] Error in ${serverData.displayName}:`, e.message);
        }
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
        
        // 1. Member Count
        const memberCount = guild ? guild.memberCount : 0;
        totalNetworkMembers += memberCount;
        
        // 2. Tag User Count (Based on Role members, which we just updated above)
        let tagUserCount = 0;
        let isRoleValid = false;

        if (guild && data.roleId) {
            const role = guild.roles.cache.get(data.roleId);
            if (role) {
                tagUserCount = role.members.size; 
                isRoleValid = true;
            }
        }

        const displayTagCount = isRoleValid 
            ? `\`(${tagUserCount})\`` 
            : "`(Not available yet)`";

        const displayTagText = data.tagText || "None";

        // Build Section
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
                        `## ${data.displayName}\n` +
                        `### <:greysword:1462740515043938438> Server Tag : ${displayTagText}\n` +
                        `**<:member:1462768443546669076> Server Member :** \`(${memberCount})\`\n` +
                        `**<:greysword_icon:1462768517685317778> Tag User :** ${displayTagCount}`
                    )
            );
        
        serverSections.push(section);
    }

    // 3 Minute Update Timer
    const nextUpdateUnix = Math.floor((Date.now() + 3 * 60 * 1000) / 1000);
    
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(`# A2-Qabilatan Servers\n-# Total Members : \`(${totalNetworkMembers})\``)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
        );

    for (const section of serverSections) {
        container.addSectionComponents(section);
        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
    }

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### 🔁 Next Update: <t:${nextUpdateUnix}:R>`)
    );

    return [container];
}

module.exports = { runRoleUpdates, generateDashboardPayload };
