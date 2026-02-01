const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const TrackedServer = require('../src/models/TrackedServerSchema');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {

        // ===============================================
        // 📝 HANDLE MODAL SUBMITS (ADD & EDIT)
        // ===============================================
        if (interaction.isModalSubmit()) {
            
            // ✅ A. NEW SERVER SUBMIT
            if (interaction.customId === 'dashboard_add_server') {
                const sId = interaction.fields.getTextInputValue('server_id');
                const sName = interaction.fields.getTextInputValue('display_name');
                const sTag = interaction.fields.getTextInputValue('tag_text');
                const sRole = interaction.fields.getTextInputValue('role_id'); // 👈 Gets the ID you pasted
                const sInvite = interaction.fields.getTextInputValue('invite_link');

                try {
                    await TrackedServer.findOneAndUpdate(
                        { guildId: sId },
                        {
                            guildId: sId,
                            displayName: sName,
                            tagText: sTag || null,
                            roleId: sRole || null, // 👈 Saves to Database
                            inviteLink: sInvite
                        },
                        { upsert: true, new: true, setDefaultsOnInsert: true }
                    );

                    await interaction.reply({ 
                        content: `✅ **Server Added!**\n**Name:** ${sName}\n**Tag Role:** ${sRole ? `<@&${sRole}>` : 'None'}`, 
                        ephemeral: true 
                    });

                } catch (e) {
                    await interaction.reply({ content: `❌ Database Error: ${e.message}`, ephemeral: true });
                }
            }

            // ✅ B. EDIT SERVER SUBMIT (Existing Logic)
            if (interaction.customId.startsWith('dashboard_edit_modal_')) {
                const targetGuildId = interaction.customId.replace('dashboard_edit_modal_', '');
                
                await TrackedServer.findOneAndUpdate(
                    { guildId: targetGuildId },
                    { 
                        displayName: interaction.fields.getTextInputValue('edit_name'),
                        inviteLink: interaction.fields.getTextInputValue('edit_invite'),
                        tagText: interaction.fields.getTextInputValue('edit_tag'),
                        roleId: interaction.fields.getTextInputValue('edit_role') || null
                    }
                );
                await interaction.reply({ content: `✅ **Changes Saved!**`, ephemeral: true });
            }
        }

        // ===============================================
        // 🔽 HANDLE SELECT MENUS (EDIT / REMOVE)
        // ===============================================
        if (interaction.isStringSelectMenu()) {
            
            // REMOVE
            if (interaction.customId === 'dashboard_remove_server') {
                await TrackedServer.findOneAndDelete({ guildId: interaction.values[0] });
                await interaction.reply({ content: "🗑️ **Server Removed.**", ephemeral: true });
            }

            // EDIT (Populate Modal)
            if (interaction.customId === 'dashboard_edit_select') {
                const sData = await TrackedServer.findOne({ guildId: interaction.values[0] });
                if (!sData) return interaction.reply({ content: "❌ Not found.", ephemeral: true });

                const modal = new ModalBuilder()
                    .setCustomId(`dashboard_edit_modal_${sData.guildId}`)
                    .setTitle(`Edit: ${sData.displayName}`);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('edit_name').setLabel("Name").setStyle(TextInputStyle.Short).setValue(sData.displayName).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('edit_tag').setLabel("Tag").setStyle(TextInputStyle.Short).setValue(sData.tagText || '').setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('edit_role').setLabel("Tag User Role ID").setStyle(TextInputStyle.Short).setValue(sData.roleId || '').setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('edit_invite').setLabel("Invite").setStyle(TextInputStyle.Short).setValue(sData.inviteLink || '').setRequired(true))
                );
                await interaction.showModal(modal);
            }
        }
    }
};
