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

const Giveaway = require('../../../src/models/Giveaway');

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
        // 1. START
        .addSubcommand(sub =>
            sub.setName('start')
                .setDescription('Start a new giveaway')
                .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 10m, 1h, 1d)').setRequired(true))
                .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setRequired(true))
                .addStringOption(opt => opt.setName('prize').setDescription('The prize (Title)').setRequired(true))
                .addStringOption(opt => opt.setName('description').setDescription('Extra details (Optional)').setRequired(false))
                .addRoleOption(opt => opt.setName('role').setDescription('Only users with this role can join (Optional)').setRequired(false)) // <--- ADDED ROLE
                .addChannelOption(opt => opt.setName('channel').setDescription('Where to post? (Optional)').addChannelTypes(ChannelType.GuildText))
        )
        // 2. END
        .addSubcommand(sub =>
            sub.setName('end')
                .setDescription('End a giveaway early')
                .addStringOption(opt => opt.setName('message_id').setDescription('The ID of the giveaway message').setRequired(true))
        )
        // 3. REROLL
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
            const description = interaction.options.getString('description');
            const requiredRole = interaction.options.getRole('role'); // <--- Get Role
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

            const ms = parseDuration(durationStr);
            if (!ms) {
                return interaction.reply({ 
                    content: '<:no:1297814819105144862> Invalid duration. Use `10m`, `1h`, `1d`.', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            if (!targetChannel.viewable || !targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
                 return interaction.reply({ 
                    content: `<:no:1297814819105144862> I cannot send messages in ${targetChannel}.`, 
                    flags: MessageFlags.Ephemeral 
                });
            }

            const endTime = Date.now() + ms;

            // --- BUILD DESCRIPTION ---
            let hostInfo = `**Hosted by:** ${interaction.user}\n**Winners:** ${winnerCount}\n**Ends:** <t:${Math.floor(endTime / 1000)}:R>`;
            
            // Add Role info if exists
            if (requiredRole) {
                hostInfo = `**Required Role:** ${requiredRole}\n` + hostInfo;
            }

            const finalDescription = description 
                ? `-# ${description}\n\n${hostInfo}` 
                : hostInfo;

            const embed = new EmbedBuilder()
                .setTitle(`🎉 ${prize}`)
                .setDescription(finalDescription)
                .setColor(0x808080)
                .setFooter({ text: 'Click the button below to join!' });

            const button = new ButtonBuilder()
                .setCustomId('giveaway_join')
                .setLabel('Join Giveaway')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🎉');

            const row = new ActionRowBuilder().addComponents(button);

            const msg = await targetChannel.send({ embeds: [embed], components: [row] });

            const newGiveaway = new Giveaway({
                guildId: interaction.guild.id,
                channelId: targetChannel.id,
                messageId: msg.id,
                hostId: interaction.user.id,
                prize: prize,
                description: description || null,
                requiredRoleId: requiredRole ? requiredRole.id : null, // <--- Save Role ID
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

            giveaway.endTimestamp = Date.now() - 1000;
            await giveaway.save();

            return interaction.reply({ 
                content: `<:yes:1297814648417943565> Ending giveaway...`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        // --- REROLL ---
        else if (sub === 'reroll') {
            const msgId = interaction.options.getString('message_id');
            const giveaway = await Giveaway.findOne({ messageId: msgId, guildId: interaction.guild.id });

            if (!giveaway || !giveaway.ended || giveaway.participants.length === 0) {
                return interaction.reply({ 
                    content: '<:no:1297814819105144862> Cannot reroll.', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            let weightedPool = [];
            for (const userId of giveaway.participants) {
                weightedPool.push(userId);
                try {
                    const member = await interaction.guild.members.fetch(userId).catch(() => null);
                    if (member && member.premiumSince) {
                        weightedPool.push(userId); 
                    }
                } catch (e) {}
            }

            if (weightedPool.length === 0) {
                return interaction.editReply({ content: '<:no:1297814819105144862> No valid members found.' });
            }

            const winnerId = weightedPool[Math.floor(Math.random() * weightedPool.length)];
            const giveawayChannel = interaction.guild.channels.cache.get(giveaway.channelId);
            
            if (giveawayChannel) {
                await giveawayChannel.send(`🎉 **New Winner:** <@${winnerId}>! You won **${giveaway.prize}**!`);
                return interaction.editReply({ content: `<:yes:1297814648417943565> Rerolled!` });
            } else {
                return interaction.editReply({ content: `<:no:1297814819105144862> Could not find channel.` });
            }
        }
    }
};
