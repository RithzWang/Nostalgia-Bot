const Discord = require('discord.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'rr',
    description: 'Manage reaction roles',
    async execute(message, args) {
        if (!message.guild) return; // Ensure the command is used in a guild

        const command = args[0];
        const targetChannelId = args[1].replace(/<|#|>/g, ''); // Extract channel ID
        const targetChannel = message.guild.channels.cache.get(targetChannelId);
        const messageId = args[2];
        const role = message.mentions.roles.first();
        const emoji = args[3];

        if (command === '!rr') {
            if (!targetChannel || !messageId || !role || !emoji) {
                return message.reply('Usage: !rr #channel <message id> @role-name :emoji:');
            }

            const targetMessage = await targetChannel.messages.fetch(messageId).catch(err => {
                return message.reply('Could not find the message. Please check the message ID.');
            });

            if (!targetMessage) return;

            await targetMessage.react(emoji).catch(err => {
                return message.reply('Failed to add reaction. Please check the emoji.');
            });

            // Store the reaction role in a database or an in-memory structure
            // Example: roles[messageId] = { roleId: role.id, emoji: emoji, channelId: targetChannelId };

            message.channel.send(`Reaction role set in ${targetChannel}! React to the message with ${emoji} to get the ${role.name} role.`);
        } else if (command === '.rr-remove') {
            if (!targetChannel || !messageId || !role || !emoji) {
                return message.reply('Usage: !rr-remove #channel <message id> @role-name :emoji:');
            }

            // Logic to remove the role from the stored reaction role
            // Example: delete roles[messageId];

            message.channel.send(`Reaction role removed for ${role.name} with ${emoji} in ${targetChannel}.`);
        } else {
            message.reply('Invalid command. Use "!rr" or "!rr-remove".');
        }
    }
};