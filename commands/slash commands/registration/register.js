const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags,
    Colors,
    PermissionFlagsBits
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Registration System')
        // 1. User Subcommand: Submit
        .addSubcommand(sub => 
            sub.setName('submit')
                .setDescription('Register yourself to the server')
                .addStringOption(option => 
                    option.setName('name')
                        .setDescription('Your desired name')
                        .setRequired(true)
                        .setMaxLength(25)
                )
                .addStringOption(option => 
                    option.setName('country')
                        .setDescription('Your country flag emoji')
                        .setRequired(true)
                )
        )
        // 2. Admin Subcommand: Update
        .addSubcommand(sub =>
            sub.setName('update')
                .setDescription('Update a member\'s registration (Staff Only)')
                .addUserOption(option =>
                    option.setName('member')
                        .setDescription('The member to update')
                        .setRequired(true)
                )
                .addStringOption(option => 
                    option.setName('name')
                        .setDescription('New name')
                        .setRequired(true)
                        .setMaxLength(25)
                )
                .addStringOption(option => 
                    option.setName('country')
                        .setDescription('New country flag')
                        .setRequired(true)
                )
        )
        // 3. Admin Subcommand: Revoke
        .addSubcommand(sub =>
            sub.setName('revoke')
                .setDescription('Revoke registration (Staff Only)')
                .addUserOption(option =>
                    option.setName('member')
                        .setDescription('The member to revoke')
                        .setRequired(true)
                )
                .addStringOption(option => 
                    option.setName('reason')
                        .setDescription('Reason for revocation')
                        .setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const allowedChannelId = '1446065407713607812';
        const logChannelId = '1187771223791378522';
        const infoMessageId = '1446221552084582430';
        const registeredRoleId = '1446058693631148043';

        // --- HELPER: LOGGING FUNCTION ---
        async function sendLog(title, desc, color, targetMember) {
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (!logChannel) return;

            const now = new Date();
            const timeString = now.toLocaleString('en-GB', { timeZone: 'Asia/Bangkok', hour12: false });

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(desc)
                .setColor(color)
                .setThumbnail(targetMember.user.displayAvatarURL());

            const button = new ButtonBuilder()
                .setCustomId('log_timestamp')
                .setLabel(`${timeString} (GMT+7)`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

            // We do not await this, so it runs in the background and doesn't delay the user reply
            logChannel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] }).catch(console.error);
        }

        // --- HELPER: UPDATE INFO MESSAGE FUNCTION ---
        async function updateInfoMessage() {
            try {
                const infoChannel = interaction.guild.channels.cache.get(allowedChannelId);
                if (!infoChannel) return;
                
                const infoMessage = await infoChannel.messages.fetch(infoMessageId);
                
                const role = interaction.guild.roles.cache.get(registeredRoleId);
                const totalRegistered = role ? role.members.size : 'N/A';

                const newDescription = `to be able to chat and connect to voice channels, use the command **</register submit:1446387435130064941>**\n\n> \`name:\` followed by your name\n> \`country:\` followed by your country’s flag emoji\n\n**Example:**\n\`\`\`\n/register submit name: Naif country: 🇬🇧\n\`\`\``;

                const countButton = new ButtonBuilder()
                    .setCustomId('total_registered_stats')
                    .setLabel(`Total Registered: ${totalRegistered}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true);

                const row = new ActionRowBuilder().addComponents(countButton);

                if (infoMessage.embeds.length > 0) {
                    const updatedEmbed = EmbedBuilder.from(infoMessage.embeds[0]).setDescription(newDescription);
                    // Run in background
                    infoMessage.edit({ embeds: [updatedEmbed], components: [row] }).catch(console.error);
                }
            } catch (err) {
                console.error("Info update failed:", err);
            }
        }

        // ===========================================
        // 1️⃣ SUBCOMMAND: SUBMIT
        // ===========================================
        if (subcommand === 'submit') {
            if (interaction.channelId !== allowedChannelId) {
                return interaction.reply({ 
                    content: `Please use <#${allowedChannelId}> to register.`, 
                    flags: MessageFlags.Ephemeral 
                });
            }

            const member = interaction.member;
            if (member.roles.cache.has(registeredRoleId)) {
                return interaction.reply({ content: `<:no:1297814819105144862> **You are already registered!**`, flags: MessageFlags.Ephemeral });
            }

            const name = interaction.options.getString('name');
            const country = interaction.options.getString('country');
            const newNickname = `${country} | ${name}`;

            if (newNickname.length > 32) {
                return interaction.reply({ content: `<:no:1297814819105144862> Name too long.`, flags: MessageFlags.Ephemeral });
            }

            try {
                // 1. Perform Actions BEFORE Replying
                await member.roles.add(registeredRoleId);
                
                const isOwner = member.id === interaction.guild.ownerId;
                const isHigher = member.roles.highest.position >= interaction.guild.members.me.roles.highest.position;
                let warning = "";
                
                if (!isOwner && !isHigher) {
                    await member.setNickname(newNickname);
                } else {
                    warning = " (Nickname check: Role too high)";
                }

                // Run these in background so we can reply faster
                sendLog('New Registration', `User: ${member}\nName: **${name}**\nFrom: ${country}\n${warning}`, Colors.Green, member);
                updateInfoMessage();

                // 2. Send SINGLE Immediate Reply
                return interaction.reply({ 
                    content: `<:yes:1297814648417943565> Your registration is complete.${warning ? "\n*" + warning + "*" : ""}`,
                    flags: MessageFlags.Ephemeral
                });

            } catch (error) {
                console.error(error);
                // Only reply with error if we haven't replied yet
                if (!interaction.replied) {
                    return interaction.reply({ content: "<:no:1297814819105144862> Error during registration.", flags: MessageFlags.Ephemeral });
                }
            }
        }

        // ===========================================
        // 2️⃣ SUBCOMMAND: UPDATE
        // ===========================================
        if (subcommand === 'update') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
                return interaction.reply({ content: "<:no:1297814819105144862> You do not have permission.", flags: MessageFlags.Ephemeral });
            }

            const targetMember = interaction.options.getMember('member');
            const name = interaction.options.getString('name');
            const country = interaction.options.getString('country');
            const newNickname = `${country} | ${name}`;

            try {
                if (!targetMember.roles.cache.has(registeredRoleId)) {
                    await targetMember.roles.add(registeredRoleId);
                }

                await targetMember.setNickname(newNickname);
                
                sendLog('Registration Updated', `Admin: ${interaction.user}\nTarget: ${targetMember}\nNew Name: **${name}**\nNew Country: ${country}`, Colors.Blue, targetMember);
                
                return interaction.reply({ 
                    content: `<:yes:1297814648417943565> Updated ${targetMember}'s registration.`, flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                console.error(error);
                if (!interaction.replied) {
                    return interaction.reply({ content: `<:no:1297814819105144862> Could not update user (Check hierarchy).`, flags: MessageFlags.Ephemeral });
                }
            }
        }

        // ===========================================
        // 3️⃣ SUBCOMMAND: REVOKE
        // ===========================================
        if (subcommand === 'revoke') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
                return interaction.reply({ content: "<:no:1297814819105144862> You do not have permission.", flags: MessageFlags.Ephemeral });
            }

            const targetMember = interaction.options.getMember('member');
            const reason = interaction.options.getString('reason');
            const cleanDisplayName = targetMember.user.displayName.substring(0, 29);
            const resetNickname = `⁉️・${cleanDisplayName}`;

            try {
                await targetMember.roles.remove(registeredRoleId);
                await targetMember.setNickname(resetNickname);

                sendLog(
                    'Registration Revoked', 
                    `Admin: ${interaction.user}\nTarget: ${targetMember}\nReason: **${reason}**\nAction: Role removed & Nickname reset`, 
                    Colors.Red, 
                    targetMember
                );
                
                updateInfoMessage(); 

                return interaction.reply({ 
                    content: `<:yes:1297814648417943565> Revoked registration for ${targetMember}.`, flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                console.log(error);
                if (!interaction.replied) {
                    return interaction.reply({ content: `<:no:1297814819105144862> Could not revoke user (Check hierarchy).`, flags: MessageFlags.Ephemeral });
                }
            }
        }
    },
};
