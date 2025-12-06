const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deletedm')
        .setDescription('Owner Only: Delete all bot messages in a specific User DM')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('The User ID to clear messages from')
                .setRequired(true)
        ),
    async execute(interaction) {
        // 1. CONFIG: Put your Owner ID here
        const OWNER_ID = '837741275603009626';

        // 2. Owner Check
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ 
                content: 'Only the bot owner can use this command.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        const targetId = interaction.options.getString('userid');

        // 3. Defer the reply because this process takes a long time
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Fetch the user object
            const targetUser = await interaction.client.users.fetch(targetId).catch(() => null);

            if (!targetUser) {
                return interaction.editReply('Could not find a user with that ID.');
            }

            // Open the DM Channel
            const dmChannel = await targetUser.createDM();
            
            let deletedCount = 0;
            let lastId;
            let processing = true;

            await interaction.editReply(`🔄 | Processing... Fetching and deleting messages for **${targetUser.tag}**. This may take a while.`);

            // 4. Loop through messages
            while (processing) {
                const options = { limit: 100 };
                if (lastId) {
                    options.before = lastId;
                }

                const messages = await dmChannel.messages.fetch(options);

                // Stop if no more messages are found
                if (messages.size === 0) {
                    processing = false;
                    break;
                }

                // Filter specifically for YOUR BOT'S messages
                const myMessages = messages.filter(m => m.author.id === interaction.client.user.id);

                for (const msg of myMessages.values()) {
                    await msg.delete().catch(e => console.log('Failed to delete a msg', e));
                    deletedCount++;
                    
                    // CRITICAL: 1 second delay to avoid Rate Limits (429)
                    await new Promise(resolve => setTimeout(resolve, 1000)); 
                }

                // Prepare for the next batch of 100
                lastId = messages.last().id;
            }

            await interaction.editReply(`Done! Deleted **${deletedCount}** messages in ${targetUser.tag}'s DMs.`);

        } catch (error) {
            console.error(error);
            await interaction.editReply(`An error occurred: ${error.message}`);
        }
    },
};
