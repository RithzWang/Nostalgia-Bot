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
                            return interaction.reply({ content: `<:no:1297814819105144862> **Removed** ${role.name}.`, flags: MessageFlags.Ephemeral });
                        } else {
                            await interaction.member.roles.add(role);
                            return interaction.reply({ content: `<:yes:1297814648417943565> **Added** ${role.name}.`, flags: MessageFlags.Ephemeral });
                        }
                    }
                } catch (e) {
                    return interaction.reply({ content: "❌ I cannot manage this role.", flags: MessageFlags.Ephemeral });
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
                        // Toggle off if already have it
                        if (interaction.member.roles.cache.has(roleId)) {
                             await interaction.member.roles.remove(role);
                             return interaction.reply({ content: `<:no:1297814819105144862> **Removed:** ${role.name}`, flags: MessageFlags.Ephemeral });
                        }
                        
                        // Remove other roles in the same group
                        const rolesToRemove = [];
                        const removedNames = [];
                        const container = interaction.message.components[0]; 
                        if (container) {
                            // Recursively find buttons in the container
                            const findButtons = (components) => {
                                components.forEach(comp => {
                                    if (comp.type === 1) { // ActionRow
                                        comp.components.forEach(btn => {
                                            if (btn.customId && btn.customId.startsWith('btn_single_')) {
                                                const otherId = btn.customId.replace('btn_single_', '');
                                                if (otherId !== roleId && interaction.member.roles.cache.has(otherId)) {
                                                    rolesToRemove.push(otherId);
                                                }
                                            }
                                        });
                                    }
                                });
                            };
                            if (container.components) findButtons(container.components);
                        }

                        for (const rID of rolesToRemove) {
                            const r = interaction.guild.roles.cache.get(rID);
                            if (r) {
                                await interaction.member.roles.remove(rID).catch(() => {});
                                removedNames.push(r.name);
                            }
                        }

                        await interaction.member.roles.add(role);
                        let msg = `<:yes:1297814648417943565> **Added:** ${role.name}`;
                        if (removedNames.length > 0) msg += `\n<:no:1297814819105144862> **Removed:** ${removedNames.join(', ')}`;
                        return interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });

                    } else {
                        // Multi Mode
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
        // 3. SELECT MENU HANDLERS (UPDATED & SECURE)
        // ===============================================
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId.startsWith('role_select_')) {
                // A. Check Restrictions
                const restrictionId = interaction.customId.replace('role_select_', '');
                if (restrictionId !== 'public' && restrictionId !== 'menu') {
                    if (!interaction.member.roles.cache.has(restrictionId)) {
                        return interaction.reply({ 
                            content: `<:no:1297814819105144862> You need the <@&${restrictionId}> role to use this menu`, 
                            flags: MessageFlags.Ephemeral 
                        });
                    }
                }

                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const selectedRoleIds = interaction.values;
                // Get all possible roles from the menu options to know what was UNSELECTED
                const allRoleIds = interaction.component.options.map(opt => opt.value);
                
                const added = [];
                const removed = [];
                const failed = [];

                for (const roleId of allRoleIds) {
                    const role = interaction.guild.roles.cache.get(roleId);
                    
                    if (!role) continue; // Role might have been deleted from server

                    // Safety Check: Hierarchy
                    if (role.position >= interaction.guild.members.me.roles.highest.position) {
                        failed.push(role.name);
                        continue;
                    }

                    const hasRole = interaction.member.roles.cache.has(roleId);
                    const isSelected = selectedRoleIds.includes(roleId);

                    try {
                        if (isSelected && !hasRole) {
                            await interaction.member.roles.add(role);
                            added.push(role.name);
                        } 
                        else if (!isSelected && hasRole) {
                            await interaction.member.roles.remove(role);
                            removed.push(role.name);
                        }
                    } catch (e) {
                        console.error(`Error toggling role ${role.name}:`, e);
                        failed.push(role.name);
                    }
                }

                // Feedback Message construction
                let feedbackText = [];
                if (added.length > 0) feedbackText.push(`<:yes:1297814648417943565> **Added:** ${added.join(', ')}`);
                if (removed.length > 0) feedbackText.push(`<:no:1297814819105144862> **Removed:** ${removed.join(', ')}`);
                if (failed.length > 0) feedbackText.push(`⚠️ **Failed (Hierarchy/Perms):** ${failed.join(', ')}`);

                if (feedbackText.length === 0) feedbackText.push('No changes made.');

                return interaction.editReply({ content: feedbackText.join('\n') });
            }
        }

        // ===============================================
        // 4. REGISTRATION SYSTEM
        // ===============================================
        
        // --- STEP 1: OPEN REGISTRATION FORM (Button) ---
        if (interaction.isButton() && interaction.customId === 'reg_btn_open') {
            const REGISTERED_ROLE_ID = '1456197055117787136';
            if (interaction.member.roles.cache.has(REGISTERED_ROLE_ID)) {
                return interaction.reply({ content: `<:no:1297814819105144862> You are already registered!`, flags: MessageFlags.Ephemeral });
            }
            const modal = new ModalBuilder().setCustomId('reg_modal_submit').setTitle('A2-Q Registration');
            const nameInput = new TextInputBuilder().setCustomId('reg_name').setLabel("Name").setStyle(TextInputStyle.Short).setPlaceholder("e.g. Naif, PrimeQahtani").setMaxLength(15).setRequired(true);
            const countryInput = new TextInputBuilder().setCustomId('reg_country').setLabel("Country Flag").setStyle(TextInputStyle.Short).setPlaceholder("e.g. 🇵🇸, 🏴󠁧󠁢󠁥󠁮󠁧󠁿").setMaxLength(7).setRequired(true);
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

                // 4. Update Counter
                try {
                    const dashboardMsg = interaction.message; 
                    if (dashboardMsg) {
                        const oldContainer = dashboardMsg.components[0];
                        const role = interaction.guild.roles.cache.get(REGISTERED_ROLE_ID);
                        const newCount = role ? role.members.size : 'N/A';
                        
                        const newContainer = new ContainerBuilder()
                            .setAccentColor(oldContainer.accentColor || 0x808080);

                        newContainer.addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('### <:registration:1447143542643490848> A2-Q Registration')
                        );
                        newContainer.addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`To access chat and connect to voice channels, please register below.\n\n**Note:**\n\`Name\` : your desired name.\n\`Country\` : your country’s flag emoji.`)
                        );
                        newContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

                        const registerBtn = new ButtonBuilder().setCustomId('reg_btn_open').setLabel('Register').setStyle(ButtonStyle.Primary);
                        const countBtn = new ButtonBuilder().setCustomId('reg_btn_stats').setLabel(`Total Registered: ${newCount}`).setStyle(ButtonStyle.Secondary).setDisabled(true);
                        
                        newContainer.addActionRowComponents(new ActionRowBuilder().addComponents(registerBtn, countBtn));
                        
                        await dashboardMsg.edit({ components: [newContainer], flags: MessageFlags.IsComponentsV2 });
                    }
                } catch (e) { console.error("Counter update failed", e); }

                return interaction.editReply({ content: `<:yes:1297814648417943565> Welcome! You’re now a member of the server.` });

            } catch (error) {
                console.error(error);
                return interaction.editReply({ content: `<:no:1297814819105144862> Something went wrong.` });
            }
        }
    }
};