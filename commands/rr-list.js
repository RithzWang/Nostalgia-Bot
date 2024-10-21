// rr-list.js
const { MessageEmbed } = require('discord.js');
const enabledReactionRoles = require('./reactionrole'); // Adjust the path as needed

module.exports = {
    name: 'rr-list',
    async execute(message) {
        try {
            const roles = enabledReactionRoles.get(message.channel.id);
            if (!roles || roles.length === 0) {
                return message.channel.send('No reaction roles are currently set up for this channel.');
            }

            const embed = new MessageEmbed()
                .setTitle('Active Reaction Roles')
                .setColor('#888888')
                .setDescription(roles.map((item, index) => `${index + 1} ${item.emoji} ${item.role}`).join('\n'));

            message.channel.send(embed);
        } catch (error) {
            console.error('Error in rr-list command:', error);
            message.channel.send('An error occurred while listing reaction roles. Please try again.');
        }
    }
};