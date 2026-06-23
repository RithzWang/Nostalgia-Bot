const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder } = require('discord.js');
const moment = require('moment'); // We don't need moment-timezone anymore, just standard moment

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
            .setMaxValue(59))
        .addIntegerOption(opt => opt.setName('gmt')
            .setDescription('GMT Offset (e.g., 7 for GMT+7). Defaults to 7.')
            .setRequired(false)
            .setMinValue(-12)
            .setMaxValue(14)),

    async execute(interaction) {
        // 1. Fetch the user's inputs
        const day = interaction.options.getInteger('day');
        const month = interaction.options.getInteger('month');
        const year = interaction.options.getInteger('year');
        const hour = interaction.options.getInteger('hour');
        const minute = interaction.options.getInteger('minute');
        
        // Fetch the GMT offset. If not provided, default it to 7 (Thailand time)
        const gmtOffset = interaction.options.getInteger('gmt') ?? 7;

        // 2. Create the Date object and apply the GMT offset
        // We build the date in UTC first, then use .utcOffset(gmtOffset, true) 
        // to tell it "Keep the numbers exactly as the user typed them, but stamp it with this timezone".
        const targetTime = moment.utc({
            year: year,
            month: month - 1, 
            day: day,
            hour: hour,
            minute: minute
        }).utcOffset(gmtOffset, true);
        
        // 3. Convert directly to Unix timestamp (seconds)
        const unix = targetTime.unix();

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
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## Timestamp (GMT${gmtOffset >= 0 ? '+' : ''}${gmtOffset})`)
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
