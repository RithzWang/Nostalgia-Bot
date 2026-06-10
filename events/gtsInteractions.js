const { Events, MessageFlags } = require('discord.js');
const { GTSServer, GTSHub } = require('../src/models/GTS');
const { updateGTSDashboard } = require('../utils/gtsManager');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Filter: Only handle GTS interactions
        if (!interaction.customId || !interaction.customId.startsWith('gts_')) return;

        try {
            // ====================================================
            // 1. SETUP MODAL SUBMIT (Main Server)
            // ====================================================
            if (interaction.isModalSubmit() && interaction.customId.startsWith('gts_setup_modal_')) {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

                const serverId = interaction.customId.split('_').pop();
                
                // Extract data from the form
                const tagText = interaction.fields.getTextInputValue('tag_text') || null;
                const tagRole = interaction.fields.getTextInputValue('tag_role') || null;
                const logChannel = interaction.fields.getTextInputValue('log_channel') || null;

                // Save to database
                await GTSServer.findOneAndUpdate(
                    { serverId: serverId },
                    { tagText: tagText, mainTagRole: tagRole, mainLogChannel: logChannel },
                    { upsert: true }
                );

                // Update the Dashboard immediately
                await updateGTSDashboard(client);
                
                return interaction.editReply({ content: `✅ Main Server setup completed successfully! The dashboard has been updated.` });
            }

            // ====================================================
            // 2. ADD SERVER MODAL SUBMIT (Satellite)
            // ====================================================
            if (interaction.isModalSubmit() && interaction.customId.startsWith('gts_add_modal_')) {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

                const serverId = interaction.customId.split('_').pop();
                
                // Extract data from the form
                const tagText = interaction.fields.getTextInputValue('tag_text') || null;
                const mainTagRole = interaction.fields.getTextInputValue('main_tag_role') || null;
                const mainLogChannel = interaction.fields.getTextInputValue('main_log_channel') || null;
                const localTagRole = interaction.fields.getTextInputValue('local_tag_role') || null;
                const localLogChannel = interaction.fields.getTextInputValue('local_log_channel') || null;

                // Save to database
                await GTSServer.findOneAndUpdate(
                    { serverId: serverId },
                    { 
                        tagText: tagText, 
                        mainTagRole: mainTagRole, 
                        mainLogChannel: mainLogChannel,
                        localTagRole: localTagRole,
                        localLogChannel: localLogChannel
                    },
                    { upsert: true }
                );

                // Update the Dashboard immediately
                await updateGTSDashboard(client);

                return interaction.editReply({ content: `✅ Satellite Server (\`${serverId}\`) added successfully! The dashboard has been updated.` });
            }

            // ====================================================
            // 3. EDIT MENUS (Placeholder so it doesn't error out)
            // ====================================================
            if (interaction.isStringSelectMenu() && (interaction.customId.startsWith('gts_edit_menu_') || interaction.customId === 'gts_hub_menu')) {
                return interaction.reply({ 
                    content: "⚙️ Edit menus are catching your clicks! (We will build the pop-up editors for these next).", 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

        } catch (error) {
            console.error("GTS Interaction Error:", error);
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: "❌ An error occurred processing the form.", flags: [MessageFlags.Ephemeral] }).catch(()=>{});
            } else {
                await interaction.reply({ content: "❌ An error occurred processing the form.", flags: [MessageFlags.Ephemeral] }).catch(()=>{});
            }
        }
    }
};
