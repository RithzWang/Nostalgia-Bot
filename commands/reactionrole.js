const { MessageEmbed } = require('discord.js'); // Import MessageEmbed
const enabledReactionRoles = new Map(); // To keep track of channels with enabled reaction roles

module.exports = {
    name: 'reactionrole',
    aliases: ['rr'],
    async execute(message, args) {
        // Check if the user has the required permissions
        if (!message.member.permissions.has('MANAGE_ROLES')) {
            return message.channel.send('You do not have permission to use this command.');
        }

        // Check if the correct number of arguments is provided
        if (args.length < 4) {
            return message.channel.send('Usage: !reactionrole [channel mention] [message ID] [role mention/id] [emoji]');
        }

        const channelMention = args[0]; // The channel mention
        const messageId = args[1]; // The message ID as the 2nd argument
        const roleArg = args[2]; // The role mention or ID
        const emoji = args[3]; // The emoji to react with

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

        // Find the role by mention or ID
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(roleArg);
        if (!role) {
            return message.channel.send('Role not found.');
        }

        // Add the reaction to the specified message
        await targetMessage.react(emoji);

        // Store the reaction role in a map for this channel
        if (!enabledReactionRoles.has(targetChannel.id)) {
            enabledReactionRoles.set(targetChannel.id, []);
        }
        enabledReactionRoles.get(targetChannel.id).push({ role, emoji });

        // Create a reaction collector
        const filter = (reaction, user) => {
            return reaction.emoji.name === emoji && !user.bot && enabledReactionRoles.has(targetChannel.id); // Only collect if enabled
        };

        const collector = targetMessage.createReactionCollector(filter, { dispose: true });

        collector.on('collect', (reaction, user) => {
            const member = message.guild.members.cache.get(user.id);
            if (member) {
                member.roles.add(role).catch(err => console.error(err));
            }
        });

        collector.on('remove', (reaction, user) => {
            const member = message.guild.members.cache.get(user.id);
            if (member) {
                member.roles.remove(role).catch(err => console.error(err));
            }
        });
    }
};