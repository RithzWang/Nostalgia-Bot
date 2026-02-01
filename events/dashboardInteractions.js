const { 
    Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags,
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize
} = require('discord.js');
const TrackedServer = require('../src/models/TrackedServerSchema');
const { updateAllDashboards } = require('../utils/dashboardUtils');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {

        // 🎨 Helper to create a Success Container
        const createSuccessContainer = (title, content) => {
            return new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
        };

        // ===============================================
        // 1. SELECT MENU HANDLERS
        // ===============================================
        if (interaction.isStringSelectMenu()) {
            
            // A. REMOVE SERVER
            if (interaction.customId === 'dashboard_remove_server') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const guildId = interaction.values[0];
                
                const sData = await TrackedServer.findOne({ guildId });
                const name = sData ? sData.displayName : "Unknown Server";

                await TrackedServer.deleteOne({ guildId });
                await updateAllDashboards(client);
                
                const container = createSuccessContainer('🗑️ Server Removed', `**Name:** ${name}\n**ID:** \`${guildId}\`\n\nDashboards refreshed.`);
                await interaction.editReply({ content: '', components: [container] });
            }

            // B. EDIT SERVER (Populate Modal)
            if (interaction.customId === 'dashboard_edit_select') {
                const guildId = interaction.values[0];
                const sData = await TrackedServer.findOne({ guildId });
                if (!sData) return interaction.reply({ content: "❌ Not found.", flags: MessageFlags.Ephemeral });

                const modal = new ModalBuilder().setCustomId(`dashboard_edit_modal_${guildId}`).setTitle(`Edit: ${sData.displayName}`);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('edit_name').setLabel("Display Name").setStyle(TextInputStyle.Short).setValue(sData.displayName).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('edit_tag').setLabel("Tag Text").setStyle(TextInputStyle.Short).setValue(sData.tagText || '').setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('edit_role').setLabel("Tag User Role ID").setStyle(TextInputStyle.Short).setValue(sData.roleId || '').setRequired(false)),
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

                const container = createSuccessContainer('✅ Server Added', `**Name:** ${displayName}\n**Role:** ${roleId ? `<@&${roleId}>` : 'None'}\n**Status:** Dashboard updated.`);
                await interaction.editReply({ content: '', components: [container] });
            }

            // B. EDIT SERVER SUBMIT
            if (interaction.customId.startsWith('dashboard_edit_modal_')) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const guildId = interaction.customId.replace('dashboard_edit_modal_', '');
                const displayName = interaction.fields.getTextInputValue('edit_name');

                await TrackedServer.findOneAndUpdate(
                    { guildId },
                    { 
                        displayName: displayName,
                        tagText: interaction.fields.getTextInputValue('edit_tag'),
                        roleId: interaction.fields.getTextInputValue('edit_role') || null,
                        inviteLink: interaction.fields.getTextInputValue('edit_invite')
                    },
                    { new: true }
                );

                await updateAllDashboards(client);

                const container = createSuccessContainer('✅ Updates Saved', `**Server:** ${displayName}\n**Status:** Dashboard refreshed.`);
                await interaction.editReply({ content: '', components: [container] });
            }
        }
    }
};
