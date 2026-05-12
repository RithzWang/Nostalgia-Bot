const { 
    Events, ModalBuilder, TextInputBuilder, TextInputStyle, 
    ChannelSelectMenuBuilder, RoleSelectMenuBuilder, 
    LabelBuilder, MessageFlags 
} = require('discord.js');
const ServerStatsConfig = require('../src/models/ServerStats');
const { buildHomeMenu, buildStatsMenu, buildTagStatsMenu, updateServerStatsPanels } = require('../utils/serverStatsManager');

// Helper function to safely extract values from both Text Inputs AND Select Menus in V2 Modals
function getFieldValue(interaction, id) {
    try {
        return interaction.fields.getTextInputValue(id);
    } catch (e) {
        // If it's a Select Menu, getTextInputValue throws an error, so we grab it from the raw components array
        const field = interaction.components?.flatMap(r => r.components || []).find(c => c.customId === id);
        if (field) {
            if (field.values && field.values.length > 0) return field.values[0];
            if (field.value) return field.value;
        }
        return "";
    }
}

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
                            
                            const channelSelect = new ChannelSelectMenuBuilder().setCustomId('channel_id').setPlaceholder('Select the dashboard channel').setRequired(true);
                            const channelLabel = new LabelBuilder().setLabel("Channel").setChannelSelectMenuComponent(channelSelect);
                            
                            const msgInput = new TextInputBuilder().setCustomId('msg_id').setStyle(TextInputStyle.Short).setRequired(false);
                            const msgLabel = new LabelBuilder().setLabel("Message ID (Optional)").setTextInputComponent(msgInput);
                            
                            const invInput = new TextInputBuilder().setCustomId('invite_link').setStyle(TextInputStyle.Short).setRequired(false);
                            const invLabel = new LabelBuilder().setLabel("Invite Link (Optional)").setTextInputComponent(invInput);

                            modal.addLabelComponents(channelLabel, msgLabel, invLabel);
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
                    const msgInput = new TextInputBuilder().setCustomId('msg_id').setStyle(TextInputStyle.Short).setRequired(true).setValue(config?.messageId || "");
                    const msgLabel = new LabelBuilder().setLabel("Message ID").setTextInputComponent(msgInput);
                    modal.addLabelComponents(msgLabel);
                    return interaction.showModal(modal);
                }
                if (choice === 'set_ch') {
                    const modal = new ModalBuilder().setCustomId('ss_modal_ch').setTitle('Set Channel ID');
                    const chSelect = new ChannelSelectMenuBuilder().setCustomId('channel_id').setPlaceholder('Select a new channel').setRequired(true);
                    const chLabel = new LabelBuilder().setLabel("Channel").setChannelSelectMenuComponent(chSelect);
                    modal.addLabelComponents(chLabel);
                    return interaction.showModal(modal);
                }
                if (choice === 'set_inv') {
                    const modal = new ModalBuilder().setCustomId('ss_modal_inv').setTitle('Set Invite Link');
                    const invInput = new TextInputBuilder().setCustomId('invite_link').setStyle(TextInputStyle.Short).setRequired(true).setValue(config?.inviteLink || "");
                    const invLabel = new LabelBuilder().setLabel("Invite URL (e.g. https://discord.gg/...)").setTextInputComponent(invInput);
                    modal.addLabelComponents(invLabel);
                    return interaction.showModal(modal);
                }
                if (choice === 'rm_msg') {
                    config.messageId = "";
                    await config.save();
                    return interaction.update({ components: buildStatsMenu(config) });
                }
                if (choice === 'rm_inv') {
                    config.inviteLink = "";
                    await config.save();
                    await interaction.update({ components: buildStatsMenu(config) });
                    return updateServerStatsPanels(client);
                }

                // --- TAGS MENU MODALS ---
                if (choice === 'set_tag') {
                    const modal = new ModalBuilder().setCustomId('ss_modal_tag').setTitle('Set Tag Text');
                    
                    const tagInput = new TextInputBuilder().setCustomId('tag_text').setStyle(TextInputStyle.Short).setRequired(true).setValue(config?.tagText || "");
                    const tagLabel = new LabelBuilder().setLabel("Server Tag").setTextInputComponent(tagInput);
                    
                    const notifySelect = new ChannelSelectMenuBuilder().setCustomId('notify_channel').setPlaceholder('Select notify channel').setRequired(false);
                    const notifyLabel = new LabelBuilder().setLabel("Notify Channel (Optional)").setChannelSelectMenuComponent(notifySelect);
                    
                    modal.addLabelComponents(tagLabel, notifyLabel);
                    return interaction.showModal(modal);
                }
                if (choice === 'set_role') {
                    const modal = new ModalBuilder().setCustomId('ss_modal_role').setTitle('Set Adopter Role');
                    const roleSelect = new RoleSelectMenuBuilder().setCustomId('role_id').setPlaceholder('Select an Adopter Role').setRequired(true);
                    const roleLabel = new LabelBuilder().setLabel("Adopter Role").setRoleSelectMenuComponent(roleSelect);
                    modal.addLabelComponents(roleLabel);
                    return interaction.showModal(modal);
                }
                if (choice === 'set_notify') {
                    const modal = new ModalBuilder().setCustomId('ss_modal_notify').setTitle('Set Notify Channel');
                    const notifySelect = new ChannelSelectMenuBuilder().setCustomId('notify_channel').setPlaceholder('Select notify channel').setRequired(true);
                    const notifyLabel = new LabelBuilder().setLabel("Notify Channel").setChannelSelectMenuComponent(notifySelect);
                    modal.addLabelComponents(notifyLabel);
                    return interaction.showModal(modal);
                }

                // --- REMOVE TAG ACTIONS ---
                if (choice === 'rm_tag' || choice === 'rm_role' || choice === 'rm_notify') {
                    if (choice === 'rm_tag') {
                        config.tagText = "";
                        config.tagEnabled = false;
                    }
                    if (choice === 'rm_role') config.tagRoleId = "";
                    if (choice === 'rm_notify') config.tagNotifyChannelId = "";
                    
                    await config.save();
                    await interaction.update({ components: buildTagStatsMenu(config) });
                    return updateServerStatsPanels(client);
                }
            }

            // ================= MODALS =================
            if (interaction.isModalSubmit()) {
                if (!config) config = new ServerStatsConfig({ guildId });

                if (interaction.customId === 'ss_modal_enable') {
                    config.channelId = getFieldValue(interaction, 'channel_id');
                    config.messageId = getFieldValue(interaction, 'msg_id') || "";
                    config.inviteLink = getFieldValue(interaction, 'invite_link') || "";
                    await config.save();
                    await interaction.update({ components: buildHomeMenu(config) });
                    return updateServerStatsPanels(client);
                }

                if (interaction.customId === 'ss_modal_msg') {
                    config.messageId = getFieldValue(interaction, 'msg_id');
                    await config.save();
                    return interaction.update({ components: buildStatsMenu(config) });
                }

                if (interaction.customId === 'ss_modal_ch') {
                    config.channelId = getFieldValue(interaction, 'channel_id');
                    await config.save();
                    await interaction.update({ components: buildStatsMenu(config) });
                    return updateServerStatsPanels(client);
                }

                if (interaction.customId === 'ss_modal_inv') {
                    config.inviteLink = getFieldValue(interaction, 'invite_link');
                    await config.save();
                    await interaction.update({ components: buildStatsMenu(config) });
                    return updateServerStatsPanels(client);
                }

                if (interaction.customId === 'ss_modal_tag') {
                    config.tagText = getFieldValue(interaction, 'tag_text');
                    const notifyInput = getFieldValue(interaction, 'notify_channel');
                    if (notifyInput) config.tagNotifyChannelId = notifyInput;
                    
                    if (config.tagText) config.tagEnabled = true;
                    
                    await config.save();
                    await interaction.update({ components: buildTagStatsMenu(config) });
                    return updateServerStatsPanels(client);
                }

                if (interaction.customId === 'ss_modal_role') {
                    config.tagRoleId = getFieldValue(interaction, 'role_id');
                    await config.save();
                    await interaction.update({ components: buildTagStatsMenu(config) });
                    return updateServerStatsPanels(client);
                }

                if (interaction.customId === 'ss_modal_notify') {
                    config.tagNotifyChannelId = getFieldValue(interaction, 'notify_channel');
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
