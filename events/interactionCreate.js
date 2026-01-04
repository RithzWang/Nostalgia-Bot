const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    Colors,
    // Discord Components v2 Builders
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

// --- IMPORTS ---
const Giveaway = require('../src/models/Giveaway');
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
        // 2. GENERAL BUTTON HANDLERS
        // ===============================================
        if (interaction.isButton()) {

            // A. LEGACY ROLE BUTTONS
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

            // C. THANKS LEADERBOARD
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

            // D. BUTTON ROLE HANDLER (Single & Multi)
            if (interaction.customId.startsWith('btn_role_') || interaction.customId.startsWith('btn_single_')) {
                const isSingleMode = interaction.customId.startsWith('btn_single_');
                const roleId = interaction.customId.replace('btn_role_', '').replace('btn_single_', '');
                const role = interaction.guild.roles.cache.get(roleId);

                if (!role) return interaction.reply({ content: '<:no:1297814819105144862> Role not found.', flags: MessageFlags.Ephemeral });
                if (role.position >= interaction.guild.members.me.roles.highest.position) return interaction.reply({ content: '<:no:1297814819105144862> Role too high.', flags: MessageFlags.Ephemeral });

                try {
                    if (isSingleMode) {
                        if (interaction.member.roles.cache.has(roleId)) {
                             await interaction.member.roles.remove(role);
                             return interaction.reply({ content: `<:yes:1297814648417943565> **Removed:** ${role.name}`, flags: MessageFlags.Ephemeral });
                        }
                        const rolesToRemove = [];
                        const removedNames = [];
                        const container = interaction.message.components[0]; 
                        if (container) {
                            container.components.forEach(comp => {
                                if (comp.type === 1) { 
                                    comp.components.forEach(btn => {
                                        if (btn.customId.startsWith('btn_single_')) {
                                            const otherId = btn.customId.replace('btn_single_', '');
                                            if (otherId !== roleId && interaction.member.roles.cache.has(otherId)) {
                                                rolesToRemove.push(otherId);
                                                const r = interaction.guild.roles.cache.get(otherId);
                                                if (r) removedNames.push(r.name);
                                            }
                                        }
                                    });
                                }
                            });
                        }
                        for (const rID of rolesToRemove) await interaction.member.roles.remove(rID).catch(() => {});
                        await interaction.member.roles.add(role);
                        let msg = `<:yes:1297814648417943565> **Added:** ${role.name}`;
                        if (removedNames.length > 0) msg += `\n<:no:1297814819105144862> **Removed:** ${removedNames.join(', ')}`;
                        return interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
                    } else {
                        if (interaction.member.roles.cache.has(roleId)) {
                            await interaction.member.roles.remove(role);
                            return interaction.reply({ content: `<:no:1297814819105144862> **Removed:** ${role.name}`, flags: MessageFlags.Ephemeral });
                        } else {
                            await interaction.member.roles.add(role);
                            return interaction.reply({ content: `<:yes:1297814648417943565> **Added:** ${role.name}`, flags: MessageFlags.Ephemeral });
                        }
                    }
                } catch (e) {
                    console.error(e);
                    return interaction.reply({ content: "<:no:1297814819105144862> Error changing roles.", flags: MessageFlags.Ephemeral });
                }
            }
        }

        // ===============================================
        // 3. SELECT MENU HANDLERS
        // ===============================================
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId.startsWith('role_select_')) {
                const restrictionId = interaction.customId.replace('role_select_', '');
                if (restrictionId !== 'public' && restrictionId !== 'menu') {
                    if (!interaction.member.roles.cache.has(restrictionId)) {
                        return interaction.reply({ content: `<:no:1297814819105144862> You need the <@&${restrictionId}> role to use this menu!`, flags: MessageFlags.Ephemeral });
                    }
                }
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
                            if (!hasRole) { await interaction.member.roles.add(role); added.push(role.name); }
                        } else {
                            if (hasRole) { await interaction.member.roles.remove(role); removed.push(role.name); }
                        }
                    } catch (e) { console.error(`Error toggling role ${roleId}:`, e); }
                }
                let feedbackText = '';
                if (added.length || removed.length) {
                    if (added.length) feedbackText += `<:yes:1297814648417943565> **Added:** ${added.join(', ')}\n`;
                    if (removed.length) feedbackText += `<:no:1297814819105144862> **Removed:** ${removed.join(', ')}`;
                } else { feedbackText = 'No changes 🤔'; }
                return interaction.editReply({ content: feedbackText, components: [] });
            }
        }

        // ===============================================
        // 4. REGISTRATION SYSTEM (Grouped)
        // ===============================================
        
        // --- STEP 1: OPEN REGISTRATION FORM (Button) ---
        if (interaction.isButton() && interaction.customId === 'reg_btn_open') {
            const REGISTERED_ROLE_ID = '1456197055117787136';
            if (interaction.member.roles.cache.has(REGISTERED_ROLE_ID)) {
                return interaction.reply({ content: `<:no:1297814819105144862> You are already a member of the server!`, flags: MessageFlags.Ephemeral });
            }
            const modal = new ModalBuilder().setCustomId('reg_modal_submit').setTitle('Server Registration');
            const nameInput = new TextInputBuilder().setCustomId('reg_name').setLabel("Name").setStyle(TextInputStyle.Short).setPlaceholder("your desired name (e.g. Naif)").setMaxLength(15).setRequired(true);
            const countryInput = new TextInputBuilder().setCustomId('reg_country').setLabel("Country Flag").setStyle(TextInputStyle.Short).setPlaceholder("your country’s flag emoji (e.g. 🇵🇸)").setMaxLength(5).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(nameInput), new ActionRowBuilder().addComponents(countryInput));
            await interaction.showModal(modal);
        }

        // --- STEP 2: PROCESS REGISTRATION (Modal Submit) ---
        if (interaction.isModalSubmit() && interaction.customId === 'reg_modal_submit') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            // CONFIG
            const REGISTERED_ROLE_ID = '1456197055117787136';
            const UNVERIFIED_ROLE_ID = '1456238105345527932'; 
            const LOG_CHANNEL_ID = '1456197056988319871';

            const name = interaction.fields.getTextInputValue('reg_name');
            const country = interaction.fields.getTextInputValue('reg_country');
            const newNickname = `${country} | ${name}`;
            const member = interaction.member;

            if (newNickname.length > 32) return interaction.editReply({ content: `<:no:1297814819105144862> Nickname too long.` });

            try {
                // 1. Roles
                await member.roles.add(REGISTERED_ROLE_ID);
                if (member.roles.cache.has(UNVERIFIED_ROLE_ID)) {
                    await member.roles.remove(UNVERIFIED_ROLE_ID).catch(err => console.error("Could not remove Visitor role:", err));
                }

                // 2. Nickname
                let warning = "";
                if (member.id !== interaction.guild.ownerId && member.roles.highest.position < interaction.guild.members.me.roles.highest.position) {
                    await member.setNickname(newNickname);
                } else { warning = "\n*(Couldn't change nickname due to hierarchy)*"; }

                // 3. Log
                const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
                if (logChannel) {
                    const embed = new EmbedBuilder().setTitle('New Registration').setDescription(`User: ${member}\nName: **${name}**\nFrom: ${country}`).setColor(0x57F287).setThumbnail(member.user.displayAvatarURL());
                    await logChannel.send({ embeds: [embed] });
                }

                // 4. Update Counter (FIXED: Re-defining text instead of cloning)
                try {
                    const dashboardMsg = interaction.message; 
                    if (dashboardMsg) {
                        const oldContainer = dashboardMsg.components[0];
                        const role = interaction.guild.roles.cache.get(REGISTERED_ROLE_ID);
                        const newCount = role ? role.members.size : 'N/A';
                        
                        const newContainer = new ContainerBuilder()
                            .setAccentColor(oldContainer.accentColor || 0x808080); // Keep accent or default grey

                        // --- HARDCODED TEXT (Matching registration.js exactly) ---
                        newContainer.addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('### <:registration:1447143542643490848> Registration')
                        );
                        newContainer.addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`To access chat and connect to voice channels, please register below.\n\n**Note:**\n\`Name\` : followed by your desired name.\n\`Country\` : followed by your country’s flag emoji.`)
                        );
                        newContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
                        // ---------------------------------------------------------

                        const registerBtn = new ButtonBuilder().setCustomId('reg_btn_open').setLabel('Register').setStyle(ButtonStyle.Success);
                        const countBtn = new ButtonBuilder().setCustomId('reg_btn_stats').setLabel(`Total Registered: ${newCount}`).setStyle(ButtonStyle.Secondary).setDisabled(true);
                        
                        newContainer.addActionRowComponents(new ActionRowBuilder().addComponents(registerBtn, countBtn));
                        
                        await dashboardMsg.edit({ components: [newContainer], flags: MessageFlags.IsComponentsV2 });
                    }
                } catch (e) { console.error("Counter update failed", e); }

                return interaction.editReply({ content: `<:yes:1297814648417943565> You’re now a member of the server.` });

            } catch (error) {
                console.error(error);
                return interaction.editReply({ content: `<:no:1297814819105144862> Something went wrong.` });
            }
        }
    }
};
