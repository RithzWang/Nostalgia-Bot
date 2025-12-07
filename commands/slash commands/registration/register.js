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
                .setDescription('Your country flag emoji')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

    async execute(interaction) {
        const allowedChannelId = '1446065407713607812';
        const logChannelId = '1187771223791378522';
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

            logChannel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] }).catch(console.error);
        }

        // ===========================================
        // MAIN EXECUTION
        // ===========================================
        
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
            // 1. Add Role (This triggers the event in step 1 automatically!)
            await member.roles.add(registeredRoleId);
            
            const isOwner = member.id === interaction.guild.ownerId;
            const isHigher = member.roles.highest.position >= interaction.guild.members.me.roles.highest.position;
            let warning = "";
            
            if (!isOwner && !isHigher) {
                await member.setNickname(newNickname);
            } else {
                warning = " (Nickname check: Role too high)";
            }

            // 2. Log it
            sendLog('New Registration', `User: ${member}\nName: **${name}**\nFrom: ${country}\n${warning}`, Colors.Green, member);

            // 3. Reply
            return interaction.reply({ 
                content: `<:yes:1297814648417943565> Your registration is complete.${warning ? "\n*" + warning + "*" : ""}`,
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
