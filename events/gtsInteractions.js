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
    const alertChannelStr = formatChannel(client, currentGuildId, hub.alertChannelId); // ✅ Added Formatter
    
    const hasDefaultRole = !!hub.defaultTagRole;
    const hasAlertChannel = !!hub.alertChannelId; // ✅ Added Check

    const menuOptions = [new StringSelectMenuOptionBuilder().setLabel("Edit Server Stats Message").setValue("edit_msg").setEmoji("✏️")];
    
    if (!hasDefaultRole) menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Default Tag Adopters Role").setValue("set_default_role").setEmoji("⚙️"));
    else menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Edit Default Tag Adopters Role").setValue("edit_default_role").setEmoji("✏️"), new StringSelectMenuOptionBuilder().setLabel("Remove Default Tag Adopters Role").setValue("remove_default_role").setEmoji("🗑️"));

    // ✅ Added Alert Channel Menu Options
    if (!hasAlertChannel) menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Set Alert Channel").setValue("set_alert").setEmoji("⚙️"));
    else menuOptions.push(new StringSelectMenuOptionBuilder().setLabel("Edit Alert Channel").setValue("edit_alert").setEmoji("✏️"), new StringSelectMenuOptionBuilder().setLabel("Remove Alert Channel").setValue("remove_alert").setEmoji("🗑️"));

    return new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${guild ? guild.name : "Hub Server"}`))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `**Message ID:** \`${hub.dashboardMessageId || "None"}\`\n` +
            `**Default Tag Adopters Role:** ${defaultRoleStr}\n` +
            `**Alert Channel:** ${alertChannelStr}` // ✅ Rendered in Dashboard UI
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
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder
} = require('discord.js');

// --- ADDED: Loot Drops Imports (Adjust paths as needed) ---
const { GuildConfig, LootDrop, UserLootTracking } = require('../src/models/LootDropSchema'); 
const { buildLootContainer } = require('../commands/slash commands/admin/loot-drops'); 
// ---------------------------------------------------------

// List of allowed flags as an exact Array
const ALLOWED_FLAGS = [
    "🇦🇨","🇦🇩","🇦🇪","🇦🇫","🇦🇬","🇦🇮","🇦🇱","🇦🇲","🇦🇴","🇦🇶","🇦🇷","🇦🇸","🇦🇹","🇦🇺","🇦🇼","🇦🇽","🇦🇿",
    "🇧🇦","🇧🇧","🇧🇩","🇧🇪","🇧🇫","🇧🇬","🇧🇭","🇧🇮","🇧🇯","🇧🇱","🇧🇲","🇧🇳","🇧🇴","🇧🇶","🇧🇷","🇧🇸","🇧🇹","🇧🇻","🇧🇼","🇧🇾","🇧🇿",
    "🇨🇦","🇨🇨","🇨🇩","🇨🇫","🇨🇬","🇨🇭","🇨🇮","🇨🇰","🇨🇱","🇨🇲","🇨🇳","🇨🇴","🇨🇵","🇨🇷","🇨🇺","🇨🇻","🇨🇼","🇨🇽","🇨🇾","🇨🇿",
    "🇩🇪","🇩🇬","🇩🇯","🇩🇰","🇩🇲","🇩🇴","🇩🇿","🇪🇦","🇪🇨","🇪🇪","🇪🇬","🇪🇭","🇪🇷","🇪🇸","🇪🇹","🇪🇺",
    "🇫🇮","🇫🇯","🇫🇰","🇫🇲","🇫🇴","🇫🇷","🇬🇦","🇬🇧","🇬🇩","🇬🇪","🇬🇫","🇬🇬","🇬🇭","🇬🇮","🇬🇱","🇬🇲","🇬🇳","🇬🇵","🇬🇶","🇬🇷","🇬🇸","🇬🇹","🇬🇺","🇬🇼","🇬🇾",
    "🇭🇰","🇭🇲","🇭🇳","🇭🇷","🇭🇹","🇭🇺","🇮🇨","🇮🇩","🇮🇪","🇮🇲","🇮🇳","🇮🇴","🇮🇶","🇮🇷","🇮🇸","🇮🇹",
    "🇯🇪","🇯🇲","🇯🇴","🇯🇵","🇰🇪","🇰🇬","🇰🇭","🇰🇮","🇰🇲","🇰🇳","🇰🇵","🇰🇷","🇰🇼","🇰🇾","🇰🇿",
    "🇱🇦","🇱🇧","🇱🇨","🇱🇮","🇱🇰","🇱🇷","🇱🇸","🇱🇹","🇱🇺","🇱🇻","🇱🇾","🇲🇦","🇲🇨","🇲🇩","🇲🇪","🇲🇫","🇲🇬","🇲🇭","🇲🇰","🇲🇱","🇲🇲","🇲🇳","🇲🇴","🇲🇵","🇲🇶","🇲🇷","🇲🇸","🇲🇹","🇲🇺","🇲🇻","🇲🇼","🇲🇽","🇲🇾","🇲🇿",
    "🇳🇦","🇳🇨","🇳🇪","🇳🇫","🇳🇬","🇳🇮","🇳🇱","🇳🇴","🇳🇵","🇳🇷","🇳🇺","🇳🇿","🇴🇲","🇵🇦","🇵🇪","🇵🇫","🇵🇬","🇵🇭","🇵🇰","🇵🇱","🇵🇲","🇵🇳","🇵🇷","🇵🇸","🇵🇹","🇵🇼","🇵🇾",
    "🇶🇦","🇷🇪","🇷🇴","🇷🇸","🇷🇺","🇷🇼","🇸🇦","🇸🇧","🇸🇨","🇸🇩","🇸🇪","🇸🇬","🇸🇭","🇸🇮","🇸🇯","🇸🇰","🇸🇱","🇸🇲","🇸🇳","🇸🇴","🇸🇷","🇸🇸","🇸🇹","🇸🇻","🇸🇽","🇸🇾","🇸🇿",
    "🇹🇦","🇹🇨","🇹🇩","🇹🇫","🇹🇬","🇹🇭","🇹🇯","🇹🇰","🇹🇱","🇹🇲","🇹🇳","🇹🇴","🇹🇷","🇹🇹","🇹🇻","🇹🇼","🇹🇿",
    "🇺🇦","🇺🇬","🇺🇲","🇺🇳","🇺🇸","🇺🇾","🇺🇿","🇻🇦","🇻🇨","🇻🇪","🇻🇬","🇻🇮","🇻🇳","🇻🇺","🇼🇫","🇼🇸","🇽🇰","🇾🇪","🇾🇹","🇿🇦","🇿🇲","🇿🇼",
    "🏴󠁧󠁢󠁥󠁮󠁧󠁿","🏴󠁧󠁢󠁳󠁣󠁴󠁿","🏴󠁧󠁢󠁷󠁬󠁳󠁿"
];

module.exports = {
    name: Events.InteractionCreate,
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.customId || !interaction.customId.startsWith('gts_')) return;

        try {
            // ====================================================
            // 1. SELECT MENUS: HUB DASHBOARD
            // ====================================================
            if (interaction.isStringSelectMenu() && interaction.customId === 'gts_hub_menu') {
                const choice = interaction.values[0];
        // ===============================================
        // 1. SLASH COMMAND HANDLER
        // ===============================================
        if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
            const command = client.slashCommands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(error);
                const errPayload = { content: '❌ Error executing command!', flags: MessageFlags.Ephemeral };
                if (interaction.replied || interaction.deferred) await interaction.followUp(errPayload);
                else await interaction.reply(errPayload);
            }
        }

                if (choice === 'edit_msg') {
                    const modal = new ModalBuilder().setCustomId('gts_edit_hub_msg').setTitle('Edit Server Stats Message');
                    
                    const chLabel = new LabelBuilder()
                        .setLabel("Message Channel (Optional)")
                        .setChannelSelectMenuComponent(new ChannelSelectMenuBuilder().setCustomId('channel_id').setRequired(false));
                        
                    const msgLabel = new LabelBuilder()
                        .setLabel("New Message ID")
                        .setTextInputComponent(new TextInputBuilder().setCustomId('msg_id').setStyle(TextInputStyle.Short).setRequired(true));
                        
                    modal.addLabelComponents(chLabel, msgLabel);
                    return interaction.showModal(modal);
        // ===============================================
        // 2. ROLE MENUS (SELECT MENU)
        // ===============================================
        else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('role_select_')) {
            const restrictionId = interaction.customId.replace('role_select_', '');
            
            if (restrictionId !== 'public' && restrictionId !== 'menu') {
                if (!interaction.member.roles.cache.has(restrictionId)) {
                    return interaction.reply({ 
                        content: `<:no:1297814819105144862> <@&${restrictionId}> is required`, 
                        flags: MessageFlags.Ephemeral 
                    });
                }
                
                if (choice === 'set_default_role' || choice === 'edit_default_role') return interaction.showModal(buildSingleLabelModal('gts_edit_hub_role', 'Default Adopters Role', 'role_id', 'Select Default Role', 'role'));

                // ✅ Route Set/Edit Alert Channel
                if (choice === 'set_alert' || choice === 'edit_alert') return interaction.showModal(buildSingleLabelModal('gts_edit_hub_alert', 'Alert Channel', 'channel_id', 'Select Alert Channel', 'channel'));
            }

                await interaction.deferUpdate(); 
                
                if (choice === 'remove_default_role') {
                    await GTSHub.findOneAndUpdate({}, { defaultTagRole: null });
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const selectedRoleIds = interaction.values;
            const allRoleIds = interaction.component.options.map(opt => opt.value);
            const added = [];
            const removed = [];
            const failed = [];

            for (const roleId of allRoleIds) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (!role) continue; 
                if (role.position >= interaction.guild.members.me.roles.highest.position) {
                    failed.push(role.name); continue;
                }
                const hasRole = interaction.member.roles.cache.has(roleId);
                const isSelected = selectedRoleIds.includes(roleId);
                try {
                    if (isSelected && !hasRole) { await interaction.member.roles.add(role); added.push(role.name); } 
                    else if (!isSelected && hasRole) { await interaction.member.roles.remove(role); removed.push(role.name); }
                } catch (e) { failed.push(role.name); }
            }

                // ✅ Process Remove Alert Channel
                if (choice === 'remove_alert') {
                    await GTSHub.findOneAndUpdate({}, { alertChannelId: null });
                }
            let feedbackText = [];
            if (added.length > 0) feedbackText.push(`<:yes:1297814648417943565> **Added:** ${added.join(', ')}`);
            if (removed.length > 0) feedbackText.push(`<:no:1297814819105144862> **Removed:** ${removed.join(', ')}`);
            if (failed.length > 0) feedbackText.push(`⚠️ **Failed:** ${failed.join(', ')}`);
            if (feedbackText.length === 0) feedbackText.push('No changes made.');

                await updateGTSDashboard(client);
                const newUI = await buildDashboardUI(client, interaction.guildId);
                await interaction.editReply({ components: [newUI] });
                return;
            }
            return interaction.editReply({ content: feedbackText.join('\n') });
        }

            // ====================================================
            // 2. SELECT MENUS: VIEW SERVER
            // ====================================================
            if (interaction.isStringSelectMenu() && interaction.customId.startsWith('gts_edit_menu_')) {
                const srvId = interaction.customId.split('_').pop();
                const choice = interaction.values[0];

                if (choice === 'edit_invite') return interaction.showModal(buildSingleLabelModal(`gts_edit_srv_invite_${srvId}`, 'Edit Invite Link', 'input', 'New Invite Link (URL)', 'text'));
                if (choice === 'edit_tag') return interaction.showModal(buildSingleLabelModal(`gts_edit_srv_tag_${srvId}`, 'Edit Server Tag', 'input', 'Server Tag Text', 'text'));
                if (choice === 'set_main_role' || choice === 'edit_main_role') return interaction.showModal(buildSingleLabelModal(`gts_edit_srv_mainrole_${srvId}`, 'Main Adopters Role', 'input', 'Select Role', 'role'));
                if (choice === 'set_main_log' || choice === 'edit_main_log') return interaction.showModal(buildSingleLabelModal(`gts_edit_srv_mainlog_${srvId}`, 'Main Log Channel', 'input', 'Select Channel', 'channel'));
                
                if (choice === 'set_local_role' || choice === 'edit_local_role') {
                    const modal = await buildCrossServerDropdownModal(client, srvId, `gts_edit_srv_localrole_${srvId}`, 'Local Adopters Role', 'input', 'Select Role', 'role');
                    return interaction.showModal(modal);
                }
                if (choice === 'set_local_log' || choice === 'edit_local_log') {
                    const modal = await buildCrossServerDropdownModal(client, srvId, `gts_edit_srv_locallog_${srvId}`, 'Local Log Channel', 'input', 'Select Channel', 'channel');
                    return interaction.showModal(modal);
        // ===============================================
        // 3. ROLE BUTTONS
        // ===============================================
        else if (interaction.isButton()) {

            // --- A. LEGACY ROLE BUTTONS (role_ID_MODE) ---
            if (interaction.customId.startsWith('role_')) {
                const parts = interaction.customId.split('_');
                const roleId = parts[1];
                const mode = parts[2] || '0';
                const role = interaction.guild.roles.cache.get(roleId);

                if (!role) return interaction.reply({ content: '<:no:1297814819105144862> Role not found.', flags: MessageFlags.Ephemeral });

                const hasRole = interaction.member.roles.cache.has(roleId);
                try {
                    if (mode === '1') {
                        if (hasRole) return interaction.reply({ content: `<:no:1297814819105144862> Already verified.`, flags: MessageFlags.Ephemeral });
                        await interaction.member.roles.add(role);
                        return interaction.reply({ content: `<:yes:1297814648417943565> **Verified as** ${role.name}.`, flags: MessageFlags.Ephemeral });
                    } else {
                        if (hasRole) {
                            await interaction.member.roles.remove(role);
                            return interaction.reply({ content: `<:no:1297814819105144862> **Removed** ${role.name}.`, flags: MessageFlags.Ephemeral });
                        } else {
                            await interaction.member.roles.add(role);
                            return interaction.reply({ content: `<:yes:1297814648417943565> **Added** ${role.name}.`, flags: MessageFlags.Ephemeral });
                        }
                    }
                } catch (e) {
                    return interaction.reply({ content: "❌ I cannot manage this role.", flags: MessageFlags.Ephemeral });
                }
                if (choice === 'set_greet' || choice === 'edit_greet') {
                    const modal = await buildCrossServerDropdownModal(client, srvId, `gts_edit_srv_greet_${srvId}`, 'Edit Greet Channel', 'input', 'Select Channel', 'channel');
                    return interaction.showModal(modal);
            }

            // --- B. STANDARD & RESTRICTED ROLE BUTTONS ---
            const isStdMulti = interaction.customId.startsWith('btn_role_');
            const isStdSingle = interaction.customId.startsWith('btn_single_');
            const isRestrictedMulti = interaction.customId.startsWith('btn_r_');
            const isRestrictedSingle = interaction.customId.startsWith('btn_rs_');

            if (isStdMulti || isStdSingle || isRestrictedMulti || isRestrictedSingle) {
                let roleId, reqRoleId;
                let isSingleMode = false;

                if (isStdMulti) roleId = interaction.customId.replace('btn_role_', '');
                else if (isStdSingle) { roleId = interaction.customId.replace('btn_single_', ''); isSingleMode = true; }
                else if (isRestrictedMulti) { const p = interaction.customId.split('_'); reqRoleId = p[2]; roleId = p[3]; }
                else if (isRestrictedSingle) { const p = interaction.customId.split('_'); reqRoleId = p[2]; roleId = p[3]; isSingleMode = true; }

                if (reqRoleId && !interaction.member.roles.cache.has(reqRoleId)) {
                    return interaction.reply({ 
                        content: `<:no:1297814819105144862> <@&${reqRoleId}> is required`, 
                        flags: MessageFlags.Ephemeral 
                    });
                }

                await interaction.deferUpdate();
                const updateQuery = {};
                const role = interaction.guild.roles.cache.get(roleId);
                if (!role || role.position >= interaction.guild.members.me.roles.highest.position) {
                    return interaction.reply({ content: '<:no:1297814819105144862> Invalid role configuration.', flags: MessageFlags.Ephemeral });
                }

                if (choice === 'remove_main_role') updateQuery.mainTagRole = null;
                if (choice === 'remove_main_log') updateQuery.mainLogChannel = null;
                if (choice === 'remove_local_role') updateQuery.localTagRole = null;
                if (choice === 'remove_local_log') updateQuery.localLogChannel = null;
                if (choice === 'remove_greet') updateQuery.greetChannel = null; 
                try {
                    if (isSingleMode) {
                        if (interaction.member.roles.cache.has(roleId)) {
                            await interaction.member.roles.remove(role);
                            return interaction.reply({ content: `<:no:1297814819105144862> **Removed:** ${role.name}`, flags: MessageFlags.Ephemeral });
                        }
                        const rolesToRemove = [];
                        const removedNames = [];
                        const container = interaction.message.components[0];
                        if (container) {
                            container.components.forEach(row => {
                                if (row.type === 1) row.components.forEach(btn => {
                                    if (!btn.customId) return;
                                    let otherId = null;
                                    if (btn.customId.startsWith('btn_single_')) otherId = btn.customId.replace('btn_single_', '');
                                    else if (btn.customId.startsWith('btn_rs_')) otherId = btn.customId.split('_')[3];
                                    if (otherId && otherId !== roleId && interaction.member.roles.cache.has(otherId)) rolesToRemove.push(otherId);
                                });
                            });
                        }
                        for (const rID of rolesToRemove) {
                            const r = interaction.guild.roles.cache.get(rID);
                            if (r) { await interaction.member.roles.remove(rID).catch(() => {}); removedNames.push(r.name); }
                        }
                        await interaction.member.roles.add(role);
                        let msg = `<:yes:1297814648417943565> **Added:** ${role.name}`;
                        if (removedNames.length > 0) msg += `\n<:no:1297814819105144862> **Removed:** ${removedNames.join(', ')}`;
                        return interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });

                    } else {
                        if (interaction.member.roles.cache.has(roleId)) {
                            await interaction.member.roles.remove(role);
                            return interaction.reply({ content: `<:no:1297814819105144862> **Removed:** ${role.name}`, flags: MessageFlags.Ephemeral });
                        } else {
                            await interaction.member.roles.add(role);
                            return interaction.reply({ content: `<:yes:1297814648417943565> **Added:** ${role.name}`, flags: MessageFlags.Ephemeral });
                        }
                    }
                } catch (e) {
                    console.error(e);
                    return interaction.reply({ content: "Error changing roles.", flags: MessageFlags.Ephemeral });
                }
            }

                if (Object.keys(updateQuery).length > 0) {
                    await GTSServer.findOneAndUpdate({ serverId: srvId }, updateQuery);
                    await updateGTSDashboard(client);
                    const newUI = await buildViewServerUI(client, interaction.guildId, srvId);
                    await interaction.editReply({ components: [newUI] });
            // ===============================================
            // 4. REGISTRATION (PART 1: BUTTON)
            // ===============================================
            if (interaction.customId === 'reg_btn_open') {
                const REGISTERED_ROLE_ID = '1456197055117787136';
                if (interaction.member.roles.cache.has(REGISTERED_ROLE_ID)) {
                    return interaction.reply({ content: `<:no:1297814819105144862> You are already registered!`, flags: MessageFlags.Ephemeral });
                }
                return;
                const modal = new ModalBuilder().setCustomId('reg_modal_submit').setTitle('Registration');
                const nameInput = new TextInputBuilder().setCustomId('reg_name').setLabel("Name").setStyle(TextInputStyle.Short).setPlaceholder("e.g. Naif, PrimeQahtani").setMaxLength(20).setRequired(true);
                const countryInput = new TextInputBuilder().setCustomId('reg_country').setLabel("Country Flag").setStyle(TextInputStyle.Short).setPlaceholder("e.g. 🇵🇸, 🏴󠁧󠁢󠁥󠁮󠁧󠁿").setMaxLength(10).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(nameInput), new ActionRowBuilder().addComponents(countryInput));
                await interaction.showModal(modal);
            }

            // ====================================================
            // 3. MODAL SUBMISSIONS
            // ====================================================
            if (interaction.isModalSubmit()) {
                
                if (interaction.customId.startsWith('gts_setup_modal_')) {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                    const serverId = interaction.customId.split('_').pop();
                    await GTSServer.findOneAndUpdate({ serverId: serverId }, { tagText: getModalValue(interaction, 'tag_text') || null, mainTagRole: getModalValue(interaction, 'tag_role') || null, mainLogChannel: getModalValue(interaction, 'log_channel') || null }, { upsert: true });
                    await updateGTSDashboard(client);
                    return interaction.editReply({ content: `✅ Main Server setup completed successfully!` });
            // ===============================================
            // 5. LOOT DROPS (CLAIM BUTTON)
            // ===============================================
            if (interaction.customId === '536bd0f667bc4218861e4760b5fff9cd') {
                const messageId = interaction.message.id;
                const drop = await LootDrop.findOne({ messageId });

                if (!drop) return interaction.reply({ content: `<:no:1297814819105144862> This loot drop is invalid or missing from the database.`, flags: MessageFlags.Ephemeral });

                if (drop.status === 'closed' || (drop.expireTime && Date.now() > drop.expireTime)) {
                    if (drop.status !== 'closed') {
                        drop.status = 'closed';
                        await drop.save();
                        const components = buildLootContainer(drop.type, drop);
                        await interaction.message.edit({ components, flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
                    }
                    return interaction.reply({ content: `<:no:1297814819105144862> This loot drop is no longer available.`, flags: MessageFlags.Ephemeral });
                }

                if (interaction.customId.startsWith('gts_add_modal_')) {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                    const serverId = interaction.customId.split('_').pop();
                    await GTSServer.findOneAndUpdate({ serverId: serverId }, { tagText: getModalValue(interaction, 'tag_text') || null, mainTagRole: getModalValue(interaction, 'main_tag_role') || null, mainLogChannel: getModalValue(interaction, 'main_log_channel') || null, localTagRole: getModalValue(interaction, 'local_tag_role') || null, localLogChannel: getModalValue(interaction, 'local_log_channel') || null }, { upsert: true });
                    await updateGTSDashboard(client);
                    return interaction.editReply({ content: `✅ Satellite Server (\`${serverId}\`) added successfully!` });
                if (drop.claimedUsers.includes(interaction.user.id)) {
                    return interaction.reply({ content: `### <:no:1297814819105144862> You’ve already claimed this loot drop!\nEach user can only claim this loot once.`, flags: MessageFlags.Ephemeral });
                }

                if (interaction.customId === 'gts_edit_hub_msg') {
                    await interaction.deferUpdate();
                    const newChannelId = getModalValue(interaction, 'channel_id');
                    const newMsgId = getModalValue(interaction, 'msg_id');
                    
                    const updateQuery = { dashboardMessageId: newMsgId };
                if (drop.specialRole && !interaction.member.roles.cache.has(drop.specialRole)) {
                    return interaction.reply({ content: `### <:no:1297814819105144862> You’re not eligible to claim this loot drop!\nOnly users with <@&${drop.specialRole}> can claim this loot drop.`, flags: MessageFlags.Ephemeral });
                }

                const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
                let userTracking = null;
                let logicalDate = null;
                
                if (drop.type === 'link' && config && config.dailyClaimLimit > 0) {
                    logicalDate = new Date(Date.now() + 3600000).toISOString().split('T')[0];
                    userTracking = await UserLootTracking.findOne({ userId: interaction.user.id });

                    if (newChannelId) {
                        updateQuery.dashboardChannelId = newChannelId;
                    if (userTracking && userTracking.lastLinkClaimDate === logicalDate) {
                        if (userTracking.claimsToday >= config.dailyClaimLimit) {
                            return interaction.reply({ content: `### <:no:1297814819105144862> You've reached today's claim limit!\nEach user can only claim ${config.dailyClaimLimit} prize(s) per day.`, flags: MessageFlags.Ephemeral });
                        }
                    }
                    
                    await GTSHub.findOneAndUpdate({}, updateQuery);
                    
                    await updateGTSDashboard(client);
                    const newUI = await buildDashboardUI(client, interaction.guildId);
                    await interaction.editReply({ components: [newUI] });
                    return;
                }

                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                try {
                    if (drop.type === 'link') {
                        const prizeLink = drop.prizes[drop.claimedCount];
                        drop.claimedCount++;
                        drop.claimedUsers.push(interaction.user.id);
                        if (drop.claimedCount >= drop.maxAmount) drop.status = 'closed';
                        await drop.save();

                        if (config && config.dailyClaimLimit > 0) {
                            if (!userTracking) {
                                await UserLootTracking.create({ userId: interaction.user.id, lastLinkClaimDate: logicalDate, claimsToday: 1 });
                            } else {
                                if (userTracking.lastLinkClaimDate !== logicalDate) {
                                    userTracking.lastLinkClaimDate = logicalDate;
                                    userTracking.claimsToday = 1; 
                                } else {
                                    userTracking.claimsToday += 1; 
                                }
                                await userTracking.save();
                            }
                        }

                        const components = buildLootContainer(drop.type, drop);
                        await interaction.message.edit({ components, flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });

                        return interaction.editReply({ content: `## 🎉 Loot Claimed\n\nHere’s your **${drop.lootName}**:\n||${prizeLink}||`, allowedMentions: { parse: [] } });
                    }

                    if (drop.type === 'role') {
                        await interaction.member.roles.add(drop.rolePrizeId).catch(() => null);
                        drop.claimedCount++;
                        drop.claimedUsers.push(interaction.user.id);
                        if (drop.maxAmount && drop.claimedCount >= drop.maxAmount) drop.status = 'closed';
                        await drop.save();

                        const components = buildLootContainer(drop.type, drop);
                        await interaction.message.edit({ components, flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });

                        return interaction.editReply({ content: `## 🎉 Loot Claimed\n\n<@&${drop.rolePrizeId}> role is now added to your profile!`, allowedMentions: { parse: [] } });
                    }
                } catch (error) {
                    console.error(error);
                    return interaction.editReply(`<:no:1297814819105144862> An error occurred processing your claim.`);
                }
            }

            // ===============================================
            // 6. LOOT DROPS (VIEW REMAINING PRIZES BUTTON)
            // ===============================================
            if (interaction.customId === '26d2457488434623f04d00ddcb327a48') {
                // Security Check: Only specific users can view the leftover links
                const allowedUsers = ['837741275603009626', '1469705529306910753'];

                if (interaction.customId === 'gts_edit_hub_role') {
                    await interaction.deferUpdate();
                    await GTSHub.findOneAndUpdate({}, { defaultTagRole: getModalValue(interaction, 'role_id') });
                    await updateGTSDashboard(client);
                    const newUI = await buildDashboardUI(client, interaction.guildId);
                    await interaction.editReply({ components: [newUI] });
                    return;
                if (!allowedUsers.includes(interaction.user.id)) {
                    return interaction.reply({ 
                        content: `<:no:1297814819105144862> You do not have permission to view the remaining unclaimed links.`, 
                        flags: MessageFlags.Ephemeral 
                    });
                }

                // ✅ Handle Alert Channel Modal Save
                if (interaction.customId === 'gts_edit_hub_alert') {
                    await interaction.deferUpdate();
                    await GTSHub.findOneAndUpdate({}, { alertChannelId: getModalValue(interaction, 'channel_id') });
                    const newUI = await buildDashboardUI(client, interaction.guildId);
                    await interaction.editReply({ components: [newUI] });
                    return;
                const messageId = interaction.message.id;
                const drop = await LootDrop.findOne({ messageId });

                if (!drop || drop.type !== 'link') {
                    return interaction.reply({ content: `<:no:1297814819105144862> This loot drop is invalid.`, flags: MessageFlags.Ephemeral });
                }

                if (interaction.customId.startsWith('gts_edit_srv_')) {
                    await interaction.deferUpdate();
                    const parts = interaction.customId.split('_');
                    const srvId = parts.pop();
                    const editType = parts[3]; 
                    const inputValue = getModalValue(interaction, 'input');

                    const updateQuery = {};
                    if (editType === 'invite') updateQuery.inviteLink = inputValue;
                    if (editType === 'tag') updateQuery.tagText = inputValue;
                    if (editType === 'mainrole') updateQuery.mainTagRole = inputValue;
                    if (editType === 'mainlog') updateQuery.mainLogChannel = inputValue;
                    if (editType === 'localrole') updateQuery.localTagRole = inputValue;
                    if (editType === 'locallog') updateQuery.localLogChannel = inputValue;
                    if (editType === 'greet') updateQuery.greetChannel = inputValue;

                    await GTSServer.findOneAndUpdate({ serverId: srvId }, updateQuery);
                    await updateGTSDashboard(client);
                    
                    const newUI = await buildViewServerUI(client, interaction.guildId, srvId);
                    await interaction.editReply({ components: [newUI] });
                    return;
                if (drop.claimedCount >= drop.maxAmount) {
                    return interaction.reply({ content: `<:no:1297814819105144862> All prizes have been claimed!`, flags: MessageFlags.Ephemeral });
                }

                const remainingPrizes = drop.prizes.slice(drop.claimedCount);
                const prizeList = remainingPrizes.map((p, i) => `**${i + 1}.** ||${p}||`).join('\n');

                return interaction.reply({ 
                    content: `### 💰 Remaining Prizes for **${drop.lootName}**\n${prizeList}`, 
                    flags: MessageFlags.Ephemeral,
                    allowedMentions: { parse: [] }
                });
            }
        }

        // ===============================================
        // 7. REGISTRATION (MODAL SUBMIT)
        // ===============================================
        else if (interaction.isModalSubmit() && interaction.customId === 'reg_modal_submit') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const name = interaction.fields.getTextInputValue('reg_name');
            const countryInput = interaction.fields.getTextInputValue('reg_country').trim();

            if (!ALLOWED_FLAGS.includes(countryInput)) {
                return interaction.editReply({ 
                    content: `<:no:1297814819105144862> Please fill **Country Flag** with a valid country flag emoji only.` 
                });
            }

        } catch (error) {
            console.error("GTS Interaction Error:", error);
            const REGISTERED_ROLE_ID = '1456197055117787136';
            const UNVERIFIED_ROLE_ID = '1456238105345527932'; 
            const LOG_CHANNEL_ID = '1456197056988319871';

            const newNickname = `${countryInput} | ${name}`;
            const member = interaction.member;

            if (newNickname.length > 32) return interaction.editReply({ content: `<:no:1297814819105144862> Nickname too long (Max 32 chars).` });

            try {
                await member.roles.add(REGISTERED_ROLE_ID);
                if (member.roles.cache.has(UNVERIFIED_ROLE_ID)) {
                    await member.roles.remove(UNVERIFIED_ROLE_ID).catch(err => console.error("Could not remove Visitor role:", err));
                }
                
                if (member.id !== interaction.guild.ownerId && member.roles.highest.position < interaction.guild.members.me.roles.highest.position) {
                    await member.setNickname(newNickname).catch(() => {});
                } 

                const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
                if (logChannel) {
                    const now = new Date();
                    const timeString = now.toLocaleString('en-GB', { 
                        timeZone: 'Asia/Bangkok', 
                        year: 'numeric', month: '2-digit', day: '2-digit', 
                        hour: '2-digit', minute: '2-digit' 
                    });

                    const logContainer = new ContainerBuilder()
                        .setAccentColor(8947848) 
                        .addSectionComponents(
                            new SectionBuilder()
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ size: 128 }))
                                )
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent("## New Registration"),
                                    new TextDisplayBuilder().setContent(`${member} \`(${member.user.username})\`\n**ID:** \`${member.id}\`\n**Name:** ${name}\n**Country:** ${countryInput}`),
                                ),
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`-# ⏱️ ${timeString} (GMT+7)`),
                        );

                    await logChannel.send({ 
                        components: [logContainer], 
                        flags: MessageFlags.IsComponentsV2,
                        allowedMentions: { parse: [] } 
                    });
                }
                
                try {
                    const dashboardMsg = interaction.message; 
                    if (dashboardMsg) {
                        const role = interaction.guild.roles.cache.get(REGISTERED_ROLE_ID);
                        const newCount = role ? role.members.size : 'N/A';
                        const newContainer = new ContainerBuilder();
                        newContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent('# » Registration'));
                        newContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(`To access chat and connect to voice channels, please register below.\n\n**Note:**\n\`Name\` : your desired name.\n\`Country Flag\` : your country’s flag emoji.`));
                        newContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false));
                        const registerBtn = new ButtonBuilder().setCustomId('reg_btn_open').setLabel('Register').setStyle(ButtonStyle.Primary);
                        const countBtn = new ButtonBuilder().setCustomId('reg_btn_stats').setLabel(`Total Registered: ${newCount}`).setStyle(ButtonStyle.Secondary).setDisabled(true);
                        newContainer.addActionRowComponents(new ActionRowBuilder().addComponents(registerBtn, countBtn));
                        await dashboardMsg.edit({ components: [newContainer], flags: MessageFlags.IsComponentsV2 });
                    }
                } catch (e) { console.error("Counter update failed", e); }

                return interaction.editReply({ content: `<:yes:1297814648417943565> Welcome! You’re now a member of the server.` });

            } catch (error) {
                console.error(error);
                return interaction.editReply({ content: `<:no:1297814819105144862> Something went wrong.` });
            }
        }
    }
};