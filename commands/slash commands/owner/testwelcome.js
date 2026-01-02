const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { createWelcomeImage } = require('../../../welcomeCanvas.js'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testwelcome')
        .setDescription('Simulate the welcome card for a specific user')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to generate the image for (default is you)')
        ),
    
    async execute(interaction) {
        await interaction.deferReply(); 

        try {
            const member = interaction.options.getMember('target') || interaction.member;

            const welcomeImageBuffer = await createWelcomeImage(member);
            const attachment = new AttachmentBuilder(welcomeImageBuffer, { name: 'welcome-image.png' });

            const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;
            const memberCount = interaction.guild.memberCount;
            
            const inviterName = interaction.user.username;
            const inviterId = interaction.user.id;
            const inviteCode = 'TEST-CODE';
            const colourEmbed = '#888888'; 

            const embed = new EmbedBuilder()
                .setDescription(`### Welcome to A2-Q Server\n-# <@${member.user.id}> \`(${member.user.username})\`\n-# <:calendar:1439970556534329475> Account Created: ${accountCreated}\n-# <:users:1439970561953501214> Member Count: \`${memberCount}\`\n-# <:chain:1439970559105564672> Invited by <@${inviterId}> \`(${inviterName})\` using [\`${inviteCode}\`](https://discord.gg/${inviteCode}) invite`)
                .setThumbnail(member.user.displayAvatarURL())
                .setImage('attachment://welcome-image.png')
                .setColor(colourEmbed);

            const unclickableButton = new ButtonBuilder()
                .setLabel(`${member.user.id}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('1441133157855395911')
                .setCustomId('hello_button_disabled')
                .setDisabled(true);

            const row = new ActionRowBuilder().addComponents(unclickableButton);

            await interaction.editReply({ 
                content: `**[SIMULATION]** Welcome card for ${member.user.tag}`,
                embeds: [embed], 
                files: [attachment], 
                components: [row] 
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Something went wrong generating the image.' });
        }
    }
};
