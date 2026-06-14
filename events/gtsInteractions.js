const { Events, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { GTSServer, GTSHub } = require('../src/models/GTS');
const { updateGTSDashboard } = require('../utils/gtsManager');

// --- SMART FORMATTERS ---
function formatRole(client, currentGuildId, targetGuildId, roleId) {
    if (!roleId) return "Not Setup";
    if (currentGuildId === targetGuildId) return `<@&${roleId}>`; 
    const targetGuild = client.guilds.cache.get(targetGuildId);
    const role = targetGuild?.roles.cache.get(roleId);
    return role ? `**${role.name}** (\`${roleId}\`)` : `**Unknown Role** (\`${roleId}\`)`;
}

function formatChannel(client, currentGuildId, channelId) {
    if (!channelId) return "Not Setup";
    const channel = client.channels.cache.get(channelId);
    if (channel && channel.guildId === currentGuildId) return `<#${channelId}>`; 
    return channel ? `**#${channel.name}** (\`${channelId}\`)` : `**Unknown Channel** (\`${channelId}\`)`;
}

// --- CONTAINER REBUILDERS ---
async function buildDashboardUI(client, currentGuildId) {
    const hub = await GTSHub.findOne();
    const guild = client.guilds.cache.get(hub.mainServerId);

    const defaultRoleStr = formatRole(client, currentGuildId, hub.mainServerId, hub.defaultTagRole);
    const alertChannelStr = formatChannel(client, currentGuildId, hub.alertChannelId);
    
    const hasDefaultRole = !!hub.defaultTagRole;
    const hasAlertChannel = !!hub.alertChannelId;

    const menuOptions = [new StringSelectMenuOptionBuilder().setLabel("Edit Server Stats Message").setValue("edit_msg").setEmoji("✏️")];
    
    if (!hasDefaultRole) menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Default Tag Adopters Role").setValue("set_default_role").setEmoji("⚙️"));
    else menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Edit Default Tag Adopters Role").setValue("edit_default_role").setEmoji("✏️"), new StringSelectMenuOptionBuilder().setLabel("Remove Default Tag Adopters Role").setValue("remove_default_role").setEmoji("🗑️"));

    if (!hasAlertChannel) menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Alert Channel").setValue("set_alert").setEmoji("⚙️"));
    else menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Edit Alert Channel").setValue("edit_alert").setEmoji("✏️"), new StringSelectMenuOptionBuilder().setLabel("Remove Alert Channel").setValue("remove_alert").setEmoji("🗑️"));

    return new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${guild ? guild.name : "Hub Server"}`))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `**Message ID:** \`${hub.dashboardMessageId || "None"}\`\n` +
            `**Default Tag Adopters Role:** ${defaultRoleStr}\n` +
            `**Alert Channel:** ${alertChannelStr}`
        ))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addActionRowComponents(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId("gts_hub_menu").addOptions(menuOptions)));
}

async function buildViewServerUI(client, currentGuildId, srvId) {
    const srvData = await GTSServer.findOne({ serverId: srvId });
    const guild = client.guilds.cache.get(srvId);
    const hub = await GTSHub.findOne();
    
    const mainRoleStr = formatRole(client, currentGuildId, hub?.mainServerId, srvData.mainTagRole);
    const localRoleStr = formatRole(client, currentGuildId, srvId, srvData.localTagRole);
    const mainLogStr = formatChannel(client, currentGuildId, srvData.mainLogChannel);
    const localLogStr = formatChannel(client, currentGuildId, srvData.localLogChannel);
    const greetStr = formatChannel(client, currentGuildId, srvData.greetChannel);

    const hasMainRole = !!srvData.mainTagRole; const hasMainLog = !!srvData.mainLogChannel; const hasLocalRole = !!srvData.localTagRole; const hasLocalLog = !!srvData.localLogChannel; const hasGreetChannel = !!srvData.greetChannel;

    const menuOptions = [new StringSelectMenuOptionBuilder().setLabel("Edit Invite Link").setValue("edit_invite").setEmoji("✏️"), new StringSelectMenuOptionBuilder().setLabel("Edit Server Tag Text").setValue("edit_tag").setEmoji("✏️")];
    if (!hasMainRole) menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Adopters Role (Main)").setValue("set_main_role").setEmoji("⚙️")); else menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Edit Adopters Role (Main)").setValue("edit_main_role").setEmoji("✏️"), new StringSelectMenuOptionBuilder().setLabel("Remove Adopters Role (Main)").setValue("remove_main_role").setEmoji("🗑️"));
    if (!hasMainLog) menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Log Channel (Main)").setValue("set_main_log").setEmoji("⚙️")); else menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Edit Log Channel (Main)").setValue("edit_main_log").setEmoji("✏️"), new StringSelectMenuOptionBuilder().setLabel("Remove Log Channel (Main)").setValue("remove_main_log").setEmoji("🗑️"));
    if (!hasLocalRole) menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Local Adopters Role").setValue("set_local_role").setEmoji("⚙️")); else menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Edit Local Adopters Role").setValue("edit_local_role").setEmoji("✏️"), new StringSelectMenuOptionBuilder().setLabel("Remove Local Adopters Role").setValue("remove_local_role").setEmoji("🗑️"));
    if (!hasLocalLog) menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Local Log Channel").setValue("set_local_log").setEmoji("⚙️")); else menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Edit Local Log Channel").setValue("edit_local_log").setEmoji("✏️"), new StringSelectMenuOptionBuilder().setLabel("Remove Local Log Channel").setValue("remove_local_log").setEmoji("🗑️"));
    if (!hasGreetChannel) menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Greet Channel").setValue("set_greet").setEmoji("⚙️")); else menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Edit Greet Channel").setValue("edit_greet").setEmoji("✏️"), new StringSelectMenuOptionBuilder().setLabel("Remove Greet Channel").setValue("remove_greet").setEmoji("🗑️"));

    return new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${guild ? guild.name : "Unknown Server"}`)).addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Invite Link:** \`${srvData.inviteLink || "None"}\`\n**Server Tag Text:** ${srvData.tagText || "None"}\n**Adopters Role:** ${mainRoleStr}\n**Tag Adopted/Removed Log Channel:** ${mainLogStr}\n**Local Adopters Role:** ${localRoleStr}\n**Local Log Channel:** ${localLogStr}\n**Greet Channel:** ${greetStr}`)).addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)).addActionRowComponents(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`gts_edit_menu_${srvId}`).addOptions(menuOptions)));
}

// --- MODAL UTILS ---
function getModalValue(interaction, customId) {
    try {
        const field = interaction.fields.fields.get(customId);
        if (!field) return null;
        if (field.value) return field.value; 
        if (field.values && field.values.length > 0) return field.values[0]; 
        return null;
    } catch (e) { return null; }
}

function buildSingleLabelModal(modalId, title, inputId, labelText, type = 'text') {
    const modal = new ModalBuilder().setCustomId(modalId).setTitle(title);
    const label = new LabelBuilder().setLabel(labelText);
    if (type === 'role') label.setRoleSelectMenuComponent(new RoleSelectMenuBuilder().setCustomId(inputId).setRequired(true));
    else if (type === 'channel') label.setChannelSelectMenuComponent(new ChannelSelectMenuBuilder().setCustomId(inputId).setRequired(true));
    else label.setTextInputComponent(new TextInputBuilder().setCustomId(inputId).setStyle(TextInputStyle.Short).setRequired(true));
    modal.addLabelComponents(label);
    return modal;
}

// 🌟 CROSS-SERVER UI BYPASS ENGINE
async function buildCrossServerDropdownModal(client, srvId, modalId, title, inputId, labelText, type) {
    let targetGuild = client.guilds.cache.get(srvId);
    
    if (!targetGuild) return buildSingleLabelModal(modalId, title, inputId, labelText + " (Paste ID)", 'text');

    const modal = new ModalBuilder().setCustomId(modalId).setTitle(title);
    const label = new LabelBuilder().setLabel(labelText);
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(inputId)
        .setPlaceholder(`Select a ${type} from ${targetGuild.name}...`)
        .setRequired(true);

    if (type === 'channel') {
        const channels = targetGuild.channels.cache
            .filter(c => c.isTextBased() && !c.isThread() && !c.isVoiceBased())
            .first(25); 
        
        if (channels.length === 0) return buildSingleLabelModal(modalId, title, inputId, labelText + " (Paste ID)", 'text');
        
        channels.forEach(c => {
            selectMenu.addOptions(new StringSelectMenuOptionBuilder()
                .setLabel(`${c.name.substring(0, 60)} (ID: ${c.id})`) 
                .setValue(c.id));
        });
    } else if (type === 'role') {
        const roles = targetGuild.roles.cache
            .filter(r => r.id !== targetGuild.id)
            .sort((a, b) => b.position - a.position)
            .first(25);
            
        if (roles.length === 0) return buildSingleLabelModal(modalId, title, inputId, labelText + " (Paste ID)", 'text');
        
        roles.forEach(r => {
            selectMenu.addOptions(new StringSelectMenuOptionBuilder()
                .setLabel(`${r.name.substring(0, 60)} (ID: ${r.id})`)
                .setValue(r.id));
        });
    }

    label.setStringSelectMenuComponent(selectMenu);
    modal.addLabelComponents(label);
    
    return modal;
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.customId || !interaction.customId.startsWith('gts_')) return;

        try {
            // 1. SELECT MENUS: HUB DASHBOARD
            if (interaction.isStringSelectMenu() && interaction.customId === 'gts_hub_menu') {
                const choice = interaction.values[0];

                if (choice === 'edit_msg') {
                    const modal = new ModalBuilder().setCustomId('gts_edit_hub_msg').setTitle('Edit Server Stats Message');
                    const chLabel = new LabelBuilder().setLabel("Message Channel (Optional)").setChannelSelectMenuComponent(new ChannelSelectMenuBuilder().setCustomId('channel_id').setRequired(false));
                    const msgLabel = new LabelBuilder().setLabel("New Message ID").setTextInputComponent(new TextInputBuilder().setCustomId('msg_id').setStyle(TextInputStyle.Short).setRequired(true));
                    modal.addLabelComponents(chLabel, msgLabel);
                    return interaction.showModal(modal);
                }
                
                if (choice === 'set_default_role' || choice === 'edit_default_role') return interaction.showModal(buildSingleLabelModal('gts_edit_hub_role', 'Default Adopters Role', 'role_id', 'Select Default Role', 'role'));
                if (choice === 'set_alert' || choice === 'edit_alert') return interaction.showModal(buildSingleLabelModal('gts_edit_hub_alert', 'Alert Channel', 'channel_id', 'Select Alert Channel', 'channel'));

                await interaction.deferUpdate(); 
                if (choice === 'remove_default_role') await GTSHub.findOneAndUpdate({}, { defaultTagRole: null });
                if (choice === 'remove_alert') await GTSHub.findOneAndUpdate({}, { alertChannelId: null });

                await updateGTSDashboard(client);
                const newUI = await buildDashboardUI(client, interaction.guildId);
                return interaction.editReply({ components: [newUI] });
            }

            // 2. SELECT MENUS: VIEW SERVER
            if (interaction.isStringSelectMenu() && interaction.customId.startsWith('gts_edit_menu_')) {
                const srvId = interaction.customId.split('_').pop();
                const choice = interaction.values[0];

                if (choice === 'edit_invite') return interaction.showModal(buildSingleLabelModal(`gts_edit_srv_invite_${srvId}`, 'Edit Invite Link', 'input', 'New Invite Link (URL)', 'text'));
                if (choice === 'edit_tag') return interaction.showModal(buildSingleLabelModal(`gts_edit_srv_tag_${srvId}`, 'Edit Server Tag', 'input', 'Server Tag Text', 'text'));
                if (choice === 'set_main_role' || choice === 'edit_main_role') return interaction.showModal(buildSingleLabelModal(`gts_edit_srv_mainrole_${srvId}`, 'Main Adopters Role', 'input', 'Select Role', 'role'));
                if (choice === 'set_main_log' || choice === 'edit_main_log') return interaction.showModal(buildSingleLabelModal(`gts_edit_srv_mainlog_${srvId}`, 'Main Log Channel', 'input', 'Select Channel', 'channel'));
                
                if (choice === 'set_local_role' || choice === 'edit_local_role') return interaction.showModal(await buildCrossServerDropdownModal(client, srvId, `gts_edit_srv_localrole_${srvId}`, 'Local Adopters Role', 'input', 'Select Role', 'role'));
                if (choice === 'set_local_log' || choice === 'edit_local_log') return interaction.showModal(await buildCrossServerDropdownModal(client, srvId, `gts_edit_srv_locallog_${srvId}`, 'Local Log Channel', 'input', 'Select Channel', 'channel'));
                if (choice === 'set_greet' || choice === 'edit_greet') return interaction.showModal(await buildCrossServerDropdownModal(client, srvId, `gts_edit_srv_greet_${srvId}`, 'Edit Greet Channel', 'input', 'Select Channel', 'channel'));
            }

            // 3. MODAL SUBMISSIONS
            if (interaction.isModalSubmit()) {
                await interaction.deferUpdate();
                
                // Hub Updates
                if (interaction.customId === 'gts_edit_hub_msg') {
                    const updateQuery = { dashboardMessageId: getModalValue(interaction, 'msg_id') };
                    if (getModalValue(interaction, 'channel_id')) updateQuery.dashboardChannelId = getModalValue(interaction, 'channel_id');
                    await GTSHub.findOneAndUpdate({}, updateQuery);
                }
                if (interaction.customId === 'gts_edit_hub_role') await GTSHub.findOneAndUpdate({}, { defaultTagRole: getModalValue(interaction, 'role_id') });
                if (interaction.customId === 'gts_edit_hub_alert') await GTSHub.findOneAndUpdate({}, { alertChannelId: getModalValue(interaction, 'channel_id') });

                // Server Updates
                if (interaction.customId.startsWith('gts_edit_srv_')) {
                    const parts = interaction.customId.split('_');
                    const srvId = parts.pop();
                    const editType = parts[3]; 
                    const val = getModalValue(interaction, 'input');
                    const updateQuery = {};
                    if (editType === 'invite') updateQuery.inviteLink = val;
                    if (editType === 'tag') updateQuery.tagText = val;
                    if (editType === 'mainrole') updateQuery.mainTagRole = val;
                    if (editType === 'mainlog') updateQuery.mainLogChannel = val;
                    if (editType === 'localrole') updateQuery.localTagRole = val;
                    if (editType === 'locallog') updateQuery.localLogChannel = val;
                    if (editType === 'greet') updateQuery.greetChannel = val;
                    await GTSServer.findOneAndUpdate({ serverId: srvId }, updateQuery);
                }

                await updateGTSDashboard(client);
                return;
            }

        } catch (error) {
            console.error("GTS Interaction Error:", error);
        }
    }
};
