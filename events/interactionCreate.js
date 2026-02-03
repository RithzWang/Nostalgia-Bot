const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder
} = require('discord.js');

// List of allowed flags as an exact Array
const ALLOWED_FLAGS = [
    "🇦🇨","🇦🇩","🇦🇪","🇦🇫","🇦🇬","🇦🇮","🇦🇱","🇦🇲","🇦🇴","🇦🇶","🇦🇷","🇦🇸","🇦🇹","🇦🇺","🇦🇼","🇦🇽","🇦🇿",
    "🇧🇦","🇧🇧","🇧🇩","🇧🇪","🇧🇫","🇧🇬","🇧🇭","🇧🇮","🇧🇯","🇧🇱","🇧🇲","🇧🇳","🇧🇴","🇧🇶","🇧🇷","🇧🇸","🇧🇹","🇧🇻","🇧🇼","🇧🇾","🇧🇿",
    "🇨🇦","🇨🇨","🇨🇩","🇨🇫","🇨🇬","🇨🇭","🇨🇮","🇨🇰","🇨🇱","🇨🇲","🇨🇳","🇨🇴","🇨🇵","🇨🇷","🇨🇺","🇨🇻","🇨🇼","🇨🇽","🇨🇾","🇨🇿",
    "🇩🇪","🇩🇬","🇩🇯","🇩🇰","🇩🇲","🇩🇴","🇩🇿","🇪🇦","🇪🇨","🇪🇪","🇪🇬","🇪🇭","🇪🇷","🇪🇸","🇪🇹","🇪🇺",
    "🇫🇮","🇫🇯","🇫🇰","🇫🇲","🇫🇴","🇫🇷","🇬🇦","🇬🇧","🇬🇩","🇬🇪","🇬🇫","🇬🇬","🇬🇭","🇬🇮","🇬🇱","🇬🇲","🇬🇳","🇬🇵","🇬🇶","🇬🇷","🇬🇸","🇬🇹","🇬🇺","🇬🇼","🇬🇾",
    "🇭🇰","🇭🇲","🇭🇳","🇭🇷","🇭🇹","🇭🇺","🇮🇨","🇮🇩","🇮🇪","🇮🇲","🇮🇳","🇮🇴","🇮🇶","🇮🇷","🇮🇸","🇮🇹",
    "🇯🇪","🇯🇲","🇯🇴","🇯🇵","🇰🇪","🇰🇬","🇰🇭","🇰🇮","🇰🇲","🇰🇳","🇰🇵","🇰🇷","🇰🇼","🇰🇾","🇰🇿",
    "🇱🇦","🇱🇧","🇱🇨","🇱🇮","🇱🇰","🇱🇷","🇱🇸","🇱🇹","🇱🇺","🇱🇻","🇱🇾","🇲🇦","🇲🇨","🇲🇩","🇲🇪","🇲🇫","🇲🇬","🇲🇭","🇲🇰","🇲🇱","🇲🇲","🇲🇳","🇲🇴","🇲🇵","🇲🇶","🇲🇷","🇲🇸","🇲🇹","🇲🇺","🇲🇻","🇲🇼","🇲🇽","🇲🇾","🇲🇿",
    "🇳🇦","🇳🇨","🇳🇪","🇳🇫","🇳🇬","🇳🇮","🇳🇱","🇳🇴","🇳🇵","🇳🇷","🇳🇺","🇳🇿","🇴🇲","🇵🇦","🇵🇪","🇵🇫","🇵🇬","🇵🇭","🇵🇰","🇵🇱","🇵🇲","🇵🇳","🇵🇷","🇵🇸","🇵🇹","🇵🇼","🇵🇾",
    "🇶🇦","🇷🇪","🇷🇴","🇷🇸","🇷🇺","🇷🇼","🇸🇦","🇸🇧","🇸🇨","🇸🇩","🇸🇪","🇸🇬","🇸🇭","🇸🇮","🇸🇯","🇸🇰","🇸🇱","🇸🇲","🇸🇳","🇸🇴","🇸🇷","🇸🇸","🇸🇹","🇸🇻","🇸🇽","🇸🇾","🇸🇿",
    "🇹🇦","🇹🇨","🇹🇩","🇹🇫","🇹🇬","🇹🇭","🇹🇯","🇹🇰","🇹🇱","🇹🇲","🇹🇳","🇹🇴","🇹🇷","🇹🇹","🇹🇻","🇹🇼","🇹🇿",
    "🇺🇦","🇺🇬","🇺🇲","🇺🇳","🇺🇸","🇺🇾","🇺🇿","🇻🇦","🇻🇨","🇻🇪","🇻🇬","🇻🇮","🇻🇳","🇻🇺","🇼🇫","🇼🇸","🇽🇰","🇾🇪","🇾🇹","🇿🇦","🇿🇲","🇿🇼",
    "🏴󠁧󠁢󠁥󠁮󠁧󠁿","🏴󠁧󠁢󠁳󠁣󠁴󠁿","🏴󠁧󠁢󠁷󠁬󠁳󠁿"
];

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {

        // ===============================================
        // 1. SLASH COMMAND HANDLER
        // ===============================================
        if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
            const command = client.slashCommands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(error);
                const errPayload = { content: '❌ Error executing command!', flags: MessageFlags.Ephemeral };
                if (interaction.replied || interaction.deferred) await interaction.followUp(errPayload);
                else await interaction.reply(errPayload);
            }
        }

        // ===============================================
        // 2. ROLE MENUS (SELECT MENU)
        // ===============================================
        else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('role_select_')) {
            const restrictionId = interaction.customId.replace('role_select_', '');
            
            // Check Restriction
            if (restrictionId !== 'public' && restrictionId !== 'menu') {
                if (!interaction.member.roles.cache.has(restrictionId)) {
                    return interaction.reply({ 
                        content: `<:no:1297814819105144862> <@&${restrictionId}> is required`, 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            }

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const selectedRoleIds = interaction.values;
            const allRoleIds = interaction.component.options.map(opt => opt.value);
            const added = [];
            const removed = [];
            const failed = [];

            for (const roleId of allRoleIds) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (!role) continue; 
                if (role.position >= interaction.guild.members.me.roles.highest.position) {
                    failed.push(role.name); continue;
                }
                const hasRole = interaction.member.roles.cache.has(roleId);
                const isSelected = selectedRoleIds.includes(roleId);
                try {
                    if (isSelected && !hasRole) { await interaction.member.roles.add(role); added.push(role.name); } 
                    else if (!isSelected && hasRole) { await interaction.member.roles.remove(role); removed.push(role.name); }
                } catch (e) { failed.push(role.name); }
            }

            let feedbackText = [];
            if (added.length > 0) feedbackText.push(`<:yes:1297814648417943565> **Added:** ${added.join(', ')}`);
            if (removed.length > 0) feedbackText.push(`<:no:1297814819105144862> **Removed:** ${removed.join(', ')}`);
            if (failed.length > 0) feedbackText.push(`⚠️ **Failed:** ${failed.join(', ')}`);
            if (feedbackText.length === 0) feedbackText.push('No changes made.');

            return interaction.editReply({ content: feedbackText.join('\n') });
        }

        // ===============================================
        // 3. ROLE BUTTONS (LEGACY & NEW)
        // ===============================================
        else if (interaction.isButton()) {

            // --- A. LEGACY ROLE BUTTONS (role_ID_MODE) ---
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

            // --- B. STANDARD & RESTRICTED ROLE BUTTONS ---
            const isStdMulti = interaction.customId.startsWith('btn_role_');
            const isStdSingle = interaction.customId.startsWith('btn_single_');
            const isRestrictedMulti = interaction.customId.startsWith('btn_r_');
            const isRestrictedSingle = interaction.customId.startsWith('btn_rs_');

            if (isStdMulti || isStdSingle || isRestrictedMulti || isRestrictedSingle) {
                let roleId, reqRoleId;
                let isSingleMode = false;

                // 1. PARSE IDs
                if (isStdMulti) roleId = interaction.customId.replace('btn_role_', '');
                else if (isStdSingle) { roleId = interaction.customId.replace('btn_single_', ''); isSingleMode = true; }
                else if (isRestrictedMulti) { const p = interaction.customId.split('_'); reqRoleId = p[2]; roleId = p[3]; }
                else if (isRestrictedSingle) { const p = interaction.customId.split('_'); reqRoleId = p[2]; roleId = p[3]; isSingleMode = true; }

                // 2. CHECK REQUIREMENT
                if (reqRoleId && !interaction.member.roles.cache.has(reqRoleId)) {
                    return interaction.reply({ 
                        content: `<:no:1297814819105144862> <@&${reqRoleId}> is required`, 
                        flags: MessageFlags.Ephemeral 
                    });
                }

                // 3. VALIDATE & EXECUTE
                const role = interaction.guild.roles.cache.get(roleId);
                if (!role || role.position >= interaction.guild.members.me.roles.highest.position) {
                    return interaction.reply({ content: '<:no:1297814819105144862> Invalid role configuration.', flags: MessageFlags.Ephemeral });
                }

                try {
                    if (isSingleMode) {
                        if (interaction.member.roles.cache.has(roleId)) {
                            await interaction.member.roles.remove(role);
                            return interaction.reply({ content: `<:no:1297814819105144862> **Removed:** ${role.name}`, flags: MessageFlags.Ephemeral });
                        }
                        // Remove others
                        const rolesToRemove = [];
                        const removedNames = [];
                        const container = interaction.message.components[0];
                        if (container) {
                            container.components.forEach(row => {
                                if (row.type === 1) row.components.forEach(btn => {
                                    if (!btn.customId) return;
                                    let otherId = null;
                                    if (btn.customId.startsWith('btn_single_')) otherId = btn.customId.replace('btn_single_', '');
                                    else if (btn.customId.startsWith('btn_rs_')) otherId = btn.customId.split('_')[3];
                                    if (otherId && otherId !== roleId && interaction.member.roles.cache.has(otherId)) rolesToRemove.push(otherId);
                                });
                            });
                        }
                        for (const rID of rolesToRemove) {
                            const r = interaction.guild.roles.cache.get(rID);
                            if (r) { await interaction.member.roles.remove(rID).catch(() => {}); removedNames.push(r.name); }
                        }
                        await interaction.member.roles.add(role);
                        let msg = `<:yes:1297814648417943565> **Added:** ${role.name}`;
                        if (removedNames.length > 0) msg += `\n<:no:1297814819105144862> **Removed:** ${removedNames.join(', ')}`;
                        return interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });

                    } else {
                        // Multi Toggle
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
                    return interaction.reply({ content: "Error changing roles.", flags: MessageFlags.Ephemeral });
                }
            }

            // ===============================================
            // 4. REGISTRATION (PART 1: BUTTON)
            // ===============================================
            if (interaction.customId === 'reg_btn_open') {
                const REGISTERED_ROLE_ID = '1456197055117787136';
                if (interaction.member.roles.cache.has(REGISTERED_ROLE_ID)) {
                    return interaction.reply({ content: `<:no:1297814819105144862> You are already registered!`, flags: MessageFlags.Ephemeral });
                }
                const modal = new ModalBuilder().setCustomId('reg_modal_submit').setTitle('A2-Q Registration');
                const nameInput = new TextInputBuilder().setCustomId('reg_name').setLabel("Name").setStyle(TextInputStyle.Short).setPlaceholder("e.g. Naif, PrimeQahtani").setMaxLength(20).setRequired(true);
                const countryInput = new TextInputBuilder().setCustomId('reg_country').setLabel("Country Flag").setStyle(TextInputStyle.Short).setPlaceholder("e.g. 🇵🇸, 🏴󠁧󠁢󠁥󠁮󠁧󠁿").setMaxLength(10).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(nameInput), new ActionRowBuilder().addComponents(countryInput));
                await interaction.showModal(modal);
            }
        }

        // ===============================================
        // 5. REGISTRATION (PART 2: MODAL SUBMIT)
        // ===============================================
        else if (interaction.isModalSubmit() && interaction.customId === 'reg_modal_submit') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const name = interaction.fields.getTextInputValue('reg_name');
            const countryInput = interaction.fields.getTextInputValue('reg_country').trim();

            // --- STRICT FLAG VALIDATION (ARRAY CHECK) ---
            if (!ALLOWED_FLAGS.includes(countryInput)) {
                return interaction.editReply({ 
                    content: `<:no:1297814819105144862> Please fill **Country Flag** with a valid country flag emoji only.` 
                });
            }

            const REGISTERED_ROLE_ID = '1456197055117787136';
            const UNVERIFIED_ROLE_ID = '1456238105345527932'; 
            const LOG_CHANNEL_ID = '1456197056988319871';

            const newNickname = `${countryInput} | ${name}`;
            const member = interaction.member;

            if (newNickname.length > 32) return interaction.editReply({ content: `<:no:1297814819105144862> Nickname too long (Max 32 chars).` });

            try {
                // 1. Assign Role & Rename
                await member.roles.add(REGISTERED_ROLE_ID);
                if (member.roles.cache.has(UNVERIFIED_ROLE_ID)) {
                    await member.roles.remove(UNVERIFIED_ROLE_ID).catch(err => console.error("Could not remove Visitor role:", err));
                }
                if (member.id !== interaction.guild.ownerId && member.roles.highest.position < interaction.guild.members.me.roles.highest.position) {
                    await member.setNickname(newNickname);
                } 

                // 2. Send Log (New Container Style)
                const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
                if (logChannel) {
                    // Generate Timestamp (GMT+7)
                    const now = new Date();
                    const timeString = now.toLocaleString('en-GB', { 
                        timeZone: 'Asia/Bangkok', 
                        year: 'numeric', month: '2-digit', day: '2-digit', 
                        hour: '2-digit', minute: '2-digit' 
                    });

                    const logContainer = new ContainerBuilder()
                        .setAccentColor(8947848) 
                        .addSectionComponents(
                            new SectionBuilder()
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ size: 128 }))
                                )
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent("### New Registration"),
                                    new TextDisplayBuilder().setContent(`**User:** ${member} \`(${member.user.username})\`\n**ID:** \`${member.id}\`\n**Name:** ${name}\n**Country:** ${countryInput}`),
                                ),
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`-# ⏱️ ${timeString} GMT+7`),
                        );

                    await logChannel.send({ 
                        components: [logContainer], 
                        flags: MessageFlags.IsComponentsV2,
                        allowedMentions: { parse: [] } 
                    });
                }
                
                // 3. Update Dashboard Counter
                try {
                    const dashboardMsg = interaction.message; 
                    if (dashboardMsg) {
                        const role = interaction.guild.roles.cache.get(REGISTERED_ROLE_ID);
                        const newCount = role ? role.members.size : 'N/A';
                        const newContainer = new ContainerBuilder();
                        newContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent('# <:A2Q_1:1466981218758426634><:A2Q_2:1466981281060360232> » Registration'));
                        newContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(`To access chat and connect to voice channels, please register below.\n\n**Note:**\n\`Name\` : your desired name.\n\`Country\` : your country’s flag emoji.`));
                        newContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false));
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
