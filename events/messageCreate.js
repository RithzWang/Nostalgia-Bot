const Sticky = require('../src/models/StickySchema'); // Adjust path
const { 
    MessageFlags, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    SeparatorBuilder, 
    SeparatorSpacingSize 
} = require('discord.js');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot) return;

        const stickyData = await Sticky.findOne({ channelId: message.channel.id });
        if (!stickyData) return;

        if (stickyData.lastMessageId) {
            const messages = await message.channel.messages.fetch({ limit: 2 });
            const lastMsg = messages.first();
            
            if (lastMsg && lastMsg.id === stickyData.lastMessageId) return;

            try {
                const oldSticky = await message.channel.messages.fetch(stickyData.lastMessageId);
                if (oldSticky) await oldSticky.delete();
            } catch (err) {}
        }

        // --- RENDER CONTAINER V2 ---
        const container = new ContainerBuilder();

        if (stickyData.isTemplate) {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## 📌 ${stickyData.title}`)
            );
            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
            );
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(stickyData.content)
            );
        } else {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(stickyData.content)
            );
        }

        const payload = { 
            content: '', 
            components: [container],
            flags: MessageFlags.IsComponentsV2
        };

        // Send new container message
        const newSticky = await message.channel.send(payload);

        stickyData.lastMessageId = newSticky.id;
        await stickyData.save();
    }
};
