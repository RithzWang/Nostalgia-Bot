module.exports = {
    name: 'reactionrole',
    aliases: ['rr'],
    async execute(message, args) {
        // Check if the user has the required permissions
        if (!message.member.permissions.has('MANAGE_ROLES')) {
            return message.channel.send('You do not have permission to use this command.');
        }

        // Check if the correct number of arguments is provided
        if (args.length < 3) {
            return message.channel.send('Usage: !reactionrole [message id] [role name] [emoji]');
        }

        const messageId = args[0]; // The ID of the message to react to
        const roleName = args[1]; // The name of the role to assign
        const emoji = args[2]; // The emoji to react with

        // Find the role by name
        const role = message.guild.roles.cache.find(r => r.name === roleName);
        if (!role) {
            return message.channel.send('Role not found.');
        }

        // Fetch the message by ID
        let targetMessage;
        try {
            targetMessage = await message.channel.messages.fetch(messageId);
        } catch (error) {
            return message.channel.send('Message not found. Please check the message ID.');
        }

        // Add the reaction to the specified message
        await targetMessage.react(emoji);

        // Create a reaction collector
        const filter = (reaction, user) => {
            return reaction.emoji.name === emoji && !user.bot; // Only collect the specified emoji from non-bots
        };

        const collector = targetMessage.createReactionCollector(filter, { dispose: true });

        collector.on('collect', (reaction, user) => {
            const member = message.guild.members.cache.get(user.id);
            if (member) {
                member.roles.add(role).catch(err => console.error(err));
                message.channel.send(`${user.username} has been given the ${roleName} role!`);
            }
        });

        collector.on('remove', (reaction, user) => {
            const member = message.guild.members.cache.get(user.id);
            if (member) {
                member.roles.remove(role).catch(err => console.error(err));
                message.channel.send(`${user.username} has had the ${roleName} role removed!`);
            }
        });
    }
};