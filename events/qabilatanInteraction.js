const { 
    Events, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    MessageFlags // Import MessageFlags
} = require('discord.js');
const { ServerList } = require('../src/models/Qabilatan'); 
const { updateAllPanels } = require('../utils/qabilatanManager'); 

const ALLOWED_USER_ID = '837741275603009626';

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // 1. Filter: Only handle Qabilatan interactions
        if (!interaction.customId || !interaction.customId.startsWith('qabilatan_')) return;

        // 2. Security Check
        if (interaction.user.id !== ALLOWED_USER_ID) {
            return interaction.reply({ 
                content: "❌ Unauthorized.", 
                flags: [MessageFlags.Ephemeral] // Used Flag
            });
        }

        try {
            // ====================================================
            // 1. ADD SERVER (Modal Submit)
            // ====================================================
            if (interaction.isModalSubmit() && interaction.customId === 'qabilatan_add_modal') {
                // ⏳ DEFER using Flag
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

                const serverId = interaction.fields.getTextInputValue('srv_id');
                const inviteLink = interaction.fields.getTextInputValue('srv_invite');
                const tagText = interaction.fields.getTextInputValue('srv_tag');
                const tagRoleID = interaction.fields.getTextInputValue('srv_role');
                const nameOverride = interaction.fields.getTextInputValue('srv_name');

                const guildObj = client.guilds.cache.get(serverId);
                const finalName = nameOverride || (guildObj ? guildObj.name : "Unknown Server");

                await ServerList.findOneAndUpdate(
                    { serverId: serverId },
                    { serverId, inviteLink, tagText, tagRoleID, name: finalName },
                    { upsert: true }
                );

                await updateAllPanels(client); 
                return interaction.editReply({ content: `✅ Added **${finalName}** to the network. Stats updated.` });
            }

            // ====================================================
            // 2. EDIT SERVER (Select Menu -> Show Modal)
            // ====================================================
            if (interaction.isStringSelectMenu() && interaction.customId === 'qabilatan_edit_select') {
                const selectedId = interaction.values[0];
                const serverData = await ServerList.findOne({ serverId: selectedId });
                
                if (!serverData) {
                    return interaction.reply({ 
                        content: "❌ Server data not found in DB.", 
                        flags: [MessageFlags.Ephemeral] 
                    });
                }

                // Show Modal (Cannot use ephemeral flag here, modals are always user-specific)
                const modal = new ModalBuilder()
                    .setCustomId(`qabilatan_edit_modal_${selectedId}`)
                    .setTitle(`Edit ${serverData.name ? serverData.name.substring(0, 20) : 'Server'}`);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('edit_invite').setLabel("Invite").setValue(serverData.inviteLink || "").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('edit_tag').setLabel("Tag").setValue(serverData.tagText || "").setStyle(TextInputStyle.Short).setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('edit_role').setLabel("Role ID").setValue(serverData.tagRoleID || "").setStyle(TextInputStyle.Short).setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('edit_name').setLabel("Name").setValue(serverData.name || "").setStyle(TextInputStyle.Short).setRequired(false))
                );

                return interaction.showModal(modal);
            }

            // ====================================================
            // 3. EDIT SERVER (Modal Submit)
            // ====================================================
            if (interaction.isModalSubmit() && interaction.customId.startsWith('qabilatan_edit_modal_')) {
                // ⏳ DEFER using Flag
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

                const serverId = interaction.customId.split('_').pop();
                
                await ServerList.findOneAndUpdate(
                    { serverId: serverId },
                    { 
                        inviteLink: interaction.fields.getTextInputValue('edit_invite'),
                        tagText: interaction.fields.getTextInputValue('edit_tag'),
                        tagRoleID: interaction.fields.getTextInputValue('edit_role'),
                        name: interaction.fields.getTextInputValue('edit_name')
                    }
                );

                await updateAllPanels(client);
                return interaction.editReply({ content: "✅ Server updated. Panels refreshed." });
            }

            // ====================================================
            // 4. DELETE SERVER (Select Menu)
            // ====================================================
            if (interaction.isStringSelectMenu() && interaction.customId === 'qabilatan_delete_select') {
                // ⏳ DEFER using Flag
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

                const selectedId = interaction.values[0];
                await ServerList.deleteOne({ serverId: selectedId });
                
                await updateAllPanels(client);
                return interaction.editReply({ content: `✅ Server removed. Stats updated.` });
            }

        } catch (error) {
            console.error("Qabilatan Interaction Error:", error);
            // Handle error safely
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ 
                    content: "❌ Error processing request. Check logs.", 
                    flags: [MessageFlags.Ephemeral] 
                }).catch(() => {});
            } else {
                await interaction.reply({ 
                    content: "❌ Error processing request. Check logs.", 
                    flags: [MessageFlags.Ephemeral] 
                }).catch(() => {});
            }
        }
    }
};
