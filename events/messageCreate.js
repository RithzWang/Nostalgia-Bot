const { EmbedBuilder } = require('discord.js');
const Sticky = require('../src/models/Sticky'); // Ensure path is correct
const stickyTimers = new Map();

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot) return;

        if (stickyTimers.has(message.channel.id)) {
            clearTimeout(stickyTimers.get(message.channel.id));
        }

        const timer = setTimeout(async () => {
            try {
                const stickyConfig = await Sticky.findOne({ channelId: message.channel.id });
                if (!stickyConfig) return;

                if (stickyConfig.lastMessageId) {
                    const lastMessage = await message.channel.messages.fetch(stickyConfig.lastMessageId).catch(() => null);
                    if (lastMessage) await lastMessage.delete().catch(() => {});
                }

                const stickyEmbed = new EmbedBuilder()
                    .setTitle('Pinned Message')
                    .setDescription(stickyConfig.content)
                    .setColor('#888888');

                const sentMessage = await message.channel.send({ embeds: [stickyEmbed] });
                stickyConfig.lastMessageId = sentMessage.id;
                await stickyConfig.save();
                stickyTimers.delete(message.channel.id);

            } catch (err) {
                console.error("Sticky Error:", err);
            }
        }, 3000);

        stickyTimers.set(message.channel.id, timer);
    },
};
