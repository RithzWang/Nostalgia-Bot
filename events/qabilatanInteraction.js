const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { ServerList } = require('../src/models/Qabilatan'); // ⚠️ Check this path
const { updateAllPanels } = require('../utils/qabilatanManager'); // ⚠️ Check this path

const ALLOWED_USER_ID = '837741275603009626';

module.exports = {
    name: Events.InteractionCreate, // This listens to 'interactionCreate' just like your other file
    async execute(interaction, client) {
        // 1. Filter: Ignore if it's not a Qabilatan interaction
        if (!interaction.customId || !interaction.customId.startsWith('qabilatan_')) return;

        // 2. Security: Double-check the user ID
        if (interaction.user.id !== ALLOWED_USER_ID) {
            return interaction.reply({ content: "❌ Unauthorized.", ephemeral: true });
        }

        try {
            // --- MODAL SUBMIT: ADD SERVER ---
            if (interaction.isModalSubmit() && interaction.customId === 'qabilatan_add_modal') {
                const serverId = interaction.fields.getTextInputValue('srv_id');
                const inviteLink = interaction.fields.getTextInputValue('srv_invite');
                const tagText = interaction.fields.getTextInputValue('srv_tag');
                const tagRoleID = interaction.fields.getTextInputValue('srv_role');
                const nameOverride = interaction.fields.getTextInputValue('srv_name');

                // Fetch guild name if possible
                const guildObj = client.guilds.cache.get(serverId);
                const finalName = nameOverride || (guildObj ? guildObj.name : "Unknown Server");

                await ServerList.findOneAndUpdate(
                    { serverId: serverId },
                    { serverId, inviteLink, tagText, tagRoleID, name: finalName },
                    { upsert: true }
                );

                await updateAllPanels(client);
                return interaction.reply({ content: `✅ Added **${finalName}** to the network. Updating stats...`, ephemeral: true });
            }

            // --- SELECT MENU: EDIT ---
            if (interaction.isStringSelectMenu() && interaction.customId === 'qabilatan_edit_select') {
                const selectedId = interaction.values[0];
                const serverData = await ServerList.findOne({ serverId: selectedId });
                if (!serverData) return interaction.reply({ content: "Server data not found in database.", ephemeral: true });

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

            // --- MODAL SUBMIT: EDIT SERVER ---
            if (interaction.isModalSubmit() && interaction.customId.startsWith('qabilatan_edit_modal_')) {
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
                return interaction.reply({ content: "✅ Server updated. refreshing panels...", ephemeral: true });
            }

            // --- SELECT MENU: DELETE ---
            if (interaction.isStringSelectMenu() && interaction.customId === 'qabilatan_delete_select') {
                const selectedId = interaction.values[0];
                await ServerList.deleteOne({ serverId: selectedId });
                await updateAllPanels(client);
                return interaction.reply({ content: `✅ Server removed. Stats updated.`, ephemeral: true });
            }

        } catch (error) {
            console.error("Qabilatan Interaction Error:", error);
            if (!interaction.replied) {
                await interaction.reply({ content: "❌ An error occurred processing this request.", ephemeral: true });
            }
        }
    }
};
