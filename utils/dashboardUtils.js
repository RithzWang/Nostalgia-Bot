const { 
    ContainerBuilder, TextDisplayBuilder, SectionBuilder, 
    ButtonBuilder, ButtonStyle, SeparatorBuilder, SeparatorSpacingSize 
} = require('discord.js');
const TrackedServer = require('../src/models/TrackedServerSchema');

// ==========================================
// 1. ROLE MANAGER (Runs every 5 mins)
// ==========================================
async function runRoleUpdates(client) {
    const servers = await TrackedServer.find();
    
    for (const serverData of servers) {
        if (!serverData.tagText || !serverData.roleId) continue;

        const guild = client.guilds.cache.get(serverData.guildId);
        if (!guild) continue; // Bot not in that server

        try {
            const role = guild.roles.cache.get(serverData.roleId);
            if (!role) continue; // Role deleted?

            // Fetch all members to ensure cache is full
            await guild.members.fetch();

            // Loop through all members
            for (const [id, member] of guild.members.cache) {
                const hasTagInName = member.displayName.includes(serverData.tagText);
                const hasRole = member.roles.cache.has(role.id);

                // A. Give Role (Has Tag but No Role)
                if (hasTagInName && !hasRole) {
                    await member.roles.add(role).catch(() => {});
                }
                // B. Remove Role (No Tag but Has Role)
                // Remove this 'else if' if you don't want the bot to take roles away
                else if (!hasTagInName && hasRole) {
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
    // Fetch all tracked servers from DB
    const servers = await TrackedServer.find();
    
    let totalNetworkMembers = 0;
    const serverSections = [];

    for (const data of servers) {
        const guild = client.guilds.cache.get(data.guildId);
        
        // Data Calculation
        const memberCount = guild ? guild.memberCount : 0;
        totalNetworkMembers += memberCount;
        
        let tagUserCount = 0;
        let roleMention = "(Not available yet)";

        if (guild && data.roleId) {
            const role = guild.roles.cache.get(data.roleId);
            if (role) {
                tagUserCount = role.members.size; // Count users with role
                // roleMention = `<@&${role.id}>`; // Optional: Mention the role
            }
        }

        // Handle "Not Available" state
        const displayTagCount = (!data.tagText || !data.roleId) 
            ? "`(Not available yet)`" 
            : `\`(${tagUserCount})\``;

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
                        `### <:greysword:1462740515043938438> Server Tag : ${data.tagEmojis || 'None'}\n` +
                        `**<:member:1462768443546669076> Server Member :** \`(${memberCount})\`\n` +
                        `**<:greysword_icon:1462768517685317778> Tag User :** ${displayTagCount}`
                    )
            );
        
        serverSections.push(section);
    }

    // Build Final Container
    const nextUpdateUnix = Math.floor((Date.now() + 5 * 60 * 1000) / 1000);
    
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(`# A2-Qabilatan Servers\n-# Total Members : \`(${totalNetworkMembers})\``)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
        );

    // Add every server section dynamically
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
