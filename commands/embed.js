const { MessageEmbed } = require('discord.js');

module.exports = {
    name: 'embed',
    async execute(message) {
        // Create a filter to only collect messages from the command author
        const filter = response => response.author.id === message.author.id;

        // Ask for the channel to send the embed
        message.channel.send('Please mention the channel where you want to send the embed (e.g., #general):');
        const channelResponse = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
        const channelMention = channelResponse.first().content;

        // Get the channel object from the mention
        const targetChannel = message.guild.channels.cache.find(channel => channel.name === channelMention.replace('#', ''));

        if (!targetChannel || targetChannel.type !== 'text') {
            return message.channel.send('Invalid channel. Please make sure to mention a valid text channel.');
        }

        // Ask for the title
        message.channel.send('What is the title of the embed?');
        const titleResponse = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
        const title = titleResponse.first().content;

        // Ask for the description
        message.channel.send('What is the description of the embed?');
        const descriptionResponse = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
        const description = descriptionResponse.first().content;

        // Ask for the color
        message.channel.send('What color would you like for the embed? (hex code, e.g., #ff0000)');
        const colorResponse = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
        const color = colorResponse.first().content;

        // Ask for an optional image URL
        message.channel.send('Would you like to add an image URL? (Type "no" to skip)');
        const imageResponse = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
        const imageUrl = imageResponse.first().content.toLowerCase() === 'no' ? null : imageResponse.first().content;

        // Create the embed
        const embed = new MessageEmbed()
            .setColor(color)
            .setTitle(title)
            .setDescription(description);

        // Add the image if provided
        if (imageUrl) {
            embed.setImage(imageUrl);
        }

        // Send the embed to the specified channel
        targetChannel.send(embed).then(() => {
            message.channel.send('Your custom embed has been created and sent to ' + targetChannel.toString() + '!');
        }).catch(err => {
            console.error(err);
            message.channel.send('There was an error sending the embed. Please check the provided information.');
        });
    }
};