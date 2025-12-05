module.exports = {
    name: 'createinvite',
    execute(message, args) {
        // 1. Check for the restricted role (from previous request)
        const restrictedRoleId = '1446058693631148043';
        if (message.member.roles.cache.has(restrictedRoleId)) {
            return message.channel.send({ content: 'You have a restricted role and cannot use this command.' });
        }

        // 2. Check permissions
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.channel.send({ content: 'You do not have permission to use this command.' });
        }

        // 3. Determine the target channel
        let targetChannel;

        if (args[0]) {
            // Case A: User provided an argument (e.g., !createinvite #general)
            // Try to find the channel by mention OR by ID
            targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0].replace(/\D/g, ''));

            if (!targetChannel) {
                return message.channel.send({ content: 'I could not find that channel. Please mention a valid channel.' });
            }
        } else {
            // Case B: User provided no argument (e.g., !createinvite)
            // Use the current channel
            targetChannel = message.channel;
        }

        // 4. Create the invite
        targetChannel.createInvite({
            maxAge: 0, // Permanent
            maxUses: 0, // Unlimited uses
            unique: true
        })
        .then(invite => {
            message.channel.send({ content: `Here is the permanent invite link for ${targetChannel.toString()}:\n${invite.url}` });
        })
        .catch(err => {
            console.error('Failed to create invite:', err);
            message.channel.send({ content: `I could not create an invite for ${targetChannel.toString()}. Make sure I have "Create Invite" permissions in that channel.` });
        });
    }
};
