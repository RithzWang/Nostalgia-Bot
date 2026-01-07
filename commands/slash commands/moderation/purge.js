const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete messages')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to check (Max 100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        ),

    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // 1. Fetch messages
            const messages = await interaction.channel.messages.fetch({ limit: amount });

            // 2. Filter out pinned messages
            const messagesToDelete = messages.filter(msg => !msg.pinned);
            const pinnedCount = messages.size - messagesToDelete.size;

            // 3. Bulk Delete
            // 'true' filters out messages older than 14 days automatically
            const deletedMessages = await interaction.channel.bulkDelete(messagesToDelete, true);

            // 4. Calculate Stats from the DELETED messages
            const userStats = {};
            
            deletedMessages.forEach(msg => {
                const userKey = msg.author.username; // Or msg.author.toString() for mention
                if (!userStats[userKey]) {
                    userStats[userKey] = 0;
                }
                userStats[userKey]++;
            });

            // 5. Format the Breakdown List
            // Example: • UserA: 5 messages
            const breakdown = Object.entries(userStats)
                .map(([username, count]) => `• **${username}**: ${count}`)
                .join('\n');

            // 6. Final Response
            let response = `<:yes:1297814648417943565> **Deleted ${deletedMessages.size} messages.**\n\n**Breakdown:**\n${breakdown || "No messages deleted."}`;

            if (pinnedCount > 0) {
                response += `\n\n📌 **Skipped:** ${pinnedCount} pinned messages.`;
            }

            // Check if messages were skipped due to 14-day limit
            if (deletedMessages.size < messagesToDelete.size) {
                const tooOldCount = messagesToDelete.size - deletedMessages.size;
                response += `\n⚠️ **Skipped:** ${tooOldCount} messages were older than 14 days.`;
            }

            await interaction.editReply({ content: response });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ 
                content: '<:no:1297814819105144862> Failed to delete messages. Ensure I have permissions.' 
            });
        }
    },
};
