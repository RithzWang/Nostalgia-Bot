const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    MessageFlags, 
    ChannelType,
    ContainerBuilder, 
    TextDisplayBuilder,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

const GuessGame = require('../../../src/models/GuessGame'); 
const { words } = require('../../../guessword.json'); 

function hideWord(word) {
    const chars = word.split('');
    const visibleCount = Math.floor(chars.length / 2); 
    const indices = new Set();
    while(indices.size < visibleCount) {
        indices.add(Math.floor(Math.random() * chars.length));
    }
    return chars.map((c, i) => indices.has(i) ? c : '_').join(' ');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guess-word')
        .setDescription('Manage the infinite Guess the Word game')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(sub => 
            sub.setName('enable')
                .setDescription('Start the game in a specific channel')
                .addChannelOption(opt => 
                    opt.setName('channel')
                        .setDescription('The channel for the game')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub => 
            sub.setName('disable')
                .setDescription('Stop the game')
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const sub = interaction.options.getSubcommand();

        if (sub === 'enable') {
            const channel = interaction.options.getChannel('channel');

            const newWord = words[Math.floor(Math.random() * words.length)];
            const hidden = hideWord(newWord);

            await GuessGame.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { 
                    guildId: interaction.guild.id, 
                    channelId: channel.id,
                    currentWord: newWord,
                    displayWord: hidden
                },
                { upsert: true, new: true }
            );

            const container = new ContainerBuilder()
                .setAccentColor(0x5865F2)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🎮 Guess the Word Started!'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                .addSectionComponents(
                    new SectionBuilder().addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### Guess this word:\n# \` ${hidden} \``)
                    )
                );

            await channel.send({ 
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

            return interaction.editReply({ content: `<:yes:1297814648417943565> Game started in ${channel}!` });
        }

        if (sub === 'disable') {
            const game = await GuessGame.findOneAndDelete({ guildId: interaction.guild.id });
            if (!game) return interaction.editReply({ content: "<:no:1297814819105144862> The game isn't running." });

            const channel = interaction.guild.channels.cache.get(game.channelId);
            if (channel) {
                const endContainer = new ContainerBuilder()
                    .setAccentColor(0xED4245)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### 🛑 Game Over\nThe guessing game has been disabled.'));
                
                await channel.send({ 
                    components: [endContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
            }

            return interaction.editReply({ content: "<:yes:1297814648417943565> Game disabled." });
        }
    }
};
