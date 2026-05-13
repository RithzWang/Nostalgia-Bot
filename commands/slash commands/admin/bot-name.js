const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Helper function to shift standard characters into Unicode fancy fonts
function toFancyFont(str, type) {
    if (type === 'default') return str;
    
    return str.split('').map(char => {
        const code = char.charCodeAt(0);
        // Uppercase A-Z
        if (code >= 65 && code <= 90) {
            if (type === 'medieval') return String.fromCodePoint(code - 65 + 0x1D56C);
            if (type === '8bit') return String.fromCodePoint(code - 65 + 0x1D670);
            if (type === 'sakura') return String.fromCodePoint(code - 65 + 0xFF21);
        }
        // Lowercase a-z
        if (code >= 97 && code <= 122) {
            if (type === 'medieval') return String.fromCodePoint(code - 97 + 0x1D586);
            if (type === '8bit') return String.fromCodePoint(code - 97 + 0x1D68A);
            if (type === 'sakura') return String.fromCodePoint(code - 97 + 0xFF41);
        }
        return char; // Return spaces and symbols unchanged
    }).join('');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bot-display-name')
        .setDescription('Updates the bot\'s display name style and simulates Nitro colors!')
        .addStringOption(option =>
            option.setName('font')
                .setDescription('Select the Display Name font style')
                .setRequired(true)
                .addChoices(
                    { name: 'Medieval', value: 'medieval' },
                    { name: '8Bit', value: '8bit' },
                    { name: 'Sakura', value: 'sakura' },
                    { name: 'Default', value: 'default' }
                ))
        .addStringOption(option =>
            option.setName('colour1')
                .setDescription('Primary color hex (e.g., #ff0000)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('colour2')
                .setDescription('Secondary gradient color hex (e.g., #0000ff)')
                .setRequired(false)),

    async execute(interaction) {
        // Grab the user's selected options
        const fontChoice = interaction.options.getString('font');
        const color1 = interaction.options.getString('colour1') || '#2b2d31'; // Default Discord dark grey
        const color2 = interaction.options.getString('colour2') || 'None';

        // Get the bot's base username to convert
        const baseName = interaction.client.user.username;
        const newNickname = toFancyFont(baseName, fontChoice);

        try {
            // Apply the Unicode font to the bot's server nickname
            await interaction.guild.members.me.setNickname(newNickname);

            // Build the confirmation embed
            const embed = new EmbedBuilder()
                .setColor(color1) // We use colour1 to theme the embed since names can't be colored
                .setTitle(`✨ Display Name Style Updated!`)
                .addFields(
                    { name: 'New Name', value: newNickname, inline: true },
                    { name: 'Font Selected', value: fontChoice.charAt(0).toUpperCase() + fontChoice.slice(1), inline: true },
                    { name: 'Gradient Config', value: `Color 1: \`${color1}\`\nColor 2: \`${color2}\`\n*(Applied to embed theme)*`, inline: false }
                )
                .setFooter({ text: 'Developed by Ridouan AKA Rithz' });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: 'Failed to update my name. Make sure my role is positioned higher than standard members and I have the "Manage Nicknames" permission!', 
                ephemeral: true 
            });
        }
    },
};
