const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    MessageFlags,
    ComponentType
} = require('discord.js');

const OWNER_ID = '837741275603009626'; 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('steal-emoji')
        .setDescription('Copy emojis from another server (Owner Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ 
                content: '⛔ This is an **Owner-Only** command.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const guilds = interaction.client.guilds.cache.filter(g => g.emojis.cache.size > 0);
        if (guilds.size === 0) return interaction.editReply({ content: 'I am not in any other servers with emojis.' });

        const serverOptions = guilds.first(25).map(g => ({
            label: g.name,
            description: `ID: ${g.id} | ${g.emojis.cache.size} emojis`,
            value: g.id,
        }));

        const serverMenu = new StringSelectMenuBuilder()
            .setCustomId('steal_server_select')
            .setPlaceholder('Step 1: Select a source server')
            .addOptions(serverOptions);

        const response = await interaction.editReply({ 
            embeds: [new EmbedBuilder().setTitle('🎨 Steal Emoji Panel').setDescription('Select a server.').setColor(0x808080)], 
            components: [new ActionRowBuilder().addComponents(serverMenu)] 
        });

        // State tracking for pagination
        let currentPage = 0;
        let selectedGuildId = null;

        const collector = response.createMessageComponentCollector({ 
            time: 300000 // Increased to 5 mins for browsing
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) return;

            // --- SERVER SELECTION OR PAGINATION ---
            if (i.customId === 'steal_server_select' || i.customId === 'prev_page' || i.customId === 'next_page') {
                
                if (i.customId === 'steal_server_select') {
                    selectedGuildId = i.values[0];
                    currentPage = 0;
                } else if (i.customId === 'prev_page') {
                    currentPage--;
                } else if (i.customId === 'next_page') {
                    currentPage++;
                }

                const targetGuild = interaction.client.guilds.cache.get(selectedGuildId);
                const allEmojis = Array.from(targetGuild.emojis.cache.values());
                const totalPages = Math.ceil(allEmojis.length / 25);
                
                // Slice the array for the current page
                const start = currentPage * 25;
                const end = start + 25;
                const emojiChunk = allEmojis.slice(start, end);

                const emojiOptions = emojiChunk.map(e => ({
                    label: e.name || 'unnamed',
                    value: e.id,
                    emoji: e.id,
                    description: e.animated ? 'Animated' : 'Static'
                }));

                const emojiMenu = new StringSelectMenuBuilder()
                    .setCustomId('steal_emoji_select')
                    .setPlaceholder(`Page ${currentPage + 1}/${totalPages}: Select emojis`)
                    .setMinValues(1)
                    .setMaxValues(emojiOptions.length)
                    .addOptions(emojiOptions);

                const navRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_page')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 0),
                    new ButtonBuilder()
                        .setCustomId('next_page')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage >= totalPages - 1)
                );

                await i.update({ 
                    embeds: [new EmbedBuilder()
                        .setTitle(`🎨 Emojis in ${targetGuild.name}`)
                        .setDescription(`Showing ${start + 1}-${Math.min(end, allEmojis.length)} of ${allEmojis.length} emojis.`)
                        .setColor(0x808080)
                        .setFooter({ text: `Source Server ID: ${targetGuild.id}` })], 
                    components: [new ActionRowBuilder().addComponents(emojiMenu), navRow] 
                });
            }

            // --- EMOJI PROCESSING ---
            if (i.customId === 'steal_emoji_select') {
                const sourceGuildId = i.message.embeds[0].footer.text.split(': ')[1];
                const sourceGuild = interaction.client.guilds.cache.get(sourceGuildId);
                
                await i.update({ content: '⏳ Stealing emojis...', embeds: [], components: [] });

                const success = [];
                const failed = [];

                for (const emojiId of i.values) {
                    const emoji = sourceGuild.emojis.cache.get(emojiId);
                    try {
                        const added = await interaction.guild.emojis.create({ 
                            attachment: emoji.imageURL(), 
                            name: emoji.name 
                        });
                        success.push(added.toString());
                    } catch (err) {
                        failed.push(emoji.name);
                    }
                }

                let result = '';
                if (success.length > 0) result += `✅ **Success:** ${success.join(' ')}\n`;
                if (failed.length > 0) result += `❌ **Failed:** ${failed.join(', ')}`;

                await i.editReply({ content: result });
                collector.stop();
            }
        });
    }
};
