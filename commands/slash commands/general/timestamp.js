const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timestamp')
        .setDescription('Generate Discord timestamp formats from a specific date and time')
        .addIntegerOption(opt => opt.setName('day')
            .setDescription('Day of the month (1-31)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(31))
        .addIntegerOption(opt => opt.setName('month')
            .setDescription('Month (1-12)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(12))
        .addIntegerOption(opt => opt.setName('year')
            .setDescription('Year (e.g., 2026)')
            .setRequired(true)
            .setMinValue(1970)
            .setMaxValue(3000))
        .addIntegerOption(opt => opt.setName('hour')
            .setDescription('Hour in 24h format (0-23)')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(23))
        .addIntegerOption(opt => opt.setName('minute')
            .setDescription('Minute (0-59)')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(59)),

    async execute(interaction) {
        // 1. Fetch the user's inputs
        const day = interaction.options.getInteger('day');
        const month = interaction.options.getInteger('month');
        const year = interaction.options.getInteger('year');
        const hour = interaction.options.getInteger('hour');
        const minute = interaction.options.getInteger('minute');

        // 2. Create the Date object
        // Note: JS months are 0-indexed (0 = Jan, 11 = Dec), so we subtract 1 from the month
        const date = new Date(year, month - 1, day, hour, minute);
        
        // 3. Convert to Unix timestamp (seconds)
        const unix = Math.floor(date.getTime() / 1000);

        // 4. Construct the formatted string with the dynamic Unix timestamp
        const timestampContent = 
            `**Unix:** \`${unix}\`\n\n` +
            `<t:${unix}:R> - \`<t:${unix}:R>\`\n` +
            `<t:${unix}:t> - \`<t:${unix}:t>\`\n` +
            `<t:${unix}:T> - \`<t:${unix}:T>\`\n` +
            `<t:${unix}:d> - \`<t:${unix}:d>\`\n` +
            `<t:${unix}:D> - \`<t:${unix}:D>\`\n` +
            `<t:${unix}:f> - \`<t:${unix}:f>\`\n` +
            `<t:${unix}:F> - \`<t:${unix}:F>\``;

        // 5. Build the V2 Component Container
        const components = [
            new ContainerBuilder()
                .setAccentColor(0x888888)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("## Timestamp")
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(timestampContent)
                ),
        ];

        // 6. Send the reply ephemerally with the required V2 flag
        await interaction.reply({
            components: components,
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
    },
};
