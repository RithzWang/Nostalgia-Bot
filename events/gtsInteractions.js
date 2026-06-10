const { Events, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder, RoleSelectMenuBuilder, ChannelSelectMenuBuilder } = require('discord.js');
const { GTSServer, GTSHub } = require('../src/models/GTS');
const { updateGTSDashboard } = require('../utils/gtsManager');

// Helper to safely get modal values (Works for both Text Inputs AND Select Menus)
function getModalValue(interaction, customId) {
    try {
        const field = interaction.fields.fields.get(customId);
        if (!field) return null;
        if (field.value) return field.value; // It's a text input
        if (field.values && field.values.length > 0) return field.values[0]; // It's a select menu
        return null;
    } catch (e) {
        return null;
    }
}

// Helper to dynamically build pop-up Modals for editing single settings
function buildSingleLabelModal(modalId, title, inputId, labelText, type = 'text') {
    const modal = new ModalBuilder().setCustomId(modalId).setTitle(title);
    const label = new LabelBuilder().setLabel(labelText);
    
    if (type === 'role') {
        label.setRoleSelectMenuComponent(new RoleSelectMenuBuilder().setCustomId(inputId).setRequired(true));
    } else if (type === 'channel') {
        label.setChannelSelectMenuComponent(new ChannelSelectMenuBuilder().setCustomId(inputId).setRequired(true));
    } else {
        label.setTextInputComponent(new TextInputBuilder().setCustomId(inputId).setStyle(TextInputStyle.Short).setRequired(true));
    }
    
    modal.addLabelComponents(label);
    return modal;
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.customId || !interaction.customId.startsWith('gts_')) return;

        try {
            // ====================================================
            // 1. SELECT MENUS: HUB DASHBOARD (/gts dashboard)
            // ====================================================
            if (interaction.isStringSelectMenu() && interaction.customId === 'gts_hub_menu') {
                const choice = interaction.values[0];

                if (choice === 'edit_msg') return interaction.showModal(buildSingleLabelModal('gts_edit_hub_msg', 'Edit Stats Message ID', 'msg_id', 'New Message ID', 'text'));
                if (choice === 'set_default_role' || choice === 'edit_default_role') return interaction.showModal(buildSingleLabelModal('gts_edit_hub_role', 'Default Adopters Role', 'role_id', 'Select Default Role', 'role'));

                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                
                if (choice === 'remove_default_role') {
                    await GTSHub.findOneAndUpdate({}, { defaultTagRole: null });
                    await interaction.editReply({ content: "🗑️ Default Tag Adopters Role removed." });
                } else if (choice === 'enable_gatekeeper') {
                    await GTSHub.findOneAndUpdate({}, { joinMainRequired: true });
                    await interaction.editReply({ content: "🟢 Require to Join Main Server is now ENABLED." });
                } else if (choice === 'disable_gatekeeper') {
                    await GTSHub.findOneAndUpdate({}, { joinMainRequired: false });
                    await interaction.editReply({ content: "🔴 Require to Join Main Server is now DISABLED." });
                }
                return;
            }

            // ====================================================
            // 2. SELECT MENUS: VIEW SERVER (/gts view-server)
            // ====================================================
            if (interaction.isStringSelectMenu() && interaction.customId.startsWith('gts_edit_menu_')) {
                const srvId = interaction.customId.split('_').pop();
                const choice = interaction.values[0];

                if (choice === 'edit_invite') return interaction.showModal(buildSingleLabelModal(`gts_edit_srv_invite_${srvId}`, 'Edit Invite Link', 'input', 'New Invite Link (URL)', 'text'));
                if (choice === 'edit_tag') return interaction.showModal(buildSingleLabelModal(`gts_edit_srv_tag_${srvId}`, 'Edit Server Tag', 'input', 'Server Tag Text', 'text'));
                if (choice === 'set_main_role' || choice === 'edit_main_role') return interaction.showModal(buildSingleLabelModal(`gts_edit_srv_mainrole_${srvId}`, 'Main Adopters Role', 'input', 'Select Role', 'role'));
                if (choice === 'set_main_log' || choice === 'edit_main_log') return interaction.showModal(buildSingleLabelModal(`gts_edit_srv_mainlog_${srvId}`, 'Main Log Channel', 'input', 'Select Channel', 'channel'));
                if (choice === 'set_local_role' || choice === 'edit_local_role') return interaction.showModal(buildSingleLabelModal(`gts_edit_srv_localrole_${srvId}`, 'Local Adopters Role', 'input', 'Select Role', 'role'));
                if (choice === 'set_local_log' || choice === 'edit_local_log') return interaction.showModal(buildSingleLabelModal(`gts_edit_srv_locallog_${srvId}`, 'Local Log Channel', 'input', 'Select Channel', 'channel'));

                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                const updateQuery = {};

                if (choice === 'remove_main_role') updateQuery.mainTagRole = null;
                if (choice === 'remove_main_log') updateQuery.mainLogChannel = null;
                if (choice === 'remove_local_role') updateQuery.localTagRole = null;
                if (choice === 'remove_local_log') updateQuery.localLogChannel = null;

                if (Object.keys(updateQuery).length > 0) {
                    await GTSServer.findOneAndUpdate({ serverId: srvId }, updateQuery);
                    await interaction.editReply({ content: `🗑️ Successfully removed the requested setting for server \`${srvId}\`.` });
                    await updateGTSDashboard(client);
                }
                return;
            }

            // ====================================================
            // 3. MODAL SUBMISSIONS
            // ====================================================
            if (interaction.isModalSubmit()) {
                
                // MAIN SERVER SETUP
                if (interaction.customId.startsWith('gts_setup_modal_')) {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                    const serverId = interaction.customId.split('_').pop();
                    await GTSServer.findOneAndUpdate({ serverId: serverId }, { 
                        tagText: getModalValue(interaction, 'tag_text') || null, 
                        mainTagRole: getModalValue(interaction, 'tag_role') || null, 
                        mainLogChannel: getModalValue(interaction, 'log_channel') || null 
                    }, { upsert: true });
                    await updateGTSDashboard(client);
                    return interaction.editReply({ content: `✅ Main Server setup completed successfully!` });
                }

                // SATELLITE SERVER SETUP
                if (interaction.customId.startsWith('gts_add_modal_')) {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                    const serverId = interaction.customId.split('_').pop();
                    await GTSServer.findOneAndUpdate({ serverId: serverId }, { 
                        tagText: getModalValue(interaction, 'tag_text') || null, 
                        mainTagRole: getModalValue(interaction, 'main_tag_role') || null, 
                        mainLogChannel: getModalValue(interaction, 'main_log_channel') || null,
                        localTagRole: getModalValue(interaction, 'local_tag_role') || null,
                        localLogChannel: getModalValue(interaction, 'local_log_channel') || null
                    }, { upsert: true });
                    await updateGTSDashboard(client);
                    return interaction.editReply({ content: `✅ Satellite Server (\`${serverId}\`) added successfully!` });
                }

                // SINGLE EDITS
                if (interaction.customId === 'gts_edit_hub_msg') {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                    await GTSHub.findOneAndUpdate({}, { dashboardMessageId: getModalValue(interaction, 'msg_id') });
                    await updateGTSDashboard(client);
                    return interaction.editReply({ content: `✅ Dashboard Message ID updated!` });
                }
                if (interaction.customId === 'gts_edit_hub_role') {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                    await GTSHub.findOneAndUpdate({}, { defaultTagRole: getModalValue(interaction, 'role_id') });
                    return interaction.editReply({ content: `✅ Default Tag Adopters Role updated!` });
                }

                if (interaction.customId.startsWith('gts_edit_srv_')) {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
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

                    await GTSServer.findOneAndUpdate({ serverId: srvId }, updateQuery);
                    await updateGTSDashboard(client);
                    return interaction.editReply({ content: `✅ Successfully updated the setting for server \`${srvId}\`!` });
                }
            }

        } catch (error) {
            console.error("GTS Interaction Error:", error);
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: "❌ An error occurred processing the interaction.", flags: [MessageFlags.Ephemeral] }).catch(()=>{});
            } else {
                await interaction.reply({ content: "❌ An error occurred processing the interaction.", flags: [MessageFlags.Ephemeral] }).catch(()=>{});
            }
        }
    }
};
