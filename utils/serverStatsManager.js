// --- UI BUILDERS FOR THE SETUP MENU ---
const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js'); // Ensure these are imported at the top of your file!

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
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("# Server Stats Set-up"))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Server Stats:** (${isEnabled ? '<:Yes:1297814648417943565>' : '<:No:1297814819105144862>'})\n**Server Tag Stats:** (${tagEnabled ? '<:Yes:1297814648417943565>' : '<:No:1297814819105144862>'})`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu))
    ];
}

function buildStatsMenu(config) {
    const msgStr = config.messageId ? `\`${config.messageId}\`` : "None";
    const chStr = config.channelId ? `<#${config.channelId}>` : "None";

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("ss_sel_stats")
        .setPlaceholder("Select an action...");

    selectMenu.addOptions(
        new StringSelectMenuOptionBuilder().setLabel(config.messageId ? "Edit Message ID" : "Set Message ID").setValue("set_msg"),
        new StringSelectMenuOptionBuilder().setLabel(config.channelId ? "Edit Channel" : "Set Channel").setValue("set_ch")
    );

    if (config.messageId) {
        selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel("Remove Message ID").setValue("rm_msg"));
    }

    selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel("Go Back Home").setValue("home").setEmoji("🏠"));

    return [
        new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("# Server Stats"))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Message ID:** ${msgStr}\n**Channel:** ${chStr}`))
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
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("# Server Tag Stats"))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Server Tag:** ${tagStr}\n**Tag Adopter Role:** ${roleStr}`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu))
    ];
}

module.exports = { generateServerStatsPayload, updateServerStatsPanels, buildHomeMenu, buildStatsMenu, buildTagStatsMenu };
