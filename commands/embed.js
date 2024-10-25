const { MessageEmbed } = require('discord.js');

module.exports = {
    name: 'embed',
    async execute(message, args) {
        // Check if the user has administrator permissions
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.channel.send('You do not have permission to use this command.');
        }

        // Ask for the channel to send the embed
        const channelPrompt = await message.channel.send('Please mention the channel you want to send the embed to:');
        
        // Wait for a response
        const filter = response => response.author.id === message.author.id;
        const channelCollector = message.channel.createMessageCollector({ filter, max: 1, time: 30000 });

        channelCollector.on('collect', async response => {
            const channelMention = response.content;
            const targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(channelMention.replace(/<#(\d+)>/, '$1'));

            if (!targetChannel) {
                return message.channel.send('Please mention a valid channel.');
            }

            // Ask for the title of the embed
            const titlePrompt = await message.channel.send('Please provide the title for the embed:');
            const titleCollector = message.channel.createMessageCollector({ filter, max: 1, time: 30000 });

            titleCollector.on('collect', async titleResponse => {
                const embedTitle = titleResponse.content;

                // Ask for the description of the embed
                const descriptionPrompt = await message.channel.send('Please provide the description for the embed:');
                const descriptionCollector = message.channel.createMessageCollector({ filter, max: 1, time: 30000 });

                descriptionCollector.on('collect', async descriptionResponse => {
                    const embedDescription = descriptionResponse.content;

                    // Create the embed
                    const embed = new MessageEmbed()
                        .setTitle(embedTitle)
                        .setDescription(embedDescription)
                        .setColor('#888888'); // You can customize the color

                    // Send the embed to the target channel
                    targetChannel.send(embed)
                        .then(() => {
                            message.channel.send(`Embed sent successfully to ${targetChannel.toString()}!`);
                        })
                        .catch(err => {
                            console.error('Failed to send embed:', err);
                            message.channel.send('Failed to send the embed to the specified channel.');
                        });
                });

                // Handle timeout for description
                descriptionCollector.on('end', collected => {
                    if (collected.size === 0) {
                        message.channel.send('You did not provide a description in time.');
                    }
                });
            });

            // Handle timeout for title
            titleCollector.on('end', collected => {
                if (collected.size === 0) {
                    message.channel.send('You did not provide a title in time.');
                }
            });
        });

        // Handle timeout for channel
        channelCollector.on('end', collected => {
            if (collected.size === 0) {
                message.channel.send('You did not mention a channel in time.');
            }
        });
    }
};