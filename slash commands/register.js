const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Registeration')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('Your desired name (e.g., Ridouan)')
                .setRequired(true)
                .setMaxLength(25)
        )
        .addStringOption(option => 
            option.setName('country')
                .setDescription('Your country flag emoji (e.g., 🇸🇦, 🇹🇭)')
                .setRequired(true)
        ),

    async execute(interaction) {
        // --- 🔒 CHANNEL LOCK ---
        // The ID of the specific channel allowed
        const allowedChannelId = '1446065407713607812';

        // Check if the command was used in the wrong channel
        if (interaction.channelId !== allowedChannelId) {
            return interaction.reply({ 
                content: `❌ This command can only be used in <#${allowedChannelId}>`, 
                ephemeral: true 
            });
        }
        // -----------------------

        const name = interaction.options.getString('name');
        const country = interaction.options.getString('country');
        const member = interaction.member;
        
        // The Role ID you provided
        const registeredRoleId = '1446058693631148043';

        // --- CHECK 1: Already Registered? ---
        if (member.roles.cache.has(registeredRoleId)) {
            return interaction.reply({ 
                content: `❌ **You are already registered!** You cannot use this command again.`, 
                ephemeral: true 
            });
        }

        const newNickname = `${country}｜${name}`;

        // --- CHECK 2: Length Limit ---
        if (newNickname.length > 32) {
            return interaction.reply({ 
                content: `❌ The nickname **"${newNickname}"** is too long (${newNickname.length}/32).`, 
                ephemeral: true 
            });
        }

        // --- CHECK 3: Server Owner ---
        if (member.id === interaction.guild.ownerId) {
            return interaction.reply({ 
                content: `❌ I cannot change the **Server Owner's** nickname, but I will give you the role.`, 
                ephemeral: true 
            });
        }

        // --- CHECK 4: Bot Hierarchy ---
        if (member.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({ 
                content: `❌ I cannot change your nickname because your role is higher than mine.`, 
                ephemeral: true 
            });
        }

        try {
            // 1. Change Nickname
            await member.setNickname(newNickname);
            
            // 2. Add the Role
            await member.roles.add(registeredRoleId);

            return interaction.reply({ 
                content: `Your registration is complete.`,
                ephemeral: true 
            });

        } catch (error) {
            console.error(error);
            return interaction.reply({ 
                content: `❌ **Error:** I could not finish the registration.\n\n**Please check:**\n1. Does my bot have the **Manage Nicknames** & **Manage Roles** permissions?\n2. Is my Bot Role **higher** than the role <@&${registeredRoleId}> in Server Settings?`, 
                ephemeral: true 
            });
        }
    },
};
