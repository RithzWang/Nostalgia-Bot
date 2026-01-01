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
        .setDescription('Register yourself to the server')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('Your desired name')
                .setRequired(true)
                .setMaxLength(25)
        )
        .addStringOption(option => 
            option.setName('country')
                .setDescription('Your country’s flag emoji')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

    async execute(interaction) {
        // Configuration
        const allowedChannelId = '1456197056250122352';
        const logChannelId = '1456197056988319871';
        const infoMessageId = '1456202328813076622';
        const registeredRoleId = '1456197055117787136'; // Role to ADD
        const unverifiedRoleId = '1456238105345527932'; // Role to REMOVE

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

            // Run in background
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

                const newDescription = `to be able to chat and connect to voice channels, use the command **</register:1456308351309971647>**\n\n> \`name:\` followed by your desired name\n> \`country:\` followed by your country’s flag emoji\n\n**Usage:**\n\`\`\`\n/register name: Naif country: 🇯🇴\n\`\`\``;

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
        // MAIN EXECUTION
        // ===========================================
        
        // 1. Channel Check
        if (interaction.channelId !== allowedChannelId) {
            return interaction.reply({ 
                content: `<:no:1297814819105144862> Please use <#${allowedChannelId}> to register.`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        // 2. Already Registered Check
        const member = interaction.member;
        if (member.roles.cache.has(registeredRoleId)) {
            return interaction.reply({ content: `<:no:1297814819105144862> **You are already registered!**`, flags: MessageFlags.Ephemeral });
        }

        // 3. Validation
        const name = interaction.options.getString('name');
        const country = interaction.options.getString('country');
        const newNickname = `${country} | ${name}`;

        if (newNickname.length > 32) {
            return interaction.reply({ content: `<:no:1297814819105144862> Name too long.`, flags: MessageFlags.Ephemeral });
        }

        try {
            // 4. Perform Actions
            // A. Add Registered Role
            await member.roles.add(registeredRoleId);

            // B. Remove Unverified Role (if they have it)
            if (member.roles.cache.has(unverifiedRoleId)) {
                await member.roles.remove(unverifiedRoleId).catch(console.error);
            }
            
            // C. Nickname Update
            const isOwner = member.id === interaction.guild.ownerId;
            const isHigher = member.roles.highest.position >= interaction.guild.members.me.roles.highest.position;
            let warning = "";
            
            if (!isOwner && !isHigher) {
                await member.setNickname(newNickname);
            } else {
                warning = " (Nickname check: Role too high)";
            }

            // D. Background Tasks
            sendLog('New Registration', `User: ${member}\nName: **${name}**\nFrom: ${country}\n${warning}`, Colors.Green, member);
            updateInfoMessage();

            // 5. Send SINGLE Immediate Reply (UPDATED MESSAGE)
            return interaction.reply({ 
                content: `<:yes:1297814648417943565> You’re now a member of the server.${warning ? "\n*" + warning + "*" : ""}`,
                flags: MessageFlags.Ephemeral
            });

        } catch (error) {
            console.error(error);
            if (!interaction.replied) {
                return interaction.reply({ content: "<:no:1297814819105144862> Error during registration.", flags: MessageFlags.Ephemeral });
            }
        }
    },
};
