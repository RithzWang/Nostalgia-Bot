const Sticky = require('../src/models/StickySchema'); // Adjust path
const { LootDrop } = require('../src/models/LootDropSchema'); // Adjust path

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
        
        // ==========================================
        //  SMART BOT FILTERING & LOOP PREVENTION
        // ==========================================
        if (message.author.id === client.user.id) {
            // If THIS bot sent the message, we only want to move the sticky message 
            // if it's a Loot Drop. 
            
            // Wait 1.5 seconds to ensure the slash command finished saving the Loot Drop to the DB
            await new Promise(resolve => setTimeout(resolve, 1500));
            const isLootDrop = await LootDrop.findOne({ messageId: message.id });
            
            // If it's NOT a loot drop (e.g., it's the sticky message itself), ignore it!
            if (!isLootDrop) return; 
        }
        
        // NOTE: Since we don't have `if (message.author.bot) return;` here anymore, 
        // OTHER bots (like Mudae) will pass right through and trigger the sticky message!

        // ==========================================
        //         STICKY MESSAGE LOGIC
        // ==========================================
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
            flags: [MessageFlags.IsComponentsV2] // 🛠️ FIX: Wrapped the flag in an array for API safety!
        };

        // Send new container message
        const newSticky = await message.channel.send(payload);

        // Update database with the new message ID
        stickyData.lastMessageId = newSticky.id;
        await stickyData.save();
    }
};
