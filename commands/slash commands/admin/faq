const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    MessageFlags, 
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ComponentType
} = require('discord.js');

const moment = require('moment-timezone');
const FAQ = require('../../../src/models/FaqSchema'); 

module.exports = {
    guildOnly: true,
    data: new SlashCommandBuilder()
        .setName('faq')
        .setDescription('Manage the Server FAQ System')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // --- 1. SETUP ---
        .addSubcommand(sub => 
            sub.setName('setup')
                .setDescription('Initialize or Link an FAQ Panel')
                .addStringOption(opt => opt.setName('message_id').setDescription('Existing message ID (Optional)'))
                .addChannelOption(opt => 
                    opt.setName('channel')
                        .setDescription('Channel location (Optional)')
                        .addChannelTypes(ChannelType.GuildText))
        )

        // --- 2. ADD ---
        .addSubcommand(sub => 
            sub.setName('add')
                .setDescription('Open form to add a new Q&A')
        )

        // --- 3. EDIT ---
        .addSubcommand(sub => 
            sub.setName('edit')
                .setDescription('Select a question to edit')
        )

        // --- 4. REMOVE ---
        .addSubcommand(sub => 
            sub.setName('remove')
                .setDescription('Select one or more questions to remove')
        ),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            const faqEntry = await FAQ.findOne({ guildId: guildId });

            // -----------------------------------------------------
            //                   SETUP COMMAND
            // -----------------------------------------------------
            if (sub === 'setup') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
                const targetMsgId = interaction.options.getString('message_id');
                let message;

                try {
                    if (targetMsgId) {
                        try {
                            message = await targetChannel.messages.fetch(targetMsgId);
                        } catch (e) {
                            return interaction.editReply(`<:no:1297814819105144862> Could not find message ID \`${targetMsgId}\`.`);
                        }
                    } else {
                        message = await targetChannel.send({ content: 'Initializing FAQ...' });
                    }

                    await FAQ.deleteMany({ guildId: guildId });

                    const newFaqData = await FAQ.create({
                        guildId: guildId,
                        channelId: targetChannel.id,
                        messageId: message.id,
                        questions: []
                    });

                    await message.edit(renderFAQ(newFaqData));
                    
                    // Use Safe Reply
                    await safeReply(interaction, `<:yes:1297814648417943565> FAQ Panel linked in ${targetChannel}.`);

                } catch (setupError) {
                    console.error("Setup Error:", setupError);
                    await safeReply(interaction, `<:no:1297814819105144862> Setup failed: ${setupError.message}`);
                }
                return; // STOP
            }

            // --- CHECK: Ensure FAQ exists ---
            if (!faqEntry) {
                return interaction.reply({ 
                    content: `<:no:1297814819105144862> No FAQ panel found. Run \`/faq setup\` first.`, 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // -----------------------------------------------------
            //                    ADD COMMAND
            // -----------------------------------------------------
            if (sub === 'add') {
                const modal = new ModalBuilder()
                    .setCustomId('faq_add_modal')
                    .setTitle('Add New Question');

                const qInput = new TextInputBuilder()
                    .setCustomId('question')
                    .setLabel("Question")
                    .setPlaceholder("e.g. How do I apply?")
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(100)
                    .setRequired(true);

                const aInput = new TextInputBuilder()
                    .setCustomId('answer')
                    .setLabel("Answer")
                    .setPlaceholder("Markdown is supported here.")
                    .setStyle(TextInputStyle.Paragraph)
                    .setMaxLength(1000)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(qInput),
                    new ActionRowBuilder().addComponents(aInput)
                );

                await interaction.showModal(modal);

                try {
                    const submitted = await interaction.awaitModalSubmit({
                        time: 300000,
                        filter: i => i.user.id === interaction.user.id && i.customId === 'faq_add_modal'
                    });

                    // Defer immediately
                    await submitted.deferReply({ flags: MessageFlags.Ephemeral });

                    const question = submitted.fields.getTextInputValue('question');
                    const answer = submitted.fields.getTextInputValue('answer');

                    faqEntry.questions.push({ question, answer });
                    await faqEntry.save();

                    // Refresh public message
                    const success = await refreshFAQMessage(interaction, faqEntry);

                    if (success) {
                        await safeReply(submitted, `<:yes:1297814648417943565> Added question: **${question}**`);
                    } else {
                        await safeReply(submitted, `<:no:1297814819105144862> Database updated, but message edit failed.`);
                    }
                } catch (innerErr) {
                    if (innerErr.code === 'InteractionCollectorError') return;
                    console.error("Error in Modal Add:", innerErr);
                }
                return; // STOP
            }

            // -----------------------------------------------------
            //                    EDIT COMMAND
            // -----------------------------------------------------
            if (sub === 'edit') {
                if (faqEntry.questions.length === 0) {
                    return interaction.reply({ content: `<:no:1297814819105144862> No questions to edit.`, flags: MessageFlags.Ephemeral });
                }

                const options = faqEntry.questions.slice(0, 25).map((q, index) => 
                    new StringSelectMenuOptionBuilder()
                        .setLabel(q.question.substring(0, 100))
                        .setValue(index.toString())
                );

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('faq_edit_select')
                    .setPlaceholder('Click to select a question')
                    .addOptions(options);

                const container = new ContainerBuilder()
                    .setAccentColor(0x888888)
                    .addTextDisplayComponents(t => t.setContent('### Which question would you like to edit?'))
                    .addSeparatorComponents(s => s)
                    .addActionRowComponents(row => row.setComponents(selectMenu));

                const response = await interaction.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });

                const selection = await response.awaitMessageComponent({
                    componentType: ComponentType.StringSelect,
                    time: 60000
                }).catch(() => null);

                if (!selection) return interaction.deleteReply().catch(() => {});

                const index = parseInt(selection.values[0]);
                const targetQ = faqEntry.questions[index];

                const modal = new ModalBuilder()
                    .setCustomId(`faq_edit_modal_${index}`)
                    .setTitle('Edit Question');

                const qInput = new TextInputBuilder()
                    .setCustomId('question')
                    .setLabel("Question")
                    .setStyle(TextInputStyle.Short)
                    .setValue(targetQ.question)
                    .setRequired(true);

                const aInput = new TextInputBuilder()
                    .setCustomId('answer')
                    .setLabel("Answer")
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(targetQ.answer)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(qInput),
                    new ActionRowBuilder().addComponents(aInput)
                );

                await selection.showModal(modal);

                try {
                    const submitted = await selection.awaitModalSubmit({
                        time: 300000,
                        filter: i => i.user.id === interaction.user.id
                    });

                    await submitted.deferReply({ flags: MessageFlags.Ephemeral });

                    faqEntry.questions[index].question = submitted.fields.getTextInputValue('question');
                    faqEntry.questions[index].answer = submitted.fields.getTextInputValue('answer');
                    
                    await faqEntry.save();
                    await refreshFAQMessage(interaction, faqEntry);
                    
                    await safeReply(submitted, `<:yes:1297814648417943565> Question updated successfully.`);
                } catch (e) {
                    if (e.code === 'InteractionCollectorError') return;
                    console.error("Edit modal error:", e);
                }
                return; // STOP
            }

            // -----------------------------------------------------
            //                  REMOVE COMMAND
            // -----------------------------------------------------
            if (sub === 'remove') {
                if (faqEntry.questions.length === 0) {
                    return interaction.reply({ content: `<:no:1297814819105144862> No questions to remove.`, flags: MessageFlags.Ephemeral });
                }

                const options = faqEntry.questions.slice(0, 25).map((q, index) => 
                    new StringSelectMenuOptionBuilder()
                        .setLabel(q.question.substring(0, 100))
                        .setDescription('Select to remove')
                        .setValue(index.toString())
                );

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('faq_remove_select')
                    .setPlaceholder('Choose questions to remove (Multiple allowed)')
                    .setMinValues(1)
                    .setMaxValues(options.length) 
                    .addOptions(options);

                const container = new ContainerBuilder()
                    .setAccentColor(0x888888)
                    .addTextDisplayComponents(t => t.setContent('### Which question would you like to remove?'))
                    .addSeparatorComponents(s => s)
                    .addActionRowComponents(row => row.setComponents(selectMenu));

                const response = await interaction.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });

                const selection = await response.awaitMessageComponent({
                    componentType: ComponentType.StringSelect,
                    time: 60000
                }).catch(() => null);

                if (!selection) return interaction.deleteReply().catch(() => {});

                try {
                    // Defer immediately
                    await selection.deferUpdate();

                    const indicesToRemove = selection.values
                        .map(v => parseInt(v))
                        .sort((a, b) => b - a);

                    let count = 0;
                    for (const index of indicesToRemove) {
                        faqEntry.questions.splice(index, 1);
                        count++;
                    }

                    await faqEntry.save();
                    await refreshFAQMessage(interaction, faqEntry);
                    
                    // Attempt to reply. If it fails, fallback to channel message.
                    await safeReply(selection, `<:yes:1297814648417943565> Successfully removed **${count}** question(s).`, true);

                } catch (removeError) {
                    console.error("Remove Flow Error:", removeError);
                }
                return; // STOP
            }

        } catch (error) {
            console.error("Main Command Error:", error);
            // This is the safety net for unknown errors
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: `<:no:1297814819105144862> Error: ${error.message}`, flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        }
    }
};

// ==========================================
// HELPERS
// ==========================================

/**
 * Attempts to reply to an interaction.
 * If the interaction is dead/unknown, it falls back to sending a message in the channel.
 * @param {object} interactionOrSelection - The interaction object (modal submit or select menu)
 * @param {string} content - The message content
 * @param {boolean} clearComponents - Whether to clear components (used for remove command)
 */
async function safeReply(interactionOrSelection, content, clearComponents = false) {
    try {
        const payload = { 
            content: content, 
            flags: MessageFlags.Ephemeral 
        };
        if (clearComponents) payload.components = [];

        await interactionOrSelection.editReply(payload);
    } catch (err) {
        console.warn("Interaction reply failed, falling back to channel message:", err.code);
        // Fallback: Send a regular message to the channel if possible
        if (interactionOrSelection.channel) {
            try {
                // Stripping custom emojis for safety or keeping them if the bot has access
                // Note: Regular messages are public, so we tag the user.
                await interactionOrSelection.channel.send(`${interactionOrSelection.user} ${content}`);
            } catch (sendErr) {
                console.warn("Could not send fallback message:", sendErr);
            }
        }
    }
}

async function refreshFAQMessage(interaction, faqData) {
    try {
        const channel = await interaction.guild.channels.fetch(faqData.channelId);
        if (!channel) return false;
        const message = await channel.messages.fetch(faqData.messageId);
        if (!message) return false;

        await message.edit(renderFAQ(faqData));
        return true;
    } catch (e) {
        console.error("Failed to refresh FAQ:", e);
        return false;
    }
}

const renderFAQ = (faqData) => {
    const now = moment().tz('Asia/Bangkok').format('DD/MM/YYYY');

    const container = new ContainerBuilder();

    // Header
    const headerText = new TextDisplayBuilder().setContent('## ❓ Frequently Asked Questions');
    container.addTextDisplayComponents(headerText);

    // Questions
    if (faqData.questions.length > 0) {
        faqData.questions.forEach((q, index) => {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ${q.question}\n-# > ${q.answer}`)
            );

            if (index < faqData.questions.length - 1) {
                container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
            }
        });
        
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    } else {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent('*No questions added yet.*')
        );
    }

    // Footer
    const btn = new ButtonBuilder()
        .setCustomId('faq_timestamp')
        .setLabel(`Last Updated: ${now}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

    container.addActionRowComponents(new ActionRowBuilder().addComponents(btn));

    return { 
        content: '', 
        embeds: [], 
        files: [],   
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] } 
    };
};
