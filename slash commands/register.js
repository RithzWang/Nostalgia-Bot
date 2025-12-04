const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    Colors 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Registration')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('Your desired name (e.g., Naif, Faisal)')
                .setRequired(true)
                .setMaxLength(25)
        )
        .addStringOption(option => 
            option.setName('country')
                .setDescription('Your country flag emoji (e.g., 🇸🇦, 🇩🇪)')
                .setRequired(true)
        ),

    async execute(interaction) {
        // --- 🔒 CHANNEL LOCK ---
        const allowedChannelId = '1446065407713607812';
        const logChannelId = '1187771223791378522'; // 📜 LOG CHANNEL ID

        if (interaction.channelId !== allowedChannelId) {
            return interaction.reply({ 
                content: `This command can only be used in <#${allowedChannelId}>`, 
                ephemeral: true 
            });
        }

        const name = interaction.options.getString('name');
        const country = interaction.options.getString('country');
        const member = interaction.member;
        const registeredRoleId = '1446058693631148043';

        if (member.roles.cache.has(registeredRoleId)) {
            return interaction.reply({ 
                content: `**You are already registered!**`, 
                ephemeral: true 
            });
        }

        const newNickname = `${country} | ${name}`;

        if (newNickname.length > 32) {
            return interaction.reply({ 
                content: `Nickname too long: **${newNickname}**`, 
                ephemeral: true 
            });
        }

        // Logic Check
        const isOwner = member.id === interaction.guild.ownerId;
        const isHigher = member.roles.highest.position >= interaction.guild.members.me.roles.highest.position;
        let warning = "";

        try {
            // 1. Give Role
            await member.roles.add(registeredRoleId);

            // 2. Change Nickname (if allowed)
            if (isOwner) warning = " (Owner: Nickname not changed)";
            else if (isHigher) warning = " (Role too high: Nickname not changed)";
            else await member.setNickname(newNickname);

            // 3. 📜 SEND LOG 📜
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                // Time
                const now = new Date();
                const timeString = now.toLocaleString('en-GB', { timeZone: 'Asia/Bangkok', hour12: false });
                
                const embed = new EmbedBuilder()
                    .setTitle('New Registration')
                    .setDescription(`User: ${member}\nNickname: **${newNickname}**${warning}`)
                    .setColor(Colors.Green) // Blue
                    .setThumbnail(member.user.displayAvatarURL());

                const button = new ButtonBuilder()
                    .setCustomId('log_reg_btn')
                    .setLabel(`${timeString} (GMT+7)`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true);
                
                const row = new ActionRowBuilder().addComponents(button);

                await logChannel.send({ embeds: [embed], components: [row] });
            }

            // 4. Reply to User
            return interaction.reply({ 
                content: `Your registration is complete.${warning ? "\n*" + warning + "*" : ""}`,
                ephemeral: true 
            });

        } catch (error) {
            console.error(error);
            return interaction.reply({ content: `Error during registration.`, ephemeral: true });
        }
    },
};
