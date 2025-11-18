const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
// ... other imports and your client setup

// Make sure your createWelcomeImage function is available here
// (e.g., pasted above this code block or imported from another file)

client.on('guildMemberAdd', async (member) => {
    // ... (Your existing checks and invite fetching logic) ...
    if (member.user.bot) {
        return;
    }

    // Assuming serverID, welcomeLog, colourEmbed are defined in your scope
    if (member.guild.id === serverID) {
        let memberId = member.user.id;
        let memberUserName = member.user.username;
        let memberCount = member.guild.memberCount;

        const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;

        // Fetch invites for the guild
        // NOTE: In a real-world bot, you should cache invites and update on GUEST_JOIN
        // to reliably track the specific invite used. For simplicity, this is kept here.
        const guildInvites = await member.guild.invites.fetch();

        // Find the invite that has a use and track the inviter
        // In a real bot, you'd compare current uses to cached uses to find the delta
        const usedInvite = guildInvites.find((invite) => invite.uses > 0 && invite.inviter && invite.inviter.id !== client.user.id);
        
        // Get inviter's name, invite code, and type
        const inviterName = usedInvite ? usedInvite.inviter.username : 'Unknown';
        const inviterId = usedInvite ? usedInvite.inviter.id : 'Unknown';
        const inviteCode = usedInvite ? usedInvite.code : 'Unknown';


        // --- CUSTOM IMAGE GENERATION & ATTACHMENT ---
        const welcomeImageBuffer = await createWelcomeImage(member);
        const attachment = new AttachmentBuilder(welcomeImageBuffer, { name: 'welcome-image.png' });
        // The URL for the image within the message
        const imageURL = 'attachment://welcome-image.png'; 
        // ---------------------------------------------


        const embed = new EmbedBuilder()
            .setDescription(
                `### <a:wave:1440327983326822400> Welcome to A2-Q Server\n-# <@${memberId}> \`(${memberUserName})\`\n-# <:calendar:1439970556534329475> Account Created: ${accountCreated}\n-# <:users:1439970561953501214> Member Count: \`${memberCount}\`\n-# <:chain:1439970559105564672> Invited by <@${inviterId}> \`(${inviterName})\` using [\`${inviteCode}\`](https://discord.gg/${inviteCode}) invite`
            )
            .setThumbnail(member.user.displayAvatarURL())
            // Use the attachment URL in .setImage()
            .setImage(imageURL) 
            .setColor(colourEmbed);

        // Send the message with both the embed and the attachment
        client.channels.cache.get(welcomeLog).send({ 
            embeds: [embed],
            files: [attachment] // CRITICAL: Send the AttachmentBuilder here
        });
    }
});
