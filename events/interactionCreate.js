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
    TextDisplayBuilder,
    SeparatorBuilder
} = require('discord.js');

const Giveaway = require('../src/models/Giveaway');
const ApplicationConfig = require('../src/models/ApplicationConfig');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {

        // --- 1. SLASH COMMAND HANDLER ---
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

        // --- 2. BUTTON HANDLERS ---
        if (interaction.isButton()) {

            // A. ROLE BUTTONS
            if (interaction.customId.startsWith('role_')) {
                const parts = interaction.customId.split('_');
                const roleId = parts[1];
                const mode = parts[2] || '0';
                const role = interaction.guild.roles.cache.get(roleId);

                if (!role) return interaction.reply({ content: '<:no:1297814819105144862> Role not found.', flags: MessageFlags.Ephemeral });

                const hasRole = interaction.member.roles.cache.has(roleId);
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

                modal.addComponents(new ActionRowBuilder().addComponents(q1), new ActionRowBuilder().addComponents(q2), new ActionRowBuilder().addComponents(q3), new ActionRowBuilder().addComponents(q4), new ActionRowBuilder().addComponents(q5));
                await interaction.showModal(modal);
            }
        }

        // --- 3. MODAL SUBMISSION (Components v2 Layout) ---
        if (interaction.isModalSubmit() && interaction.customId === 'application_modal') {
            const config = await ApplicationConfig.findOne({ guildId: interaction.guild.id });
            const logChannel = interaction.guild.channels.cache.get(config?.logChannelId);
            if (!logChannel) return interaction.reply({ content: 'Error: Log channel not found.', flags: MessageFlags.Ephemeral });

            // Using TextDisplayBuilders for the container content
            const titleText = new TextDisplayBuilder().setContent(`### 📄 New Staff Application`);
            const detailsText = new TextDisplayBuilder().setContent(
                `**User:** <@${interaction.user.id}>\n` +
                `**Name:** ${interaction.fields.getTextInputValue('app_name')}\n` +
                `**Age:** ${interaction.fields.getTextInputValue('app_age')}\n` +
                `**Country:** ${interaction.fields.getTextInputValue('app_country')}\n` +
                `**Time Zone:** ${interaction.fields.getTextInputValue('app_timezone')}`
            );
            const reasonText = new TextDisplayBuilder().setContent(`**Reason for applying:**\n${interaction.fields.getTextInputValue('app_reason')}`);

            // Add all text components to the same container
            const container = new ContainerBuilder().addTextDisplayComponents(titleText, detailsText, reasonText);

            const timeBtn = new ButtonBuilder().setCustomId('time_disabled').setDisabled(true).setStyle(ButtonStyle.Secondary)
                .setLabel(`${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Bangkok', hour12: false })} (GMT+7)`);

            await logChannel.send({ 
                flags: [MessageFlags.IsComponentsV2], // Enabling v2 functionality
                components: [
                    container,
                    new SeparatorBuilder(), // Horizontal line separator
                    new ActionRowBuilder().addComponents(timeBtn)
                ] 
            });

            return interaction.reply({ content: '<:yes:1297814648417943565> Application submitted!', flags: MessageFlags.Ephemeral });
        }
    }
};
