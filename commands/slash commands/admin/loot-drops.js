const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    MessageFlags, 
    ChannelType,
    TextDisplayBuilder, 
    SeparatorBuilder, 
    SeparatorSpacingSize, 
    ButtonBuilder, 
    ButtonStyle, 
    ActionRowBuilder, 
    ContainerBuilder
} = require('discord.js');

const { GuildConfig, LootDrop } = require('../../../src/models/LootDropSchema'); // Adjust path

// Helper function to build the Container exactly like your request
const buildLootContainer = (type, data) => {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Loot Drops")
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
        );

    let desc = "-# A new loot drop is available!\n\n";

    if (type === 'link') {
        desc += `**Loot:** ${data.lootName}\n**Amount:** ${data.maxAmount}\n`;
        if (data.expireTime) desc += `**Expire Time:** <t:${Math.floor(data.expireTime / 1000)}:R>\n`;
        if (data.supporterId) desc += `**Supporter:** <@${data.supporterId}>\n`;
    } else {
        desc += `**Loot:** <@&${data.rolePrizeId}>\n`;
        if (data.maxAmount) desc += `**Amount:** ${data.maxAmount}\n`;
        if (data.expireTime) desc += `**Expire Time:** <t:${Math.floor(data.expireTime / 1000)}:R>\n`;
        if (data.specialRole) desc += `**Requirement:** <@&${data.specialRole}>\n`;
    }

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(desc)
    ).addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    // Disable primary button if closed or max claimed
    const isClosed = Boolean(data.status === 'closed' || (data.maxAmount && data.claimedCount >= data.maxAmount));

    
    let secondaryLabel = data.maxAmount 
        ? `Claimed ${data.claimedCount}/${data.maxAmount}` 
        : `Claimed ${data.claimedCount}`;

    container.addActionRowComponents(
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Primary)
                    .setLabel("Claim Loot")
                    .setCustomId("536bd0f667bc4218861e4760b5fff9cd") // Your requested custom ID
                    .setDisabled(isClosed),
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel(secondaryLabel)
                    .setDisabled(true)
                    .setCustomId("68df599500984f22fdcfeff6168abdd7") // Your requested custom ID
            )
    );

    return [container];
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loot-drops')
        .setDescription('Manage Loot Drops')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        // --- 1. SET CHANNEL ---
        .addSubcommand(sub => 
            sub.setName('set-channel')
                .setDescription('Set the channel where loot drops are sent')
                .addChannelOption(opt => opt.setName('channel').setDescription('Target Channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
        )

        // --- 2. PRIZE LINK ---
        .addSubcommand(sub => {
            sub.setName('prize-link')
               .setDescription('Create a link-based loot drop')
               .addStringOption(opt => opt.setName('loot').setDescription('Loot name').setRequired(true))
               .addStringOption(opt => opt.setName('prize_1').setDescription('First prize link').setRequired(true))
               .addRoleOption(opt => opt.setName('special_role').setDescription('Role requirement (Optional)'))
               .addIntegerOption(opt => opt.setName('expire_time').setDescription('Expire time in minutes (Optional)'))
               .addUserOption(opt => opt.setName('supporter').setDescription('Supporter user (Optional)'));
            
            // Add optional prizes 2 through 15
            for (let i = 2; i <= 15; i++) {
                sub.addStringOption(opt => opt.setName(`prize_${i}`).setDescription(`Prize link ${i} (Optional)`));
            }
            return sub;
        })

        // --- 3. PRIZE ROLE ---
        .addSubcommand(sub => 
            sub.setName('prize-role')
                .setDescription('Create a role-based loot drop')
                .addRoleOption(opt => opt.setName('role_prize').setDescription('The role to give').setRequired(true))
                .addIntegerOption(opt => opt.setName('expire_time').setDescription('Expire time in minutes').setRequired(true))
                .addRoleOption(opt => opt.setName('special_role').setDescription('Role requirement (Optional)'))
                .addIntegerOption(opt => opt.setName('amount').setDescription('Max amount of claims (Optional)'))
        )

        // --- 4. CLOSE ---
        .addSubcommand(sub => 
            sub.setName('close')
                .setDescription('Force close a loot drop')
                .addStringOption(opt => opt.setName('loot_id').setDescription('Message ID of the loot').setRequired(true))
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            // SET-CHANNEL
            if (sub === 'set-channel') {
                const channel = interaction.options.getChannel('channel');
                await GuildConfig.findOneAndUpdate(
                    { guildId }, 
                    { lootChannelId: channel.id }, 
                    { upsert: true }
                );
                return interaction.editReply(`<:yes:1297814648417943565> Loot drops channel set to ${channel}`);
            }

            // Fetch Config
            const config = await GuildConfig.findOne({ guildId });
            if (!config) return interaction.editReply(`<:no:1297814819105144862> Please use \`/loot-drops set-channel\` first!`);
            
            const targetChannel = await interaction.guild.channels.fetch(config.lootChannelId).catch(() => null);
            if (!targetChannel) return interaction.editReply(`<:no:1297814819105144862> The configured drop channel no longer exists.`);

            // PRIZE-LINK
            if (sub === 'prize-link') {
                const lootName = interaction.options.getString('loot');
                const specialRole = interaction.options.getRole('special_role');
                const expireMins = interaction.options.getInteger('expire_time');
                const supporter = interaction.options.getUser('supporter');

                // Collect all provided links
                const prizes = [];
                for (let i = 1; i <= 15; i++) {
                    const p = interaction.options.getString(`prize_${i}`);
                    if (p) prizes.push(p);
                }

                const data = {
                    type: 'link',
                    lootName,
                    prizes,
                    maxAmount: prizes.length,
                    claimedCount: 0,
                    expireTime: expireMins ? Date.now() + (expireMins * 60000) : null,
                    specialRole: specialRole ? specialRole.id : null,
                    supporterId: supporter ? supporter.id : null,
                    status: 'active'
                };

                const components = buildLootContainer('link', data);
                const msg = await targetChannel.send({ components, flags: MessageFlags.IsComponentsV2 });

                await LootDrop.create({ ...data, messageId: msg.id, guildId });
                return interaction.editReply(`<:yes:1297814648417943565> Link Drop created!`);
            }

            // PRIZE-ROLE
            if (sub === 'prize-role') {
                const rolePrize = interaction.options.getRole('role_prize');
                const expireMins = interaction.options.getInteger('expire_time');
                const specialRole = interaction.options.getRole('special_role');
                const amount = interaction.options.getInteger('amount');

                const data = {
                    type: 'role',
                    rolePrizeId: rolePrize.id,
                    maxAmount: amount || null,
                    claimedCount: 0,
                    expireTime: Date.now() + (expireMins * 60000), // Required in your prompt
                    specialRole: specialRole ? specialRole.id : null,
                    status: 'active'
                };

                const components = buildLootContainer('role', data);
                const msg = await targetChannel.send({ components, flags: MessageFlags.IsComponentsV2 });

                await LootDrop.create({ ...data, messageId: msg.id, guildId });
                return interaction.editReply(`<:yes:1297814648417943565> Role Drop created!`);
            }

            // CLOSE
            if (sub === 'close') {
                const messageId = interaction.options.getString('loot_id');
                const drop = await LootDrop.findOne({ messageId, guildId });
                
                if (!drop) return interaction.editReply(`<:no:1297814819105144862> Loot drop not found.`);
                if (drop.status === 'closed') return interaction.editReply(`<:no:1297814819105144862> This drop is already closed.`);

                drop.status = 'closed';
                await drop.save();

                const msg = await targetChannel.messages.fetch(messageId).catch(() => null);
                if (msg) {
                    const components = buildLootContainer(drop.type, drop);
                    await msg.edit({ components, flags: MessageFlags.IsComponentsV2 });
                }

                return interaction.editReply(`<:yes:1297814648417943565> Drop successfully forced closed.`);
            }

        } catch (error) {
            console.error(error);
            return interaction.editReply(`<:no:1297814819105144862> Error: ${error.message}`);
        }
    }
};

module.exports.buildLootContainer = buildLootContainer; // Exporting for the event listener to reuse
