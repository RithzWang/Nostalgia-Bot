const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const ServerStatsConfig = require('../src/models/ServerStats');
const { buildHomeMenu, buildStatsMenu, buildTagStatsMenu, updateServerStatsPanels } = require('../utils/serverStatsManager');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Only handle Server Stats interactions
        if (!interaction.customId || !interaction.customId.startsWith('ss_')) return;

        try {
            const guildId = interaction.guild.id;
            let config = await ServerStatsConfig.findOne({ guildId });

            // ================= BUTTONS =================
            if (interaction.isButton()) {
                if (interaction.customId === 'ss_btn_toggle') {
                    if (config && config.channelId) {
                        // DISABLE
                        await ServerStatsConfig.findOneAndDelete({ guildId });
                        return interaction.update({ components: buildHomeMenu(null) });
                    } else {
                        // ENABLE (Open Modal)
                        const modal = new ModalBuilder().setCustomId('ss_modal_enable').setTitle('Enable Server Stats');
                        modal.addComponents(
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('msg_id').setLabel("Message ID (Optional)").setStyle(TextInputStyle.Short).setRequired(false)),
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('channel_id').setLabel("Channel ID (Optional, defaults to here)").setStyle(TextInputStyle.Short).setRequired(false))
                        );
                        return interaction.showModal(modal);
                    }
                }

                if (interaction.customId === 'ss_btn_home') {
                    return interaction.update({ components: buildHomeMenu(config) });
                }

                if (interaction.customId === 'ss_btn_menu_stats') {
                    return interaction.update({ components: buildStatsMenu(config) });
                }

                if (interaction.customId === 'ss_btn_menu_tags') {
                    return interaction.update({ components: buildTagStatsMenu(config) });
                }

                if (interaction.customId === 'ss_btn_edit_stats') {
                    const modal = new ModalBuilder().setCustomId('ss_modal_edit_stats').setTitle('Edit Server Stats');
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('msg_id').setLabel("New Message ID (Optional)").setStyle(TextInputStyle.Short).setRequired(false).setValue(config?.messageId || "")),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('channel_id').setLabel("New Channel ID").setStyle(TextInputStyle.Short).setRequired(true).setValue(config?.channelId || interaction.channel.id))
                    );
                    return interaction.showModal(modal);
                }

                if (interaction.customId === 'ss_btn_edit_tag') {
                    const modal = new ModalBuilder().setCustomId('ss_modal_edit_tag').setTitle('Edit Tag Text');
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tag_text').setLabel("Server Tag").setStyle(TextInputStyle.Short).setRequired(true).setValue(config?.tagText || ""))
                    );
                    return interaction.showModal(modal);
                }

                if (interaction.customId === 'ss_btn_edit_role') {
                    const modal = new ModalBuilder().setCustomId('ss_modal_edit_role').setTitle('Edit Adopter Role');
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('role_id').setLabel("Role ID").setStyle(TextInputStyle.Short).setRequired(true).setValue(config?.tagRoleId || ""))
                    );
                    return interaction.showModal(modal);
                }
            }

            // ================= MODALS =================
            if (interaction.isModalSubmit()) {
                if (!config) config = new ServerStatsConfig({ guildId });

                if (interaction.customId === 'ss_modal_enable' || interaction.customId === 'ss_modal_edit_stats') {
                    config.messageId = interaction.fields.getTextInputValue('msg_id') || "";
                    config.channelId = interaction.fields.getTextInputValue('channel_id') || interaction.channel.id;
                    await config.save();
                    
                    await interaction.update({ components: interaction.customId === 'ss_modal_enable' ? buildHomeMenu(config) : buildStatsMenu(config) });
                    return updateServerStatsPanels(client); // Immediately update dashboard
                }

                if (interaction.customId === 'ss_modal_edit_tag') {
                    config.tagText = interaction.fields.getTextInputValue('tag_text');
                    if (config.tagText && config.tagRoleId) config.tagEnabled = true; // Auto-enable if both exist
                    await config.save();
                    
                    await interaction.update({ components: buildTagStatsMenu(config) });
                    return updateServerStatsPanels(client);
                }

                if (interaction.customId === 'ss_modal_edit_role') {
                    config.tagRoleId = interaction.fields.getTextInputValue('role_id');
                    if (config.tagText && config.tagRoleId) config.tagEnabled = true; // Auto-enable if both exist
                    await config.save();
                    
                    await interaction.update({ components: buildTagStatsMenu(config) });
                    return updateServerStatsPanels(client);
                }
            }
        } catch (error) {
            console.error("ServerStats Interaction Error:", error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: "❌ An error occurred processing the menu.", flags: [MessageFlags.Ephemeral] });
            }
        }
    }
};
