const { Events, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { GTSServer, GTSHub } = require('../src/models/GTS');
const { updateGTSDashboard } = require('../utils/gtsManager');

// Helper function to quickly build simple 1-question Modal forms
function buildSingleModal(modalId, title, inputId, label) {
    const modal = new ModalBuilder().setCustomId(modalId).setTitle(title);
    const input = new TextInputBuilder().setCustomId(inputId).setLabel(label).setStyle(TextInputStyle.Short).setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
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

                // --- MODAL TRIGGERS ---
                if (choice === 'edit_msg') {
                    return interaction.showModal(buildSingleModal('gts_edit_hub_msg', 'Edit Stats Message ID', 'msg_id', 'New Message ID'));
                }
                if (choice === 'set_default_role' || choice === 'edit_default_role') {
                    return interaction.showModal(buildSingleModal('gts_edit_hub_role', 'Default Adopters Role', 'role_id', 'Role ID'));
                }

                // --- INSTANT ACTIONS ---
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                
                if (choice === 'remove_default_role') {
                    await GTSHub.findOneAndUpdate({}, { defaultTagRole: null });
                    await interaction.editReply({ content: "🗑️ Default Tag Adopters Role removed." });
                } 
                else if (choice === 'enable_gatekeeper') {
                    await GTSHub.findOneAndUpdate({}, { joinMainRequired: true });
                    await interaction.editReply({ content: "🟢 Require to Join Main Server is now ENABLED." });
                } 
                else if (choice === 'disable_gatekeeper') {
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

                // --- MODAL TRIGGERS ---
                if (choice === 'edit_invite') return interaction.showModal(buildSingleModal(`gts_edit_srv_invite_${srvId}`, 'Edit Invite Link', 'input', 'New Invite Link (URL)'));
                if (choice === 'edit_tag') return interaction.showModal(buildSingleModal(`gts_edit_srv_tag_${srvId}`, 'Edit Server Tag', 'input', 'Server Tag Text'));
                if (choice === 'set_main_role' || choice === 'edit_main_role') return interaction.showModal(buildSingleModal(`gts_edit_srv_mainrole_${srvId}`, 'Main Adopters Role', 'input', 'Role ID (In Main Server)'));
                if (choice === 'set_main_log' || choice === 'edit_main_log') return interaction.showModal(buildSingleModal(`gts_edit_srv_mainlog_${srvId}`, 'Main Log Channel', 'input', 'Channel ID (In Main Server)'));
                if (choice === 'set_local_role' || choice === 'edit_local_role') return interaction.showModal(buildSingleModal(`gts_edit_srv_localrole_${srvId}`, 'Local Adopters Role', 'input', 'Role ID (In Local Server)'));
                if (choice === 'set_local_log' || choice === 'edit_local_log') return interaction.showModal(buildSingleModal(`gts_edit_srv_locallog_${srvId}`, 'Local Log Channel', 'input', 'Channel ID (In Local Server)'));

                // --- INSTANT ACTIONS ---
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
            // 3. MODAL SUBMISSIONS: INITIAL SETUPS
            // ====================================================
            if (interaction.isModalSubmit()) {
                
                // MAIN SERVER SETUP
                if (interaction.customId.startsWith('gts_setup_modal_')) {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                    const serverId = interaction.customId.split('_').pop();
                    await GTSServer.findOneAndUpdate({ serverId: serverId }, { 
                        tagText: interaction.fields.getTextInputValue('tag_text') || null, 
                        mainTagRole: interaction.fields.getTextInputValue('tag_role') || null, 
                        mainLogChannel: interaction.fields.getTextInputValue('log_channel') || null 
                    }, { upsert: true });
                    await updateGTSDashboard(client);
                    return interaction.editReply({ content: `✅ Main Server setup completed successfully!` });
                }

                // SATELLITE SERVER SETUP
                if (interaction.customId.startsWith('gts_add_modal_')) {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                    const serverId = interaction.customId.split('_').pop();
                    await GTSServer.findOneAndUpdate({ serverId: serverId }, { 
                        tagText: interaction.fields.getTextInputValue('tag_text') || null, 
                        mainTagRole: interaction.fields.getTextInputValue('main_tag_role') || null, 
                        mainLogChannel: interaction.fields.getTextInputValue('main_log_channel') || null,
                        localTagRole: interaction.fields.getTextInputValue('local_tag_role') || null,
                        localLogChannel: interaction.fields.getTextInputValue('local_log_channel') || null
                    }, { upsert: true });
                    await updateGTSDashboard(client);
                    return interaction.editReply({ content: `✅ Satellite Server (\`${serverId}\`) added successfully!` });
                }

                // ====================================================
                // 4. MODAL SUBMISSIONS: SINGLE EDITS
                // ====================================================
                
                // HUB EDITS
                if (interaction.customId === 'gts_edit_hub_msg') {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                    await GTSHub.findOneAndUpdate({}, { dashboardMessageId: interaction.fields.getTextInputValue('msg_id') });
                    await updateGTSDashboard(client);
                    return interaction.editReply({ content: `✅ Dashboard Message ID updated!` });
                }
                if (interaction.customId === 'gts_edit_hub_role') {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                    await GTSHub.findOneAndUpdate({}, { defaultTagRole: interaction.fields.getTextInputValue('role_id') });
                    return interaction.editReply({ content: `✅ Default Tag Adopters Role updated!` });
                }

                // SERVER EDITS
                if (interaction.customId.startsWith('gts_edit_srv_')) {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                    
                    const parts = interaction.customId.split('_');
                    const srvId = parts.pop();
                    const editType = parts[3]; // e.g., 'invite', 'tag', 'mainrole'
                    const inputValue = interaction.fields.getTextInputValue('input');

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
