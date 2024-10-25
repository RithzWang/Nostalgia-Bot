const { MessageEmbed } = require('discord.js');

module.exports = {
    name: 'editembed',
    async execute(message, args) {
        // Check if the user has administrator permissions
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.channel.send('You do not have permission to use this command.');
        }

        // Ask for the channel to edit the embed
        const channelPrompt = await message.channel.send('Please mention the channel where the embed is located:');
        
        // Wait for a response
        const filter = response => response.author.id === message.author.id;
        const channelCollector = message.channel.createMessageCollector({ filter, max: 1, time: 30000 });

        channelCollector.on('collect', async response => {
            const channelMention = response.content;
            const targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(channelMention.replace(/<#(\d+)>/, '$1'));

            if (!targetChannel) {
                return message.channel.send('Please mention a valid channel.');
            }

            // Ask for the message ID of the embed to edit
            const messageIdPrompt = await message.channel.send('Please provide the message ID of the embed you want to edit:');
            const messageIdCollector = message.channel.createMessageCollector({ filter, max: 1, time: 30000 });

            messageIdCollector.on('collect', async messageIdResponse => {
                const messageId = messageIdResponse.content;

                // Fetch the message to edit
                let embedMessage;
                try {
                    embedMessage = await targetChannel.messages.fetch(messageId);
                } catch (err) {
                    return message.channel.send('Could not find a message with that ID in the specified channel.');
                }

                // Ask for the new title of the embed
                const titlePrompt = await message.channel.send('Please provide the new title for the embed:');
                const titleCollector = message.channel.createMessageCollector({ filter, max: 1, time: 30000 });

                titleCollector.on('collect', async titleResponse => {
                    const newEmbedTitle = titleResponse.content;

                    // Ask for the new description of the embed
                    const descriptionPrompt = await message.channel.send('Please provide the new description for the embed:');
                    const descriptionCollector = message.channel.createMessageCollector({ filter, max: 1, time: 30000 });

                    descriptionCollector.on('collect', async descriptionResponse => {
                        const newEmbedDescription = descriptionResponse.content;

                        // Create the updated embed
                        const updatedEmbed = new MessageEmbed()
                            .setTitle(newEmbedTitle)
                            .setDescription(newEmbedDescription)
                            .setColor('#888888'); // Customize the color as needed

                        // Edit the original embed message
                        embedMessage.edit({ embeds: [updatedEmbed] })
                            .then(() => {
                                message.channel.send('Embed edited successfully!');
                            })
                            .catch(err => {
                                console.error('Failed to edit embed:', err);
                                message.channel.send('Failed to edit the embed message.');
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

            // Handle timeout for message ID
            messageIdCollector.on('end', collected => {
                if (collected.size === 0) {
                    message.channel.send('You did not provide a message ID in time.');
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