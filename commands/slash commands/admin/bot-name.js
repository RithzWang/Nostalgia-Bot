const { SlashCommandBuilder, EmbedBuilder, Routes } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('force-nitro-name')
        .setDescription('Attempts to force native Nitro Display Name Styles via raw API request.')
        .addStringOption(option => 
            option.setName('font')
                .setDescription('The official Discord font to use')
                .setRequired(true)
                .addChoices(
                    { name: 'Medieval', value: 'medieval' },
                    { name: '8Bit', value: '8bit' },
                    { name: 'Sakura', value: 'sakura' },
                    { name: 'Vampyre', value: 'vampyre' }
                ))
        .addStringOption(option =>
            option.setName('effect')
                .setDescription('The animated effect')
                .setRequired(true)
                .addChoices(
                    { name: 'Gradient', value: 'gradient' },
                    { name: 'Neon', value: 'neon' },
                    { name: 'Pop', value: 'pop' }
                ))
        .addStringOption(option => 
            option.setName('colour1')
                .setDescription('Hex color 1 (e.g., #ff0000)')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('colour2')
                .setDescription('Hex color 2 for gradients (e.g., #0000ff)')
                .setRequired(false)),

    async execute(interaction) {
        // Grab the selected choices
        const font = interaction.options.getString('font');
        const effect = interaction.options.getString('effect');
        const color1 = interaction.options.getString('colour1');
        const color2 = interaction.options.getString('colour2');

        // We use the REST manager to bypass discord.js limits and hit the Discord API directly
        const rest = interaction.client.rest;

        try {
            // We are firing a PATCH request straight to the bot's global user profile.
            // Pretending we can spoof the premium_type and apply the styling object!
            await rest.patch(Routes.user('@me'), {
                body: {
                    // Spoofing Nitro status (2 = Full Nitro)
                    premium_type: 2, 
                    // The native JSON structure Discord uses for Display Name Styles
                    display_name_style: {
                        font: font,
                        effect: effect,
                        colors: color2 ? [color1, color2] : [color1]
                    }
                }
            });

            const embed = new EmbedBuilder()
                .setColor(color1)
                .setTitle('🚀 Raw API Request Sent!')
                .setDescription(`Successfully told the Discord API to apply the **${font}** font with the **${effect}** effect natively. No Unicode here!`)
                .setFooter({ text: 'Developed by Ridouan AKA Rithz' });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Discord API rejected the spoofed Nitro request:', error);
            
            // Spoiler alert: Discord's servers will almost certainly block this and throw a 400 Bad Request error here
            await interaction.reply({ 
                content: `🚨 The API caught us acting sus! Discord returned an error: \`${error.message}\``, 
                ephemeral: true 
            });
        }
    },
};
