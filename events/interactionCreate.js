const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} = require('discord.js');

const Giveaway = require('../src/models/Giveaway');
const ApplicationConfig = require('../src/models/ApplicationConfig');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {

        // --- 1. SLASH COMMAND HANDLER ---
        if (interaction.isChatInputCommand()) {
            // Use 'slashCommands' to match your index.js definition
            const command = client.slashCommands.get(interaction.commandName);

            if (!command) {
                console.error(`[Error] No command matching ${interaction.commandName} found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`[Error] Command execution failed: ${interaction.commandName}`);
                console.error(error);
                
                const errorPayload = { content: 'There was an error executing this command!', flags: MessageFlags.Ephemeral };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorPayload);
                } else {
                    await interaction.reply(errorPayload);
                }
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
                if (mode === '1') { // Verify Mode
                    if (hasRole) return interaction.reply({ content: `<:no:1297814819105144862> Already verified.`, flags: MessageFlags.Ephemeral });
                    await interaction.member.roles.add(role);
                    return interaction.reply({ content: `<:yes:1297814648417943565> Verified as **${role.name}**.`, flags: MessageFlags.Ephemeral });
                } else { // Toggle Mode
                    if (hasRole) {
                        await interaction.member.roles.remove(role);
                        return interaction.reply({ content: `<:yes:1297814648417943565> Removed **${role.name}**.`, flags: MessageFlags.Ephemeral });
                    } else {
                        await interaction.member.roles.add(role);
                        return interaction.reply({ content: `<:yes:1297814648417943565> Added **${role.name}**.`, flags: MessageFlags.Ephemeral });
                    }
                }
            }

            // B. GIVEAWAY JOIN
            if (interaction.customId === 'giveaway_join') {
                const giveaway = await Giveaway.findOne({ messageId: interaction.message.id });
                if (!giveaway || giveaway.ended) return interaction.reply({ content: 'Giveaway ended.', flags: MessageFlags.Ephemeral });

                let msg = '';
                if (giveaway.participants.includes(interaction.user.id)) {
                    giveaway.participants = giveaway.participants.filter(id => id !== interaction.user.id);
                    msg = 'Left giveaway.';
                } else {
                    giveaway.participants.push(interaction.user.id);
                    msg = 'Joined giveaway!';
                }
                await giveaway.save();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('giveaway_join').setLabel('Join Giveaway').setStyle(ButtonStyle.Secondary).setEmoji('🎉'),
                    new ButtonBuilder().setCustomId('giveaway_count').setLabel(`${giveaway.participants.length} Entries`).setStyle(ButtonStyle.Secondary).setDisabled(true)
                );
                await interaction.message.edit({ components: [row] });
                return interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
            }

            // C. APPLICATION MODAL OPEN
            if (interaction.customId === 'app_apply_btn') {
                const config = await ApplicationConfig.findOne({ guildId: interaction.guild.id });
                if (!config || !config.enabled) return interaction.reply({ content: 'Applications closed.', flags: MessageFlags.Ephemeral });

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
        }

        // --- 3. SELECT MENU HANDLERS ---
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'role_select_menu') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const selectedRoleIds = interaction.values;
                const allRoleIds = interaction.component.options.map(opt => opt.value);
                const added = [], removed = [];

                for (const roleId of allRoleIds) {
                    const role = interaction.guild.roles.cache.get(roleId);
                    if (!role) continue;
                    if (selectedRoleIds.includes(roleId)) {
                        if (!interaction.member.roles.cache.has(roleId)) {
                            await interaction.member.roles.add(role);
                            added.push(role.name);
                        }
                    } else {
                        if (interaction.member.roles.cache.has(roleId)) {
                            await interaction.member.roles.remove(role);
                            removed.push(role.name);
                        }
                    }
                }
                let res = (added.length || removed.length) ? '' : 'No changes.';
                if (added.length) res += `<:yes:1297814648417943565> **Added:** ${added.join(', ')}\n`;
                if (removed.length) res += `<:no:1297814819105144862> **Removed:** ${removed.join(', ')}`;
                return interaction.editReply({ content: res });
            }
        }

        // --- 4. MODAL SUBMISSION ---
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'application_modal') {
                const config = await ApplicationConfig.findOne({ guildId: interaction.guild.id });
                const logChannel = interaction.guild.channels.cache.get(config?.logChannelId);
                
                if (!logChannel) return interaction.reply({ content: 'Error: Log channel not found.', flags: MessageFlags.Ephemeral });

                const embed = new EmbedBuilder()
                    .setTitle('📄 New Staff Application')
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                    .setColor(0x808080)
                    .addFields(
                        { name: 'User', value: `<@${interaction.user.id}>` },
                        { name: 'Name', value: interaction.fields.getTextInputValue('app_name'), inline: true },
                        { name: 'Age', value: interaction.fields.getTextInputValue('app_age'), inline: true },
                        { name: 'Country', value: interaction.fields.getTextInputValue('app_country'), inline: true },
                        { name: 'Time Zone', value: interaction.fields.getTextInputValue('app_timezone'), inline: true },
                        { name: 'Reason', value: interaction.fields.getTextInputValue('app_reason') }
                    );

                const timeBtn = new ButtonBuilder().setCustomId('time').setDisabled(true).setStyle(ButtonStyle.Secondary)
                    .setLabel(`${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Bangkok', hour12: false })} (GMT+7)`);

                await logChannel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(timeBtn)] });
                return interaction.reply({ content: '<:yes:1297814648417943565> Application submitted!', flags: MessageFlags.Ephemeral });
            }
        }
    }
};
