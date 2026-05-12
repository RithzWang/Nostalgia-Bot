const { 
    ContainerBuilder, 
    TextDisplayBuilder, 
    SeparatorBuilder, 
    SeparatorSpacingSize, 
    MessageFlags, 
    MediaGalleryBuilder, 
    MediaGalleryItemBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder, 
    ActionRowBuilder,
    SectionBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const ServerStatsConfig = require('../src/models/ServerStats');

// Memory cache to prevent the Adopter count from resetting to 0
const memoryAdopterCount = new Map();

// ==========================================
// 1. PUBLIC DASHBOARD PAYLOAD GENERATOR
// ==========================================
async function generateServerStatsPayload(guild, config) {
    let tagAdoptersCount = 0;

    // A. Calculate adopters and assign/remove roles dynamically
    try {
        await guild.members.fetch();
        
        // If an Adopter Role is set, we count the role (100% accurate)
        if (config.tagRoleId && guild.roles.cache.has(config.tagRoleId)) {
            tagAdoptersCount = guild.roles.cache.get(config.tagRoleId).members.filter(m => !m.user.bot).size;
        } else {
            // Otherwise, we scan for Discord's built-in Identity Tag
            for (const [memberId, member] of guild.members.cache) {
                if (member.user.bot) continue;

                const user = member.user;
                const hasTag = user.primaryGuild && user.primaryGuild.identityEnabled && user.primaryGuild.identityGuildId === guild.id;
                
                if (hasTag) tagAdoptersCount++;
            }
            
            // Memory Fallback: If Discord API drops the ball and returns 0, use our memory!
            if (tagAdoptersCount === 0 && memoryAdopterCount.has(guild.id)) {
                tagAdoptersCount = memoryAdopterCount.get(guild.id);
            } else if (tagAdoptersCount > 0) {
                memoryAdopterCount.set(guild.id, tagAdoptersCount); // Update memory
            }
        }

    } catch (e) {
        console.error(`[ServerStats] Failed to fetch members for ${guild.name}:`, e.message);
    }

    const humanCount = guild.members.cache.filter(m => !m.user.bot).size;
    const createdAtUnix = Math.floor(guild.createdTimestamp / 1000);
    const boostsCount = guild.premiumSubscriptionCount || 0;

    // B. Main Stats Section with Optional Invite Button
    const statsSection = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${guild.name}\n` +
                `<:id:1468487725912166596> **ID:** \`${guild.id}\`\n` +
                `<:calendar:1470475413175144530> **Created:** <t:${createdAtUnix}:R>\n` +
                `<:server_boost:1468633171758284872> **Boosts:** ${boostsCount}\n` +
                `<:members:1468470163081924608> **Members:** ${humanCount}`
            )
        );

    // If an invite link is configured, add the button to the section
    // If not, this is skipped and the button completely disappears!
    if (config.inviteLink) {
        let inviteCode = config.inviteLink.split('/').pop() || "Link"; 
        statsSection.setButtonAccessory(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel(`.gg/${inviteCode}`)
                .setURL(config.inviteLink.startsWith('http') ? config.inviteLink : `https://${config.inviteLink}`)
        );
    }

    // C. Build Base Container
    const container = new ContainerBuilder()
        .addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder()
                        .setURL("https://cdn.discordapp.com/attachments/853503167706693632/1466977972685766851/Untitled102_20260131090625.png?ex=6a028b33&is=6a0139b3&hm=ca6a6523bed88d2ee71c620138a393f6d967295f5b492fcbc7798bdb3541507d&")
                )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Server Statistics")
        )
        .addSectionComponents(statsSection);

    // D. Add Tag Statistics if Enabled
    if (config.tagEnabled) {
        let tagStatusLine = "";
        const hasClanFeature = guild.features.includes('CLAN') || guild.features.includes('GUILD_TAGS') || guild.features.includes('MEMBER_VERIFICATION_GATE_ENABLED');
        const boostsNeeded = 3 - boostsCount;

        if (boostsNeeded > 0) {
            const s = boostsNeeded === 1 ? '' : 's';
            const sRemain = boostsNeeded === 1 ? 's' : '';
            tagStatusLine = `<:no_boost:1468470028302024776> **${boostsNeeded} Boost${s} Remain${sRemain}**`;
        } else if (!hasClanFeature && tagAdoptersCount === 0) {
            tagStatusLine = `<:no_tag:1468470099026510001> **Not Enabled**`;
        } else {
            tagStatusLine = `<:greysword:1462853724824404069> **Tag Adopters:** ${tagAdoptersCount}`;
        }

        container
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("### Server Tag")
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `<:badge:1468618581427097724> **Tag:** ${config.tagText || "None"}\n` +
                    `${tagStatusLine}`
                )
            );
    }

    // E. Add Footer (Next Update Timestamp)
    const nextUpdateUnix = Math.floor((Date.now() + 60 * 1000) / 1000);
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
// 2. DASHBOARD MASS UPDATER
// ==========================================
async function updateServerStatsPanels(client) {
    const configs = await ServerStatsConfig.find();
    
    for (const config of configs) {
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) continue;

        const channel = guild.channels.cache.get(config.channelId) || await client.channels.fetch(config.channelId).catch(() => null);
        if (!channel) continue;

        const payload = await generateServerStatsPayload(guild, config);

        try {
            let msg = null;
            if (config.messageId) {
                msg = await channel.messages.fetch(config.messageId).catch(() => null);
            }

            if (msg && msg.editable) {
                await msg.edit({ components: payload, flags: [MessageFlags.IsComponentsV2] });
            } else {
                const newMsg = await channel.send({ components: payload, flags: [MessageFlags.IsComponentsV2] });
                config.messageId = newMsg.id;
                await config.save();
            }
        } catch (err) {
            console.error(`[ServerStats] Failed to update panel in ${guild.name}`);
        }
    }
}

// ==========================================
// 3. UI BUILDERS FOR THE SETUP MENU
// ==========================================
function buildHomeMenu(config) {
    const isEnabled = !!config && !!config.channelId;
    const tagEnabled = config ? !!config.tagEnabled : false;

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("ss_sel_home")
        .setPlaceholder("Select an option...");

    selectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
            .setLabel(isEnabled ? "Disable Dashboard" : "Enable Dashboard")
            .setValue("toggle")
            .setEmoji(isEnabled ? "❌" : "✅")
    );

    if (isEnabled) {
        selectMenu.addOptions(
            new StringSelectMenuOptionBuilder().setLabel("Configure Server Stats").setValue("menu_stats").setEmoji("⚙️"),
            new StringSelectMenuOptionBuilder().setLabel("Configure Tag Stats").setValue("menu_tags").setEmoji("🏷️")
        );
    }

    return [
        new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("## Server Stats Set-up"))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Server Stats:** (${isEnabled ? '<:Yes:1297814648417943565>' : '<:No:1297814819105144862>'})\n**Server Tag Stats:** (${tagEnabled ? '<:Yes:1297814648417943565>' : '<:No:1297814819105144862>'})`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu))
    ];
}

function buildStatsMenu(config) {
    const msgStr = config.messageId ? `\`${config.messageId}\`` : "None";
    const chStr = config.channelId ? `<#${config.channelId}>` : "None";
    
    // Extract the invite code and format it as a clickable markdown link
    let invStr = "None";
    if (config.inviteLink) {
        const inviteCode = config.inviteLink.split('/').pop() || "Link";
        const validLink = config.inviteLink.startsWith('http') ? config.inviteLink : `https://${config.inviteLink}`;
        invStr = `[\`${inviteCode}\`](${validLink})`;
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("ss_sel_stats")
        .setPlaceholder("Select an action...");

    selectMenu.addOptions(
        new StringSelectMenuOptionBuilder().setLabel(config.messageId ? "Edit Message ID" : "Set Message ID").setValue("set_msg"),
        new StringSelectMenuOptionBuilder().setLabel(config.channelId ? "Edit Channel" : "Set Channel").setValue("set_ch"),
        new StringSelectMenuOptionBuilder().setLabel(config.inviteLink ? "Edit Invite Link" : "Set Invite Link").setValue("set_inv")
    );

    if (config.messageId) {
        selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel("Remove Message ID").setValue("rm_msg"));
    }
    if (config.inviteLink) {
        selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel("Remove Invite Link").setValue("rm_inv"));
    }

    selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel("Go Back Home").setValue("home").setEmoji("🏠"));

    return [
        new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("## Server Stats"))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Message ID:** ${msgStr}\n**Channel:** ${chStr}\n**Invite Link:** ${invStr}`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu))
    ];
}

function buildTagStatsMenu(config) {
    const tagStr = config.tagText ? `\`${config.tagText}\`` : "<:No:1297814819105144862>";
    const roleStr = config.tagRoleId ? `<@&${config.tagRoleId}>` : "<:No:1297814819105144862>";

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("ss_sel_tags")
        .setPlaceholder("Select an action...");

    selectMenu.addOptions(
        new StringSelectMenuOptionBuilder().setLabel(config.tagText ? "Edit Tag Text" : "Set Tag Text").setValue("set_tag"),
        new StringSelectMenuOptionBuilder().setLabel(config.tagRoleId ? "Edit Adopter Role" : "Set Adopter Role").setValue("set_role")
    );

    if (config.tagText) selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel("Remove Tag Text").setValue("rm_tag"));
    if (config.tagRoleId) selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel("Remove Adopter Role").setValue("rm_role"));

    selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel("Go Back Home").setValue("home").setEmoji("🏠"));

    return [
        new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("## Server Tag Stats"))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Server Tag:** ${tagStr}\n**Tag Adopter Role:** ${roleStr}`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu))
    ];
}

module.exports = { 
    generateServerStatsPayload, 
    updateServerStatsPanels, 
    buildHomeMenu, 
    buildStatsMenu, 
    buildTagStatsMenu 
};
