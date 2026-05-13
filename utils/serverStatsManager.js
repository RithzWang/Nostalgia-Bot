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

// ==========================================
// 1. PUBLIC DASHBOARD PAYLOAD GENERATOR
// ==========================================
async function generateServerStatsPayload(guild, config) {
    let currentDetectedAdopters = new Set();
    const previousAdopters = new Set(config.tagAdopters || []);

    try {
        await guild.members.fetch();
        
        // Scan for Discord's built-in Identity Tag
        for (const [memberId, member] of guild.members.cache) {
            if (member.user.bot) continue;

            const user = member.user;
            const hasTag = user.primaryGuild && user.primaryGuild.identityEnabled && user.primaryGuild.identityGuildId === guild.id;
            
            if (hasTag) currentDetectedAdopters.add(memberId);
        }

        let dbNeedsUpdate = false;
        
        // --- QABILATAN DATABASE MEMORY PROTECTION ---
        if (currentDetectedAdopters.size === 0 && previousAdopters.size > 0) {
            // Ignore Discord API glitches if it randomly drops to 0
            currentDetectedAdopters = previousAdopters;
        } else {
            // ANTI-SPAM GUARD: If the DB is empty but we find multiple people, the admin just enabled the feature.
            // We SILENCE notifications for this first sweep to prevent mass-pinging 1,000 existing users!
            const isInitialMassSetup = (config.tagAdopters.length === 0 && currentDetectedAdopters.size > 1);

            // 1. Process NEW Adopters
            for (const memberId of currentDetectedAdopters) {
                const member = guild.members.cache.get(memberId);
                if (!member) continue;
                
                if (!previousAdopters.has(memberId)) {
                    dbNeedsUpdate = true;
                    
                    // NOTIFICATION: Hype them up! (Unless it's the silent mass setup)
                    if (!isInitialMassSetup && config.tagEnabled && config.tagNotifyChannelId) {
                        const notifyChannel = guild.channels.cache.get(config.tagNotifyChannelId) || await guild.channels.fetch(config.tagNotifyChannelId).catch(() => null);
                        if (notifyChannel) {
                            notifyChannel.send(`-# **<@${memberId}> starts adopting our server tag!**`).catch(() => {});
                        }
                    }
                    
                    // ADD ROLE
                    if (config.tagEnabled && config.tagRoleId && !member.roles.cache.has(config.tagRoleId)) {
                        await member.roles.add(config.tagRoleId).catch(() => {});
                    }
                }
            }
            
            // 2. Process REMOVED Adopters (People who took the tag off)
            for (const memberId of previousAdopters) {
                if (!currentDetectedAdopters.has(memberId)) {
                    dbNeedsUpdate = true;
                    const member = guild.members.cache.get(memberId);
                    // REMOVE ROLE
                    if (member && config.tagEnabled && config.tagRoleId && member.roles.cache.has(config.tagRoleId)) {
                        await member.roles.remove(config.tagRoleId).catch(() => {});
                    }
                }
            }
        }

        // Save the new array to the database so it survives bot restarts and menu edits
        if (dbNeedsUpdate) {
            config.tagAdopters = Array.from(currentDetectedAdopters);
            await config.save().catch(() => {});
        }

    } catch (e) {
        console.error(`[ServerStats] Failed to fetch members for ${guild.name}:`, e.message);
    }

    const tagAdoptersCount = currentDetectedAdopters.size;
    const humanCount = guild.members.cache.filter(m => !m.user.bot).size;
    const createdAtUnix = Math.floor(guild.createdTimestamp / 1000);
    const boostsCount = guild.premiumSubscriptionCount || 0;

    const mainStatsText = `### ${guild.name}\n` +
                          `<:id:1468487725912166596> **ID:** \`${guild.id}\`\n` +
                          `<:calendar:1470475413175144530> **Created:** <t:${createdAtUnix}:R>\n` +
                          `<:server_boost:1468633171758284872> **Boosts:** ${boostsCount}\n` +
                          `<:members:1468470163081924608> **Members:** ${humanCount}`;

    const container = new ContainerBuilder()
        .addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(new MediaGalleryItemBuilder().setURL("https://cdn.discordapp.com/attachments/853503167706693632/1466977972685766851/Untitled102_20260131090625.png?ex=6a028b33&is=6a0139b3&hm=ca6a6523bed88d2ee71c620138a393f6d967295f5b492fcbc7798bdb3541507d&"))
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("## Server Statistics"));

    if (config.inviteLink) {
        let inviteCode = config.inviteLink.split('/').pop() || "Link"; 
        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(mainStatsText))
                .setButtonAccessory(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setLabel(`Invite Link`)
                        .setURL(config.inviteLink.startsWith('http') ? config.inviteLink : `https://${config.inviteLink}`)
                )
        );
    } else {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(mainStatsText));
    }

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
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("### Server Tag"))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`<:badge:1468618581427097724> **Tag:** ${config.tagText || "None"}\n${tagStatusLine}`));
    }

    const nextUpdateUnix = Math.floor((Date.now() + 60 * 1000) / 1000);
    container
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# <a:loading:1447184742934909032> Next Update: <t:${nextUpdateUnix}:R>`));

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
            if (config.messageId) msg = await channel.messages.fetch(config.messageId).catch(() => null);

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

    const selectMenu = new StringSelectMenuBuilder().setCustomId("ss_sel_home").setPlaceholder("Select an option...");
    selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel(isEnabled ? "Disable Dashboard" : "Enable Dashboard").setValue("toggle").setEmoji(isEnabled ? "❌" : "✅"));

    if (isEnabled) {
        selectMenu.addOptions(
            new StringSelectMenuOptionBuilder().setLabel("Configure Server Stats").setValue("menu_stats").setEmoji("⚙️"),
            new StringSelectMenuOptionBuilder().setLabel("Configure Tag Stats").setValue("menu_tags").setEmoji("🏷️")
        );
    }

    return [
        new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("## Server Stats Set-up"))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Server Stats:** (${isEnabled ? '<:Yes:1297814648417943565>' : '<:No:1297814819105144862>'})\n**Server Tag Stats:** (${tagEnabled ? '<:Yes:1297814648417943565>' : '<:No:1297814819105144862>'})`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu))
    ];
}

function buildStatsMenu(config) {
    const msgStr = config.messageId ? `\`${config.messageId}\`` : "None";
    const chStr = config.channelId ? `<#${config.channelId}>` : "None";
    let invStr = "None";
    if (config.inviteLink) {
        const inviteCode = config.inviteLink.split('/').pop() || "Link";
        const validLink = config.inviteLink.startsWith('http') ? config.inviteLink : `https://${config.inviteLink}`;
        invStr = `[\`${inviteCode}\`](${validLink})`;
    }

    const selectMenu = new StringSelectMenuBuilder().setCustomId("ss_sel_stats").setPlaceholder("Select an action...");
    selectMenu.addOptions(
        new StringSelectMenuOptionBuilder().setLabel(config.messageId ? "Edit Message ID" : "Set Message ID").setValue("set_msg"),
        new StringSelectMenuOptionBuilder().setLabel(config.channelId ? "Edit Channel" : "Set Channel").setValue("set_ch"),
        new StringSelectMenuOptionBuilder().setLabel(config.inviteLink ? "Edit Invite Link" : "Set Invite Link").setValue("set_inv")
    );
    if (config.messageId) selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel("Remove Message ID").setValue("rm_msg"));
    if (config.inviteLink) selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel("Remove Invite Link").setValue("rm_inv"));
    selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel("Go Back Home").setValue("home"));

    return [
        new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("## Server Stats"))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Message ID:** ${msgStr}\n**Channel:** ${chStr}\n**Invite Link:** ${invStr}`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu))
    ];
}

function buildTagStatsMenu(config) {
    const tagStr = config.tagText ? `\`${config.tagText}\`` : "<:No:1297814819105144862>";
    const roleStr = config.tagRoleId ? `<@&${config.tagRoleId}>` : "<:No:1297814819105144862>";
    const notifyStr = config.tagNotifyChannelId ? `<#${config.tagNotifyChannelId}>` : "<:No:1297814819105144862>";

    const selectMenu = new StringSelectMenuBuilder().setCustomId("ss_sel_tags").setPlaceholder("Select an action...");
    selectMenu.addOptions(
        new StringSelectMenuOptionBuilder().setLabel(config.tagText ? "Edit Tag Text" : "Set Tag Text").setValue("set_tag"),
        new StringSelectMenuOptionBuilder().setLabel(config.tagNotifyChannelId ? "Edit Notify Channel" : "Set Notify Channel").setValue("set_notify"),
        new StringSelectMenuOptionBuilder().setLabel(config.tagRoleId ? "Edit Adopter Role" : "Set Adopter Role").setValue("set_role")
    );

    if (config.tagText) selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel("Remove Tag Text").setValue("rm_tag"));
    if (config.tagNotifyChannelId) selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel("Remove Notify Channel").setValue("rm_notify"));
    if (config.tagRoleId) selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel("Remove Adopter Role").setValue("rm_role"));
    selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel("Go Back Home").setValue("home"));

    return [
        new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("## Server Tag Stats"))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Server Tag:** ${tagStr}\n**Tag Adopter Role:** ${roleStr}\n**Notify Channel:** ${notifyStr}`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu))
    ];
}

module.exports = { generateServerStatsPayload, updateServerStatsPanels, buildHomeMenu, buildStatsMenu, buildTagStatsMenu };
