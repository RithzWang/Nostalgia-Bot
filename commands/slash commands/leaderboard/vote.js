const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Leaderboard = require('../../../src/models/Leaderboard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vote')
        .setDescription('Vote for a participant')
        .addStringOption(option => 
            option.setName('to')
                .setDescription('Who do you want to vote for?')
                .setRequired(true)
                .setAutocomplete(true) // <--- ENABLE AUTOCOMPLETE
        ),

    // --- 1. AUTOCOMPLETE HANDLER ---
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        
        // Fetch leaderboard data
        const data = await Leaderboard.findOne({ guildId: interaction.guild.id });
        if (!data || !data.participants || data.participants.length === 0) {
            return await interaction.respond([]); // Return nothing if empty
        }

        // Fetch user objects to get names (cached ideally)
        // For speed, we just trust the ID, but to show names we need to fetch or cache.
        // We will try to find them in cache first.
        const choices = [];
        for (const p of data.participants) {
            const member = interaction.guild.members.cache.get(p.userId);
            const name = member ? member.displayName : `User ${p.userId}`;
            choices.push({ name: name, value: p.userId });
        }

        // Filter based on what user is typing
        const filtered = choices.filter(choice => 
            choice.name.toLowerCase().includes(focusedValue.toLowerCase())
        );

        // Discord allows max 25 choices
        await interaction.respond(filtered.slice(0, 25));
    },

    // --- 2. EXECUTE HANDLER ---
    async execute(interaction) {
        const targetId = interaction.options.getString('to');
        const data = await Leaderboard.findOne({ guildId: interaction.guild.id });

        // Basic Checks
        if (!data || !data.enabled) {
            return interaction.reply({ content: '<:no:1297814819105144862> Voting is currently closed.', flags: MessageFlags.Ephemeral });
        }

        // Check if user already voted
        if (data.voters.includes(interaction.user.id)) {
            return interaction.reply({ content: '<:no:1297814819105144862> You have already voted!', flags: MessageFlags.Ephemeral });
        }

        // Check if target is valid
        const participantIndex = data.participants.findIndex(p => p.userId === targetId);
        if (participantIndex === -1) {
            return interaction.reply({ content: '<:no:1297814819105144862> That user is not a participant.', flags: MessageFlags.Ephemeral });
        }

        // Update Votes
        data.participants[participantIndex].votes += 1;
        data.voters.push(interaction.user.id);
        await data.save();

        // Update the big leaderboard message immediately
        try {
            const channel = await interaction.guild.channels.fetch(data.channelId);
            const msg = await channel.messages.fetch(data.messageId);

            const sorted = data.participants.sort((a, b) => b.votes - a.votes);
            const description = sorted.map((p, index) => {
                let medal = '⚫';
                if (index === 0) medal = '🥇';
                if (index === 1) medal = '🥈';
                if (index === 2) medal = '🥉';
                return `${medal} **<@${p.userId}>** — \`${p.votes} Votes\``;
            }).join('\n');

            const embed = EmbedBuilder.from(msg.embeds[0]).setDescription(description);
            await msg.edit({ embeds: [embed] });

        } catch (e) {
            console.error("Could not update leaderboard display:", e);
        }

        return interaction.reply({ content: `<:yes:1297814648417943565> Vote cast for <@${targetId}>!`, flags: MessageFlags.Ephemeral });
    }
};
