const { EmbedBuilder } = require('discord.js');
const translate = require('@iamtraction/google-translate');
const { translateChannelID, colourEmbed } = require('./config.json');

module.exports = async (message) => {
    // 1. Stop if the message is from a bot
    if (message.author.bot) return;

    // 2. Stop if the message is NOT in the translation channel
    // Make sure 'translateChannelID' is in your config.json!
    if (message.channel.id !== translateChannelID) return;

    // 3. Stop if the message has no text (like just an image or symbols)
    if (!/[a-zA-Z]/.test(message.content)) return; 

    try {
        // 4. Translate to Spanish ('es')
        const res = await translate(message.content, { to: 'es' });

        // 5. If the detected language is NOT Spanish, send the result
        if (res.from.language.iso !== 'es') {
            const embed = new EmbedBuilder()
                .setColor(colourEmbed || '#0099ff')
                .setAuthor({ name: `${message.author.username} says:`, iconURL: message.author.displayAvatarURL() })
                .setDescription(`**🇪🇸 Translation:**\n${res.text}`)
                .setFooter({ text: `Original language: ${res.from.language.iso.toUpperCase()}` });

            await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        }
    } catch (err) {
        console.error("Translation Error:", err);
    }
};
