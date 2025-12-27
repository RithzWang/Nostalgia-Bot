const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    MessageFlags,
    ChannelType
} = require('discord.js');

// Path to your model (Go up 3 folders: admin -> slash commands -> commands -> src)
const Giveaway = require('../../../src/models/Giveaway');

// Helper to parse "10m", "2h", "1d"
function parseDuration(str) {
    const match = str.match(/^(\d+)([smhd])$/);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2];
    if (unit === 's') return value * 1000;
    if (unit === 'm') return value * 60 * 1000;
    if (unit === 'h') return value * 60 * 60 * 1000;
    if (unit === 'd') return value * 24 * 60 * 60 * 1000;
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage giveaways')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        // 1. START COMMAND
        .addSubcommand(sub =>
            sub.setName('start')
                .setDescription('Start a new giveaway')
                .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 10m, 1h, 1d)').setRequired(true))
                .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setRequired(true))
                .addStringOption(opt => opt.setName('prize').setDescription('The prize (Title)').setRequired(true))
                .addChannelOption(opt => opt.setName('channel').setDescription('Where to post? (Optional)').addChannelTypes(ChannelType.GuildText))
        )
        // 2. END COMMAND
        .addSubcommand(sub =>
            sub.setName('end')
                .setDescription('End a giveaway early')
                .addStringOption(opt => opt.setName('message_id').setDescription('The ID of the giveaway message').setRequired(true))
        )
        // 3. REROLL COMMAND
        .addSubcommand(sub =>
            sub.setName('reroll')
                .setDescription('Reroll a winner')
                .addStringOption(opt => opt.setName('message_id').setDescription('The ID of the giveaway message').setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        // --- START ---
        if (sub === 'start') {
            const durationStr = interaction.options.getString('duration');
            const winnerCount = interaction.options.getInteger('winners');
            const prize = interaction.options.getString('prize');
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

            const ms = parseDuration(durationStr);
            if (!ms) {
                return interaction.reply({ 
                    content: '<:no:1297814819105144862> Invalid duration. Use `10m`, `1h`, `1d`.', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Permission Check
            if (!targetChannel.viewable || !targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
                 return interaction.reply({ 
                    content: `<:no:1297814819105144862> I cannot send messages in ${targetChannel}.`, 
                    flags: MessageFlags.Ephemeral 
                });
            }

            const endTime = Date.now() + ms;

            // Embed with Prize as Title
            const embed = new EmbedBuilder()
                .setTitle(`🎉 ${prize} 🎉`)
                .setDescription(`**Hosted by:** ${interaction.user}\n**Winners:** ${winnerCount}\n**Ends:** <t:${Math.floor(endTime / 1000)}:R>`)
                .setColor(0x00FF00) // Green
                .setFooter({ text: 'Click the button below to join!' });

            const button = new ButtonBuilder()
                .setCustomId('giveaway_join')
                .setLabel('Join Giveaway')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎉');

            const row = new ActionRowBuilder().addComponents(button);

            const msg = await targetChannel.send({ embeds: [embed], components: [row] });

            // Save to Database
            const newGiveaway = new Giveaway({
                guildId: interaction.guild.id,
                channelId: targetChannel.id,
                messageId: msg.id,
                hostId: interaction.user.id,
                prize: prize,
                winnersCount: winnerCount,
                startTimestamp: Date.now(),
                endTimestamp: endTime,
                ended: false,
                participants: []
            });

            await newGiveaway.save();

            return interaction.reply({ 
                content: `<:yes:1297814648417943565> Giveaway started in ${targetChannel}!`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        // --- END ---
        else if (sub === 'end') {
            const msgId = interaction.options.getString('message_id');
            const giveaway = await Giveaway.findOne({ messageId: msgId, guildId: interaction.guild.id });

            if (!giveaway || giveaway.ended) {
                return interaction.reply({ 
                    content: '<:no:1297814819105144862> Invalid or ended giveaway.', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Set time to past to trigger the auto-ender in index.js
            giveaway.endTimestamp = Date.now() - 1000;
            await giveaway.save();

            return interaction.reply({ 
                content: `<:yes:1297814648417943565> Ending giveaway...`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        // --- REROLL (With Booster Luck) ---
        else if (sub === 'reroll') {
            const msgId = interaction.options.getString('message_id');
            const giveaway = await Giveaway.findOne({ messageId: msgId, guildId: interaction.guild.id });

            if (!giveaway || !giveaway.ended || giveaway.participants.length === 0) {
                return interaction.reply({ 
                    content: '<:no:1297814819105144862> Cannot reroll (Invalid ID or no participants).', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            // 1. Build Weighted Pool
            let weightedPool = [];
            
            for (const userId of giveaway.participants) {
                weightedPool.push(userId); // Add everyone once
                
                try {
                    // Fetch member to check if boosting
                    const member = await interaction.guild.members.fetch(userId).catch(() => null);
                    if (member && member.premiumSince) {
                        weightedPool.push(userId); // Add Booster AGAIN (2x Chance)
                    }
                } catch (e) {
                    // Ignore if user left server
                }
            }

            // 2. Pick Winner
            if (weightedPool.length === 0) {
                return interaction.editReply({ content: '<:no:1297814819105144862> No valid members found to reroll.' });
            }

            const winnerId = weightedPool[Math.floor(Math.random() * weightedPool.length)];
            const giveawayChannel = interaction.guild.channels.cache.get(giveaway.channelId);
            
            // 3. Announce
            if (giveawayChannel) {
                await giveawayChannel.send(`🎉 **New Winner:** <@${winnerId}>! You won **${giveaway.prize}**!`);
                return interaction.editReply({ content: `<:yes:1297814648417943565> Rerolled!` });
            } else {
                return interaction.editReply({ content: `<:no:1297814819105144862> Could not find the giveaway channel.` });
            }
        }
    }
};
