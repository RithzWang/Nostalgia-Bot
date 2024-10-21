const { MessageEmbed } = require('discord.js');
const enabledReactionRoles = new Map();

module.exports = {
    name: 'rr-remove',
    aliases: ['rrremove'],
    async execute(message, args) {
        // Check if the user has the required permissions
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.channel.send('You do not have permission to use this command.');
        }

        // Check if the correct number of arguments is provided
        if (args.length < 2) {
            return message.channel.send('Usage: !rr-remove [channel mention] [message ID]');
        }

        const channelMention = args[0]; // The channel mention
        const messageId = args[1]; // The message ID as the 2nd argument

        // Fetch the target channel
        const targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(channelMention.replace(/[<#>]/g, ''));
        if (!targetChannel) {
            return message.channel.send('Channel not found. Please mention a valid channel.');
        }

        // Fetch the message by ID in the specified channel
        let targetMessage;
        try {
            targetMessage = await targetChannel.messages.fetch(messageId);
        } catch (error) {
            return message.channel.send('Message not found. Please check the message ID.');
        }

        // Check if the reaction role exists for this message
        if (!enabledReactionRoles.has(targetChannel.id)) {
            return message.channel.send('No reaction roles are set for this channel.');
        }

        const roles = enabledReactionRoles.get(targetChannel.id);
        const index = roles.findIndex(roleObj => roleObj.messageId === messageId);

        if (index === -1) {
            return message.channel.send('No reaction role found for this message.');
        }

        // Remove the role from the map
        roles.splice(index, 1);
        if (roles.length === 0) {
            enabledReactionRoles.delete(targetChannel.id);
        }

        // Stop the reaction collector if it exists
        const collector = targetMessage.reactionCollectors.find(c => c.emoji.name === roles[index].emoji);
        if (collector) {
            collector.stop();
        }

        return message.channel.send('Reaction role removed successfully.');
    }
};