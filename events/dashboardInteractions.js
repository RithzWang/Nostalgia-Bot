const { 
    Events, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    MessageFlags 
} = require('discord.js');

const TrackedServer = require('../src/models/TrackedServerSchema');
const { updateAllDashboards } = require('../utils/dashboardUtils');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {

        // ===============================================
        // 1. SELECT MENU HANDLERS (Dashboard Only)
        // ===============================================
        if (interaction.isStringSelectMenu()) {
            
            // A. REMOVE SERVER
            if (interaction.customId === 'dashboard_remove_server') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const guildId = interaction.values[0];
                
                await TrackedServer.deleteOne({ guildId });
                await updateAllDashboards(client);
                
                await interaction.editReply({ content: `🗑️ **Removed Server!**\nID: \`${guildId}\`\nDashboards updated.` });
            }

            // B. EDIT SERVER (Populate Modal)
            if (interaction.customId === 'dashboard_edit_select') {
                try {
                    const guildId = interaction.values[0];
                    const serverData = await TrackedServer.findOne({ guildId });

                    if (!serverData) {
                        return interaction.reply({ content: "❌ Server data not found.", flags: MessageFlags.Ephemeral });
                    }

                    // Create Modal with Existing Data
                    const modal = new ModalBuilder().setCustomId('dashboard_edit_modal').setTitle('Edit Server Details');

                    const inputID = new TextInputBuilder()
                        .setCustomId('server_id')
                        .setLabel("Server ID (DO NOT CHANGE)") 
                        .setStyle(TextInputStyle.Short)
                        .setValue(String(serverData.guildId))
                        .setRequired(true);

                    const inputName = new TextInputBuilder().setCustomId('display_name').setLabel("Display Name").setStyle(TextInputStyle.Short).setValue(String(serverData.displayName || "")).setRequired(true);
                    const inputTag = new TextInputBuilder().setCustomId('tag_text').setLabel("Tag Text").setStyle(TextInputStyle.Short).setValue(String(serverData.tagText || "")).setRequired(false);
                    const inputRole = new TextInputBuilder().setCustomId('role_id').setLabel("Tag User Role ID").setStyle(TextInputStyle.Short).setValue(String(serverData.roleId || "")).setRequired(false);
                    const inputInvite = new TextInputBuilder().setCustomId('invite_link').setLabel("Invite Link").setStyle(TextInputStyle.Short).setValue(String(serverData.inviteLink || "")).setRequired(true);

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(inputID),
                        new ActionRowBuilder().addComponents(inputName),
                        new ActionRowBuilder().addComponents(inputTag),
                        new ActionRowBuilder().addComponents(inputRole),
                        new ActionRowBuilder().addComponents(inputInvite)
                    );

                    await interaction.showModal(modal);
                } catch (err) {
                    console.error("[Edit Select Error]", err);
                    if (!interaction.replied) await interaction.reply({ content: `❌ Error: ${err.message}`, flags: MessageFlags.Ephemeral });
                }
            }
        }

        // ===============================================
        // 2. MODAL SUBMITS (Dashboard Only)
        // ===============================================
        if (interaction.isModalSubmit()) {

            // A. ADD SERVER SUBMIT
            if (interaction.customId === 'dashboard_add_server') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const guildId = interaction.fields.getTextInputValue('server_id');
                const displayName = interaction.fields.getTextInputValue('display_name');
                const tagText = interaction.fields.getTextInputValue('tag_text');
                const roleId = interaction.fields.getTextInputValue('role_id');
                const inviteLink = interaction.fields.getTextInputValue('invite_link');

                await TrackedServer.findOneAndUpdate(
                    { guildId },
                    { 
                        displayName, 
                        tagText: tagText || null, 
                        roleId: roleId || null, 
                        inviteLink, 
                        addedBy: interaction.user.id 
                    },
                    { upsert: true, new: true }
                );

                await updateAllDashboards(client);
                await interaction.editReply({ content: `✅ **Added ${displayName}!**\nRole: ${roleId ? `<@&${roleId}>` : 'None'}\nDashboards updated.` });
            }

            // B. EDIT SERVER SUBMIT
            if (interaction.customId === 'dashboard_edit_modal') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const guildId = interaction.fields.getTextInputValue('server_id'); 
                const displayName = interaction.fields.getTextInputValue('display_name');
                const tagText = interaction.fields.getTextInputValue('tag_text');
                const roleId = interaction.fields.getTextInputValue('role_id');
                const inviteLink = interaction.fields.getTextInputValue('invite_link');

                await TrackedServer.findOneAndUpdate(
                    { guildId },
                    { 
                        displayName, 
                        tagText: tagText || null, 
                        roleId: roleId || null, 
                        inviteLink 
                    },
                    { new: true }
                );

                await updateAllDashboards(client);
                await interaction.editReply({ content: `✅ **Updated ${displayName}!**\nRole ID: ${roleId || 'None'}\nDashboards refreshed.` });
            }
        }
    }
};
