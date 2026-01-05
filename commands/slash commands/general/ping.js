const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency'),

    async execute(interaction) {
        // 1. Send the initial message (without fetching yet)
        await interaction.reply({ content: 'Pinging...' });

        // 2. Fetch the message explicitly to get the timestamp
        const sent = await interaction.fetchReply();

        // 3. Calculate the latencies
        const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = interaction.client.ws.ping;

        // 4. Build the embed
        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setColor('#888888')
            .addFields(
                { name: 'Bot Latency', value: `\`${roundtripLatency}ms\``, inline: true },
                { name: 'API Latency', value: `\`${apiLatency}ms\``, inline: true }
            )
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        // 5. Edit the message
        await interaction.editReply({ content: null, embeds: [embed] });
    },
};
