const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    // Discord Components v2 Builders
    ContainerBuilder,
    TextDisplayBuilder
} = require('discord.js');

// --- IMPORTS ---
const Giveaway = require('../src/models/Giveaway');
const ApplicationConfig = require('../src/models/ApplicationConfig');
const ThanksLB = require('../src/models/ThanksLB'); 
const { updateLeaderboardVisual } = require('../commands/slash commands/leaderboard/thanksLeaderboard');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {

        // ===============================================
        // 1. SLASH COMMAND HANDLER
        // ===============================================
        if (interaction.isChatInputCommand()) {
            const command = client.slashCommands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                const errorPayload = { content: 'There was an error executing this command!', flags: MessageFlags.Ephemeral };
                if (interaction.replied || interaction.deferred) await interaction.followUp(errorPayload);
                else await interaction.reply(errorPayload);
            }
        }

        // ===============================================
        // 2. BUTTON HANDLERS
        // ===============================================
        if (interaction.isButton()) {

            // A. ROLE BUTTONS
            if (interaction.customId.startsWith('role_')) {
                const parts = interaction.customId.split('_');
                const roleId = parts[1];
                const mode = parts[2] || '0';
                const role = interaction.guild.roles.cache.get(roleId);

                if (!role) return interaction.reply({ content: '<:no:1297814819105144862> Role not found.', flags: MessageFlags.Ephemeral });

                const hasRole = interaction.member.roles.cache.has(roleId);
                
                try {
                    if (mode === '1') {
                        if (hasRole) return interaction.reply({ content: `<:no:1297814819105144862> Already verified.`, flags: MessageFlags.Ephemeral });
                        await interaction.member.roles.add(role);
                        return interaction.reply({ content: `<:yes:1297814648417943565> **Verified as** ${role.name}.`, flags: MessageFlags.Ephemeral });
                    } else {
                        if (hasRole) {
                            await interaction.member.roles.remove(role);
                            return interaction.reply({ content: `<:yes:1297814648417943565> **Removed** ${role.name}.`, flags: MessageFlags.Ephemeral });
                        } else {
                            await interaction.member.roles.add(role);
                            return interaction.reply({ content: `<:yes:1297814648417943565> **Added** ${role.name}.`, flags: MessageFlags.Ephemeral });
                        }
                    }
                } catch (e) {
                    return interaction.reply({ content: "❌ I cannot manage this role.", flags: MessageFlags.Ephemeral });
                }
            }


            // B. GIVEAWAY JOIN/LEAVE
            if (interaction.customId === 'giveaway_join') {
                const giveaway = await Giveaway.findOne({ messageId: interaction.message.id });
                if (!giveaway || giveaway.ended) return interaction.reply({ content: '<:no:1297814819105144862> This giveaway has ended.', flags: MessageFlags.Ephemeral });

                let responseContent = '';
                if (giveaway.participants.includes(interaction.user.id)) {
                    giveaway.participants = giveaway.participants.filter(id => id !== interaction.user.id);
                    responseContent = '<:no:1297814819105144862> You have **left** the giveaway.';
                } else {
                    giveaway.participants.push(interaction.user.id);
                    responseContent = '<:yes:1297814648417943565> You have successfully **joined** the giveaway!';
                }
                await giveaway.save();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('giveaway_join').setLabel('Join Giveaway').setStyle(ButtonStyle.Secondary).setEmoji('🎉'),
                    new ButtonBuilder().setCustomId('giveaway_count').setLabel(`${giveaway.participants.length} Entries`).setStyle(ButtonStyle.Secondary).setDisabled(true)
                );

                await interaction.message.edit({ components: [row] });
                return interaction.reply({ content: responseContent, flags: MessageFlags.Ephemeral });
            }

            // C. STAFF APPLICATION MODAL OPEN
            if (interaction.customId === 'app_apply_btn') {
                const modal = new ModalBuilder().setCustomId('application_modal').setTitle('Staff Application');
                const q1 = new TextInputBuilder().setCustomId('app_name').setLabel("What is your name?").setStyle(TextInputStyle.Short).setRequired(true);
                const q2 = new TextInputBuilder().setCustomId('app_age').setLabel("How old are you?").setStyle(TextInputStyle.Short).setRequired(true);
                const q3 = new TextInputBuilder().setCustomId('app_country').setLabel("Where are you from?").setStyle(TextInputStyle.Short).setRequired(true);
                const q4 = new TextInputBuilder().setCustomId('app_timezone').setLabel("What is your time zone?").setStyle(TextInputStyle.Short).setRequired(true);
                const q5 = new TextInputBuilder().setCustomId('app_reason').setLabel("Why do you want to be staff?").setStyle(TextInputStyle.Paragraph).setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(q1), 
                    new ActionRowBuilder().addComponents(q2), 
                    new ActionRowBuilder().addComponents(q3), 
                    new ActionRowBuilder().addComponents(q4), 
                    new ActionRowBuilder().addComponents(q5)
                );
                await interaction.showModal(modal);
            }

            // D. THANKS LEADERBOARD PAGINATION (⬅️ / ➡️)
            if (['thanks_prev', 'thanks_next'].includes(interaction.customId)) {
                await interaction.deferUpdate();
                const data = await ThanksLB.findOne({ guildId: interaction.guild.id });
                if (data) {
                    let newPage = data.currentPage;
                    if (interaction.customId === 'thanks_prev') newPage--;
                    else newPage++;
                    await updateLeaderboardVisual(client, interaction.guild.id, newPage);
                }
            }
        }

        // ===============================================
        // 3. SELECT MENU HANDLERS (UPDATED)
        // ===============================================
        if (interaction.isStringSelectMenu()) {
            
            // CHECK: Does the ID start with our prefix?
            if (interaction.customId.startsWith('role_select_')) {

                // 1. EXTRACT RESTRICTION
                // Removes "role_select_" to get "public", "menu" (legacy), or "1234567890"
                const restrictionId = interaction.customId.replace('role_select_', '');

                // 2. CHECK PERMISSION
                // If it's not "public" and not "menu" (your old legacy ID), treat it as a Role ID
                if (restrictionId !== 'public' && restrictionId !== 'menu') {
                    if (!interaction.member.roles.cache.has(restrictionId)) {
                        return interaction.reply({
                            content: `<:no:1297814819105144862> You need the <@&${restrictionId}> role to use this menu!`,
                            flags: MessageFlags.Ephemeral
                        });
                    }
                }

                // 3. DEFER & PROCESS
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const selectedRoleIds = interaction.values;
                const allRoleIds = interaction.component.options.map(opt => opt.value);
                const added = [], removed = [];

                for (const roleId of allRoleIds) {
                    const role = interaction.guild.roles.cache.get(roleId);
                    if (!role) continue;
                    
                    const hasRole = interaction.member.roles.cache.has(roleId);
                    try {
                        if (selectedRoleIds.includes(roleId)) {
                            if (!hasRole) {
                                await interaction.member.roles.add(role);
                                added.push(role.name);
                            }
                        } else {
                            if (hasRole) {
                                await interaction.member.roles.remove(role);
                                removed.push(role.name);
                            }
                        }
                    } catch (e) {
                        console.error(`Error toggling role ${roleId}:`, e);
                    }
                }

                // --- BUILD V2 COMPONENT RESPONSE ---
                let feedbackText = '';
                let accentColor = 0x95A5A6; // Default Grey (No changes)

                // Reuse your exact text format
                if (added.length || removed.length) {
                    accentColor = 0x57F287; // Green (Success)
                    if (added.length) feedbackText += `<:yes:1297814648417943565> **Added:** ${added.join(', ')}\n`;
                    if (removed.length) feedbackText += `<:no:1297814819105144862> **Removed:** ${removed.join(', ')}`;
                } else {
                    feedbackText = 'No changes 🤔';
                }

                const responseText = new TextDisplayBuilder().setContent(feedbackText);
                
                const responseContainer = new ContainerBuilder()
                    .setAccentColor(accentColor)
                    .addTextDisplayComponents(responseText);

                // Reply with V2 Container
                return interaction.editReply({ 
                    content: '', 
                    components: [responseContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
            }
        }

        // ===============================================
        // 4. MODAL SUBMISSION
        // ===============================================
        if (interaction.isModalSubmit() && interaction.customId === 'application_modal') {
            const config = await ApplicationConfig.findOne({ guildId: interaction.guild.id });
            const logChannel = interaction.guild.channels.cache.get(config?.logChannelId);
            if (!logChannel) return interaction.reply({ content: 'Error: Log channel not found.', flags: MessageFlags.Ephemeral });

            // Using TextDisplayBuilders (V2)
            try {
                const titleText = new TextDisplayBuilder().setContent(`### 📄 New Staff Application`);
                const detailsText = new TextDisplayBuilder().setContent(
                    `**User:** <@${interaction.user.id}>\n` +
                    `**Name:** ${interaction.fields.getTextInputValue('app_name')}\n` +
                    `**Age:** ${interaction.fields.getTextInputValue('app_age')}\n` +
                    `**Country:** ${interaction.fields.getTextInputValue('app_country')}\n` +
                    `**Time Zone:** ${interaction.fields.getTextInputValue('app_timezone')}`
                );
                const reasonText = new TextDisplayBuilder().setContent(`**Reason For Applying:**\n${interaction.fields.getTextInputValue('app_reason')}`);

                const container = new ContainerBuilder().addTextDisplayComponents(titleText, detailsText, reasonText);

                const timeBtn = new ButtonBuilder()
                    .setCustomId('time_disabled')
                    .setDisabled(true)
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel(`${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Bangkok', hour12: false })} (GMT+7)`);

                await logChannel.send({ 
                    flags: [MessageFlags.IsComponentsV2], 
                    components: [
                        container,
                        new ActionRowBuilder().addComponents(timeBtn)
                    ] 
                });

                return interaction.reply({ content: '<:yes:1297814648417943565> Application submitted!', flags: MessageFlags.Ephemeral });
            } catch (error) {
                console.error("Failed to send V2 component application:", error);
                return interaction.reply({ content: '❌ Failed to submit application.', flags: MessageFlags.Ephemeral });
            }
        }
    }
};
