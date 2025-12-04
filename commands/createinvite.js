module.exports = {
    name: 'createinvite',
    execute(message, args) {
        // 1. (Optional) Check for the restricted role from your previous request
        // If you want to block that specific role from creating invites, uncomment the lines below:
        /*
        const restrictedRoleId = '1446058693631148043';
        if (message.member.roles.cache.has(restrictedRoleId)) {
            return message.channel.send({ content: 'You have a restricted role and cannot use this command.' });
        }
        */

        // 2. Check if the user has Administrator permission
        // You can change 'ADMINISTRATOR' to 'CREATE_INSTANT_INVITE' if you want moderators to use it too.
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.channel.send({ content: 'You do not have permission to use this command.' });
        }

        // 3. Create the invite
        // maxAge: 0 means "Never expires"
        // maxUses: 0 means "Unlimited uses"
        message.channel.createInvite({
            maxAge: 0, 
            maxUses: 0,
            unique: true // Generates a new unique link every time
        })
        .then(invite => {
            // 4. Send the link to the chat
            message.channel.send({ content: `Here is your permanent invite link:\n${invite.url}` });
        })
        .catch(err => {
            console.error('Failed to create invite:', err);
            message.channel.send({ content: 'I could not create an invite. Please check my permissions (I need "Create Invite" permission).' });
        });
    }
};
