const { 
    Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags 
} = require('discord.js');
const TrackedServer = require('../src/models/TrackedServerSchema');
const { updateAllDashboards } = require('../utils/dashboardUtils');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {

        // ===============================================
        // 1. SELECT MENU HANDLERS
        // ===============================================
        if (interaction.isStringSelectMenu()) {
            
            // A. REMOVE SERVER
            if (interaction.customId === 'dashboard_remove_server') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const guildId = interaction.values[0];
                await TrackedServer.deleteOne({ guildId });
                await updateAllDashboards(client);
                await interaction.editReply({ content: `🗑️ **Removed Server!**\nID: \`${guildId}\`` });
            }

            // B. EDIT SERVER (Populate Modal)
            if (interaction.customId === 'dashboard_edit_select') {
                const guildId = interaction.values[0];
                const sData = await TrackedServer.findOne({ guildId });
                if (!sData) return interaction.reply({ content: "❌ Not found.", flags: MessageFlags.Ephemeral });

                const modal = new ModalBuilder().setCustomId(`dashboard_edit_modal_${guildId}`).setTitle(`Edit: ${sData.displayName}`);

                // 🧠 COMBINE ROLES FOR DISPLAY
                // If we have both, it shows "111, 222". If only one, shows "111".
                const combinedRoles = [sData.roleId, sData.localRoleId].filter(Boolean).join(', ');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('edit_name').setLabel("Display Name").setStyle(TextInputStyle.Short).setValue(sData.displayName).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('edit_tag').setLabel("Tag Text").setStyle(TextInputStyle.Short).setValue(sData.tagText || '').setRequired(false)),
                    
                    // 👇 Show combined roles
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('edit_roles').setLabel("Roles (Main ID, Local ID)").setStyle(TextInputStyle.Short).setValue(combinedRoles).setRequired(false)),
                    
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('edit_invite').setLabel("Invite Link").setStyle(TextInputStyle.Short).setValue(sData.inviteLink || '').setRequired(true))
                );
                await interaction.showModal(modal);
            }
        }

        // ===============================================
        // 2. MODAL SUBMITS
        // ===============================================
        if (interaction.isModalSubmit()) {

            // A. ADD SERVER SUBMIT
            if (interaction.customId === 'dashboard_add_server') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const guildId = interaction.fields.getTextInputValue('server_id');
                const displayName = interaction.fields.getTextInputValue('display_name');
                const tagText = interaction.fields.getTextInputValue('tag_text');
                const inviteLink = interaction.fields.getTextInputValue('invite_link');
                
                // 🧠 PARSE ROLES (Split by comma)
                const rawRoles = interaction.fields.getTextInputValue('role_ids');
                const roleParts = rawRoles ? rawRoles.split(',').map(s => s.trim()) : [];
                const mainRoleId = roleParts[0] || null;
                const localRoleId = roleParts[1] || null;

                await TrackedServer.findOneAndUpdate(
                    { guildId },
                    { 
                        displayName, 
                        tagText: tagText || null, 
                        roleId: mainRoleId, 
                        localRoleId: localRoleId, 
                        inviteLink, 
                        addedBy: interaction.user.id 
                    },
                    { upsert: true, new: true }
                );

                await updateAllDashboards(client);
                await interaction.editReply({ 
                    content: `✅ **Added ${displayName}!**\n` +
                             `🆔 Main Role: ${mainRoleId || 'None'}\n` +
                             `🆔 Local Role: ${localRoleId || 'None'}` 
                });
            }

            // B. EDIT SERVER SUBMIT
            if (interaction.customId.startsWith('dashboard_edit_modal_')) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const guildId = interaction.customId.replace('dashboard_edit_modal_', '');

                // 🧠 PARSE ROLES (Split by comma)
                const rawRoles = interaction.fields.getTextInputValue('edit_roles');
                const roleParts = rawRoles ? rawRoles.split(',').map(s => s.trim()) : [];
                const mainRoleId = roleParts[0] || null;
                const localRoleId = roleParts[1] || null;

                await TrackedServer.findOneAndUpdate(
                    { guildId },
                    { 
                        displayName: interaction.fields.getTextInputValue('edit_name'),
                        tagText: interaction.fields.getTextInputValue('edit_tag'),
                        roleId: mainRoleId,
                        localRoleId: localRoleId,
                        inviteLink: interaction.fields.getTextInputValue('edit_invite')
                    },
                    { new: true }
                );

                await updateAllDashboards(client);
                await interaction.editReply({ content: `✅ **Updated Server!** Roles updated.` });
            }
        }
    }
};
