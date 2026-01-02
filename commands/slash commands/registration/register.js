const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags,
    Colors,
    PermissionFlagsBits,
    // V2 Imports
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder // Imported to be safe
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
        const registeredRoleId = '1456197055117787136'; 
        const unverifiedRoleId = '1456238105345527932'; 

        // --- HELPER: LOGGING ---
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

        // --- HELPER: UPDATE INFO MESSAGE (FIXED V2) ---
        async function updateInfoMessage() {
            console.log("DEBUG: Starting Info Message Update...");
            try {
                const infoChannel = interaction.guild.channels.cache.get(allowedChannelId);
                if (!infoChannel) {
                    console.log("DEBUG: Info channel not found.");
                    return;
                }
                
                const infoMessage = await infoChannel.messages.fetch(infoMessageId).catch(() => null);
                if (!infoMessage) {
                    console.log("DEBUG: Info message not found (check ID).");
                    return;
                }
                
                const role = interaction.guild.roles.cache.get(registeredRoleId);
                const totalRegistered = role ? role.members.size : 'N/A';

                // 1. Text Content
                const headerText = new TextDisplayBuilder()
                    .setContent('### <:registration:1447143542643490848> Registration');

                const descText = new TextDisplayBuilder()
                    .setContent(`to be able to chat and connect to voice channels, use the command **</register:1456308351309971647>**\n\n> \`name:\` followed by your desired name\n> \`country:\` followed by your country’s flag emoji\n\n**Usage:**\n\`\`\`\n/register name: Naif country: 🇯🇴\n\`\`\``);

                // 2. Button Accessory (The "Total Registered" Button)
                const countButton = new ButtonBuilder()
                    .setCustomId('total_registered_stats')
                    .setLabel(`Total Registered: ${totalRegistered}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true);

                // 3. Create Section
                const mainSection = new SectionBuilder();
                mainSection.addTextDisplayComponents(headerText);
                mainSection.addTextDisplayComponents(descText);
                
                // FIX: Add the button INSIDE the section using the method we saw in your logs
                if (typeof mainSection.setButtonAccessory === 'function') {
                     mainSection.setButtonAccessory(countButton);
                } else {
                    console.log("⚠️ Warning: setButtonAccessory not found on SectionBuilder");
                }

                // 4. Create Container
                // We do NOT add a separate ActionRow, as the button is now inside the Section
                const container = new ContainerBuilder()
                    .setAccentColor(0x2B2D31)
                    .addSectionComponents(mainSection);

                // 5. Edit Message
                await infoMessage.edit({ 
                    content: '', 
                    embeds: [], 
                    components: [container], 
                    flags: MessageFlags.IsComponentsV2 
                });
                console.log("DEBUG: Info Message Updated Successfully.");

            } catch (err) {
                console.error("DEBUG CRASH in updateInfoMessage:", err);
            }
        }

        // ===========================================
        // MAIN EXECUTION
        // ===========================================
        
        if (interaction.channelId !== allowedChannelId) {
            return interaction.reply({ 
                content: `<:no:1297814819105144862> Please use <#${allowedChannelId}> to register.`, 
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
            await member.roles.add(registeredRoleId);

            if (member.roles.cache.has(unverifiedRoleId)) {
                await member.roles.remove(unverifiedRoleId).catch(console.error);
            }
            
            const isOwner = member.id === interaction.guild.ownerId;
            const isHigher = member.roles.highest.position >= interaction.guild.members.me.roles.highest.position;
            let warning = "";
            
            if (!isOwner && !isHigher) {
                await member.setNickname(newNickname);
            } else {
                warning = " (Nickname check: Role too high)";
            }

            // Run these but don't await them to block the reply
            sendLog('New Registration', `User: ${member}\nName: **${name}**\nFrom: ${country}\n${warning}`, Colors.Green, member);
            updateInfoMessage();

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
