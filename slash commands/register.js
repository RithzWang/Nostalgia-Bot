const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Registration')
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
        const allowedChannelId = '1446065407713607812';
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

        // --- CHECK 1: Already Registered? ---
        if (member.roles.cache.has(registeredRoleId)) {
            return interaction.reply({ 
                content: `**You are already registered!** You cannot use this command again.`, 
                ephemeral: true 
            });
        }

        const newNickname = `${country} | ${name}`;

        // --- CHECK 2: Length Limit ---
        if (newNickname.length > 32) {
            return interaction.reply({ 
                content: `The nickname **"${newNickname}"** is too long (${newNickname.length}/32).`, 
                ephemeral: true 
            });
        }

        // --- PREPARE LOGIC ---
        let nicknameChanged = false;
        let warningMessage = "";

        // Check if we ALLOW changing the nickname
        const isOwner = member.id === interaction.guild.ownerId;
        const isHigherThanBot = member.roles.highest.position >= interaction.guild.members.me.roles.highest.position;

        try {
            // 1. Give the Role (Always happens if checks pass)
            await member.roles.add(registeredRoleId);

            // 2. Handle Nickname
            if (isOwner) {
                warningMessage = "\n*(I could not change your nickname because you are the Server Owner, but I gave you the role.)*";
            } else if (isHigherThanBot) {
                warningMessage = "\n*(I could not change your nickname because your role is higher than mine, but I gave you the role.)*";
            } else {
                // Safe to change nickname
                await member.setNickname(newNickname);
                nicknameChanged = true;
            }

            // 3. Send Success Reply
            return interaction.reply({ 
                content: `Your registration is complete.${warningMessage}`,
                ephemeral: true 
            });

        } catch (error) {
            console.error(error);
            return interaction.reply({ 
                content: `**Error:** I could not finish the registration.\n\n**Please check:**\n1. Does my bot have the **Manage Nicknames** & **Manage Roles** permissions?\n2. Is my Bot Role **higher** than the role <@&${registeredRoleId}>?`, 
                ephemeral: true 
            });
        }
    },
};
