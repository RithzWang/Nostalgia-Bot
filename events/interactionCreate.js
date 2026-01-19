const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, 
    ModalBuilder, TextInputBuilder, TextInputStyle,
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize
} = require('discord.js');

const TrackedServer = require('../src/models/TrackedServerSchema');
const { updateAllDashboards } = require('../utils/dashboardUtils');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {

        // ===============================================
        // 1. AUTOCOMPLETE HANDLER (🆕 NEW)
        // ===============================================
        if (interaction.isAutocomplete()) {
            const command = interaction.commandName;
            const focusedValue = interaction.options.getFocused();

            if (command === 'servers-dashboard') {
                // Fetch all servers
                const servers = await TrackedServer.find();
                
                // Filter matches based on what user is typing
                const filtered = servers.filter(s => 
                    s.displayName.toLowerCase().includes(focusedValue.toLowerCase()) || 
                    s.guildId.includes(focusedValue)
                );

                // Map to Discord Choice structure (Max 25)
                await interaction.respond(
                    filtered.slice(0, 25).map(s => ({ name: s.displayName, value: s.guildId }))
                );
            }
            return; // Stop here for autocomplete
        }

        // ===============================================
        // 2. COMMAND HANDLER
        // ===============================================
        if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
            const command = client.slashCommands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(error);
            }
        }

        // ===============================================
        // 3. BUTTON HANDLERS
        // ===============================================
        if (interaction.isButton()) {
            // ... (Copy your existing Button logic here: role_*, btn_role_*, reg_btn_open) ...
            
            // [EXISTING CODE PLACEHOLDER - NO CHANGES NEEDED TO BUTTONS]
            if (interaction.customId === 'reg_btn_open') {
                const modal = new ModalBuilder().setCustomId('reg_modal_submit').setTitle('A2-Q Registration');
                const nameInput = new TextInputBuilder().setCustomId('reg_name').setLabel("Name").setStyle(TextInputStyle.Short).setRequired(true);
                const countryInput = new TextInputBuilder().setCustomId('reg_country').setLabel("Country Flag").setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(nameInput), new ActionRowBuilder().addComponents(countryInput));
                await interaction.showModal(modal);
            }
        }

        // ===============================================
        // 4. SELECT MENUS
        // ===============================================
        if (interaction.isStringSelectMenu()) {
            
            // ... (Copy your existing Role Select logic: role_select_*) ...

            // B. DASHBOARD REMOVE SERVER
            if (interaction.customId === 'dashboard_remove_server') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const guildId = interaction.values[0];
                await TrackedServer.deleteOne({ guildId });
                await interaction.editReply({ 
                    content: `✅ **Removed Server!**\nID: \`${guildId}\`\nUpdate pending...`, 
                    components: [] 
                });
            }
        }

        // ===============================================
        // 5. MODAL SUBMITS
        // ===============================================
        if (interaction.isModalSubmit()) {

            // A. REGISTRATION (Existing)
            if (interaction.customId === 'reg_modal_submit') {
                // ... (Copy your existing registration logic) ...
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                interaction.editReply({ content: "Registration Submitted!" }); // Placeholder
            }

            // B. DASHBOARD ADD SERVER
            if (interaction.customId === 'dashboard_add_server') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const guildId = interaction.fields.getTextInputValue('server_id');
                const displayName = interaction.fields.getTextInputValue('display_name');
                const tagText = interaction.fields.getTextInputValue('tag_text');
                const roleId = interaction.fields.getTextInputValue('role_id');
                const inviteLink = interaction.fields.getTextInputValue('invite_link');

                await TrackedServer.findOneAndUpdate(
                    { guildId },
                    { displayName, tagText, roleId, inviteLink, addedBy: interaction.user.id },
                    { upsert: true, new: true }
                );
                await interaction.editReply({ content: `✅ **Added ${displayName}!**` });
            }

            // 🆕 C. DASHBOARD EDIT SUBMIT
            if (interaction.customId === 'dashboard_edit_modal') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const guildId = interaction.fields.getTextInputValue('server_id'); 
                const displayName = interaction.fields.getTextInputValue('display_name');
                const tagText = interaction.fields.getTextInputValue('tag_text');
                const roleId = interaction.fields.getTextInputValue('role_id');
                const inviteLink = interaction.fields.getTextInputValue('invite_link');

                await TrackedServer.findOneAndUpdate(
                    { guildId },
                    { displayName, tagText, roleId, inviteLink },
                    { new: true }
                );

                // Trigger update
                await updateAllDashboards(client);
                await interaction.editReply({ content: `✅ **Updated ${displayName}!**` });
            }
        }
    }
};
