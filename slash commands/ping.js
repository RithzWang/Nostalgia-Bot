const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ping', 
    
    async execute(interaction) {
        // 1. Initial Reply (Fetch Reply is required to measure response time)
        // We use ephemeral: true for the initial reply to hide the "Thinking..." message.
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true, ephemeral: true });

        // 2. Calculate Latencies
        
        // Bot Latency: The time it took from receiving the interaction to editing the reply.
        const botLatency = sent.createdTimestamp - interaction.createdTimestamp;

        // API Latency: The latency of the WebSocket connection to Discord.
        const apiLatency = interaction.client.ws.ping;
        
        // 3. Build the Embed
        const pingEmbed = new EmbedBuilder()
            .setColor('#4BB543')
            .setTitle('Pong! 🏓')
            .addFields(
                { 
                    name: '🤖 Bot Latency', 
                    value: `\`${botLatency}ms\``, 
                    inline: true 
                },
                { 
                    name: '📡 API Latency', 
                    value: `\`${apiLatency}ms\``, 
                    inline: true 
                }
            )
            .setTimestamp();

        // 4. Edit the initial reply with the results
        await interaction.editReply({ 
            content: null, // Clear the "Pinging..." message
            embeds: [pingEmbed], 
            ephemeral: false // Make the final result public
        });
    }
};