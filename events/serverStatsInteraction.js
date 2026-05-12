const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const ServerStatsConfig = require('../src/models/ServerStats');
const { buildHomeMenu, buildStatsMenu, buildTagStatsMenu, updateServerStatsPanels } = require('../utils/serverStatsManager');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.customId || !interaction.customId.startsWith('ss_')) return;

        try {
            const guildId = interaction.guild.id;
            let config = await ServerStatsConfig.findOne({ guildId });

            // ================= SELECT MENUS =================
            if (interaction.isStringSelectMenu()) {
                const choice = interaction.values[0];

                // --- HOME MENU ---
                if (interaction.customId === 'ss_sel_home') {
                    if (choice === 'toggle') {
                        if (config && config.channelId) {
                            await ServerStatsConfig.findOneAndDelete({ guildId });
                            return interaction.update({ components: buildHomeMenu(null) });
                        } else {
                            const modal = new ModalBuilder().setCustomId('ss_modal_enable').setTitle('Enable Server Stats');
                            modal.addComponents(
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('channel_id').setLabel("Channel ID (Where to send stats)").setStyle(TextInputStyle.Short).setRequired(true).setValue(interaction.channel.id)),
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('msg_id').setLabel("Message ID (Optional)").setStyle(TextInputStyle.Short).setRequired(false))
                            );
                            return interaction.showModal(modal);
                        }
                    }
                    if (choice === 'menu_stats') return interaction.update({ components: buildStatsMenu(config) });
                    if (choice === 'menu_tags') return interaction.update({ components: buildTagStatsMenu(config) });
                }

                // --- NAVIGATION / QUICK ACTIONS ---
                if (choice === 'home') return interaction.update({ components: buildHomeMenu(config) });

                // --- STATS MENU MODALS ---
                if (choice === 'set_msg') {
                    const modal = new ModalBuilder().setCustomId('ss_modal_msg').setTitle('Set Message ID');
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('msg_id').setLabel("Message ID").setStyle(TextInputStyle.Short).setRequired(true).setValue(config?.messageId || "")));
                    return interaction.showModal(modal);
                }
                if (choice === 'set_ch') {
                    const modal = new ModalBuilder().setCustomId('ss_modal_ch').setTitle('Set Channel ID');
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('channel_id').setLabel("Channel ID").setStyle(TextInputStyle.Short).setRequired(true).setValue(config?.channelId || "")));
                    return interaction.showModal(modal);
                }
                if (choice === 'rm_msg') {
                    config.messageId = "";
                    await config.save();
                    return interaction.update({ components: buildStatsMenu(config) });
                }

                // --- TAGS MENU MODALS ---
                if (choice === 'set_tag') {
                    const modal = new ModalBuilder().setCustomId('ss_modal_tag').setTitle('Set Tag Text');
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tag_text').setLabel("Server Tag").setStyle(TextInputStyle.Short).setRequired(true).setValue(config?.tagText || "")));
                    return interaction.showModal(modal);
                }
                if (choice === 'set_role') {
                    const modal = new ModalBuilder().setCustomId('ss_modal_role').setTitle('Set Adopter Role ID');
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('role_id').setLabel("Role ID").setStyle(TextInputStyle.Short).setRequired(true).setValue(config?.tagRoleId || "")));
                    return interaction.showModal(modal);
                }

                // --- REMOVE TAG ACTIONS ---
                if (choice === 'rm_tag' || choice === 'rm_role') {
                    if (choice === 'rm_tag') {
                        config.tagText = "";
                        config.tagEnabled = false; // Only removing the Tag Text completely disables it
                    }
                    if (choice === 'rm_role') {
                        config.tagRoleId = ""; // Role removed, but dashboard Tag Stats stay ON
                    }
                    
                    await config.save();
                    await interaction.update({ components: buildTagStatsMenu(config) });
                    return updateServerStatsPanels(client);
                }
            }

            // ================= MODALS =================
            if (interaction.isModalSubmit()) {
                if (!config) config = new ServerStatsConfig({ guildId });

                if (interaction.customId === 'ss_modal_enable') {
                    config.channelId = interaction.fields.getTextInputValue('channel_id');
                    config.messageId = interaction.fields.getTextInputValue('msg_id') || "";
                    await config.save();
                    await interaction.update({ components: buildHomeMenu(config) });
                    return updateServerStatsPanels(client);
                }

                if (interaction.customId === 'ss_modal_msg') {
                    config.messageId = interaction.fields.getTextInputValue('msg_id');
                    await config.save();
                    return interaction.update({ components: buildStatsMenu(config) });
                }

                if (interaction.customId === 'ss_modal_ch') {
                    config.channelId = interaction.fields.getTextInputValue('channel_id');
                    await config.save();
                    await interaction.update({ components: buildStatsMenu(config) });
                    return updateServerStatsPanels(client);
                }

                if (interaction.customId === 'ss_modal_tag' || interaction.customId === 'ss_modal_role') {
                    if (interaction.customId === 'ss_modal_tag') config.tagText = interaction.fields.getTextInputValue('tag_text');
                    if (interaction.customId === 'ss_modal_role') config.tagRoleId = interaction.fields.getTextInputValue('role_id');
                    
                    // ✅ UPDATED: Tag Stats enable as soon as there is Tag Text!
                    if (config.tagText) config.tagEnabled = true;
                    
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
