// disable-rr.js
const enabledReactionRoles = require('./reactionrole'); // Adjust the path as needed

module.exports = {
    name: 'disable-rr',
    async execute(message, args) {
        try {
            if (!message.member.permissions.has('ADMINISTRATOR')) {
                return message.channel.send('You do not have permission to use this command.');
            }

            if (args.length < 1) {
                return message.channel.send('Usage: !disable-reactionrole [index]');
            }

            const index = parseInt(args[0]) - 1;
            const roles = enabledReactionRoles.get(message.channel.id);
            if (!roles || index < 0 || index >= roles.length) {
                return message.channel.send('Invalid index. Please provide a valid number from the list.');
            }

            roles.splice(index, 1);
            if (roles.length === 0) {
                enabledReactionRoles.delete(message.channel.id);
            }

            message.channel.send(`Reaction role ${index + 1} has been disabled.`);
        } catch (error) {
            console.error('Error in disable-rr command:', error);
            message.channel.send('An error occurred while disabling the reaction role. Please try again.');
        }
    }
};