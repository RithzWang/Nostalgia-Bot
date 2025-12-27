const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    PermissionFlagsBits,
    MessageFlags,
    ComponentType
} = require('discord.js');

// ⚠️ YOUR OWNER ID
const OWNER_ID = '837741275603009626'; 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('steal-emoji')
        .setDescription('Copy emojis from another server (Owner Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions),

    async execute(interaction) {
        // 1. Owner Security Check
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ 
                content: '<:no:1297814819105144862> ⛔ This is an **Owner-Only** command.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // 2. Filter servers that have emojis
        const guilds = interaction.client.guilds.cache.filter(g => g.emojis.cache.size > 0);

        if (guilds.size === 0) {
            return interaction.editReply({ content: '<:no:1297814819105144862> I am not in any other servers with emojis.' });
        }

        // 3. Server Selection Menu
        const serverOptions = guilds.first(25).map(g => ({
            label: g.name,
            description: `ID: ${g.id} | ${g.emojis.cache.size} emojis`,
            value: g.id,
        }));

        const serverMenu = new StringSelectMenuBuilder()
            .setCustomId('steal_server_select')
            .setPlaceholder('Step 1: Select a source server')
            .addOptions(serverOptions);

        const embed = new EmbedBuilder()
            .setTitle('🎨 Steal Emoji Panel')
            .setDescription('Select a server below to browse emojis you can copy to this server.')
            .setColor(0x808080);

        const response = await interaction.editReply({ 
            embeds: [embed], 
            components: [new ActionRowBuilder().addComponents(serverMenu)] 
        });

        // 4. Collector for the menus
        const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.StringSelect, 
            time: 120000 
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) return;

            // Handle Server Selection
            if (i.customId === 'steal_server_select') {
                const targetGuild = interaction.client.guilds.cache.get(i.values[0]);
                const emojis = targetGuild.emojis.cache.first(25); 

                const emojiOptions = emojis.map(e => ({
                    label: e.name,
                    value: e.id,
                    emoji: e.id,
                    description: e.animated ? 'Animated GIF' : 'Static PNG'
                }));

                const emojiMenu = new StringSelectMenuBuilder()
                    .setCustomId('steal_emoji_select')
                    .setPlaceholder('Step 2: Select emojis to copy here')
                    .setMinValues(1)
                    .setMaxValues(emojiOptions.length)
                    .addOptions(emojiOptions);

                await i.update({ 
                    embeds: [new EmbedBuilder()
                        .setTitle(`🎨 Emojis in ${targetGuild.name}`)
                        .setDescription(`Select the emojis you want to add to **${interaction.guild.name}**.`)
                        .setColor(0x808080)
                        .setFooter({ text: `Source Server ID: ${targetGuild.id}` })], 
                    components: [new ActionRowBuilder().addComponents(emojiMenu)] 
                });
            }

            // Handle Emoji Selection (The Stealing)
            if (i.customId === 'steal_emoji_select') {
                // Get the source guild ID from the footer we set in the previous step
                const sourceGuildId = i.message.embeds[0].footer.text.split(': ')[1];
                const sourceGuild = interaction.client.guilds.cache.get(sourceGuildId);
                
                await i.update({ content: '<a:loading:1447184742934909032> Stealing emojis...', embeds: [], components: [] });

                const success = [];
                const failed = [];

                for (const emojiId of i.values) {
                    const emoji = sourceGuild.emojis.cache.get(emojiId);
                    try {
                        const added = await interaction.guild.emojis.create({ 
                            attachment: emoji.url, 
                            name: emoji.name 
                        });
                        success.push(added.toString());
                    } catch (err) {
                        failed.push(emoji.name);
                    }
                }

                let result = '';
                if (success.length > 0) result += `<:yes:1297814648417943565> **Success:** ${success.join(' ')}\n`;
                if (failed.length > 0) result += `<:no:1297814819105144862> **Failed:** ${failed.join(', ')}`;

                await i.editReply({ content: result });
                collector.stop();
            }
        });
    }
};
