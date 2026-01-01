const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency'),

    async execute(interaction) {
        // 1. Send a temporary message to calculate the time difference
        // We use fetchReply: true so we can access the message object immediately
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });

        // 2. Calculate the latencies
        const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = interaction.client.ws.ping;

        // 3. Build the embed
        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setColor('#888888') // Your default grey
            .addFields(
                { name: 'Bot Latency', value: `\`${roundtripLatency}ms\``, inline: true },
                { name: 'API Latency', value: `\`${apiLatency}ms\``, inline: true }
            )
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        // 4. Edit the original 'Pinging...' message with the actual stats
        await interaction.editReply({ content: null, embeds: [embed] });
    },
};
