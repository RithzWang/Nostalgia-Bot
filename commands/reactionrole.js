const { MessageEmbed } = require('discord.js');

module.exports = {
    name: 'reactionrole',
    aliases: ['rr'],
    description: 'Assign roles based on reactions',
    async execute(message, args) {
        // Check for permissions
        if (!message.member.hasPermission('MANAGE_ROLES')) {
            return message.reply('You do not have permission to manage roles.');
        }

        // Check if the correct number of arguments is provided
        if (args.length !== 4) {
            return message.reply('Invalid syntax. Use: `!reactionrole [channel mention] [message id] [role mention/id] [emoji]`');
        }

        // Extract the channel, message ID, role, and emoji from the arguments
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
        const messageId = args[1];
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);
        const emoji = args[3];

        // Check if the channel, message ID, role, and emoji are valid
        if (!channel || !messageId || !role || !emoji) {
            return message.reply('Invalid arguments. Please provide a valid channel, message ID, role, and emoji.');
        }

        // Fetch the message
        const msg = await channel.messages.fetch(messageId).catch(() => {
            return message.reply('Message not found.');
        });

        if (!msg) return;

        // Add the reaction to the message
        await msg.react(emoji).catch(() => {
            return message.reply('Failed to add reaction to the message.');
        });

        // Create a reaction collector
        const filter = (reaction, user) => {
            return !user.bot && reaction.emoji.name === emoji;
        };

        const collector = msg.createReactionCollector(filter, { dispose: true });

        collector.on('collect', (reaction, user) => {
            const member = message.guild.members.cache.get(user.id);

            if (member) {
                member.roles.add(role).catch(console.error);
            }
        });

        collector.on('remove', (reaction, user) => {
            const member = message.guild.members.cache.get(user.id);

            if (member) {
                member.roles.remove(role).catch(console.error);
            }
        });

        message.reply(`Reaction role set up successfully! React with ${emoji} to get the role ${role.name}.`);
    },
};