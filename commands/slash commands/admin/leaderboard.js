const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const Leaderboard = require('../../../src/models/Leaderboard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Manage the voting leaderboard')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        // 1. ENABLE
        .addSubcommand(sub => 
            sub.setName('enable')
               .setDescription('Create and post the leaderboard')
               .addChannelOption(opt => opt.setName('channel').setDescription('Where to post?').addChannelTypes(ChannelType.GuildText))
        )
        // 2. DISABLE
        .addSubcommand(sub => 
            sub.setName('disable')
               .setDescription('Stop the leaderboard')
        )
        // 3. ADD PARTICIPANT
        .addSubcommand(sub => 
            sub.setName('participants')
               .setDescription('Add a user to the leaderboard')
               .addUserOption(opt => opt.setName('add').setDescription('The user to add').setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // Fetch or create config
        let data = await Leaderboard.findOne({ guildId });
        if (!data) data = new Leaderboard({ guildId, participants: [] });

        // --- SUBCOMMAND: ENABLE ---
        if (sub === 'enable') {
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            
            // Initial Embed
            const embed = new EmbedBuilder()
                .setTitle('🏆 Official Leaderboard')
                .setDescription('No participants yet.\nUse `/leaderboard participants add` to populate this list!')
                .setColor(0xFFD700) // Gold
                .setFooter({ text: 'Use /vote to cast your vote!' });

            const msg = await channel.send({ embeds: [embed] });

            data.enabled = true;
            data.channelId = channel.id;
            data.messageId = msg.id;
            await data.save();

            return interaction.reply({ content: `<:yes:1297814648417943565> Leaderboard posted in ${channel}.`, flags: MessageFlags.Ephemeral });
        }

        // --- SUBCOMMAND: DISABLE ---
        if (sub === 'disable') {
            if (data.channelId && data.messageId) {
                try {
                    const ch = await interaction.guild.channels.fetch(data.channelId);
                    const msg = await ch.messages.fetch(data.messageId);
                    await msg.delete();
                } catch (e) { }
            }
            data.enabled = false;
            data.channelId = null;
            data.messageId = null;
            await data.save();
            return interaction.reply({ content: '<:yes:1297814648417943565> Leaderboard disabled.', flags: MessageFlags.Ephemeral });
        }

        // --- SUBCOMMAND: PARTICIPANTS ADD ---
        if (sub === 'participants') {
            const target = interaction.options.getUser('add');

            // Check if already added
            if (data.participants.some(p => p.userId === target.id)) {
                return interaction.reply({ content: `<:no:1297814819105144862> ${target} is already on the list!`, flags: MessageFlags.Ephemeral });
            }

            // Add to DB
            data.participants.push({ userId: target.id, votes: 0 });
            await data.save();

            // Update the Live Message
            await updateLeaderboardMessage(interaction, data);

            return interaction.reply({ content: `<:yes:1297814648417943565> Added **${target.displayName}** to the leaderboard.`, flags: MessageFlags.Ephemeral });
        }
    }
};

// Helper function to update the big message
async function updateLeaderboardMessage(interaction, data) {
    if (!data.enabled || !data.channelId || !data.messageId) return;

    try {
        const channel = await interaction.guild.channels.fetch(data.channelId);
        const msg = await channel.messages.fetch(data.messageId);

        // Sort by votes (highest first)
        const sorted = data.participants.sort((a, b) => b.votes - a.votes);

        // Generate the text list
        const description = sorted.map((p, index) => {
            let medal = '⚫'; // default bullet
            if (index === 0) medal = '🥇';
            if (index === 1) medal = '🥈';
            if (index === 2) medal = '🥉';

            return `${medal} **<@${p.userId}>** — \`${p.votes} Votes\``;
        }).join('\n') || 'No participants yet.';

        const embed = EmbedBuilder.from(msg.embeds[0])
            .setDescription(description)
            .setTimestamp();

        await msg.edit({ embeds: [embed] });
    } catch (e) {
        console.error("Failed to update leaderboard msg:", e);
    }
}
