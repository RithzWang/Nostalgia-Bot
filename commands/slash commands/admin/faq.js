const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    MessageFlags, 
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MediaGalleryBuilder
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
                .addStringOption(opt => 
                    opt.setName('message_id')
                        .setDescription('Existing message ID to turn into FAQ (Optional)'))
                .addChannelOption(opt => 
                    opt.setName('channel')
                        .setDescription('Where the message is (Optional, defaults to current channel)')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false))
        )

        // --- 2. ADD QUESTION ---
        .addSubcommand(sub => 
            sub.setName('add')
                .setDescription('Add a new Q&A pair')
                .addStringOption(opt => opt.setName('question').setDescription('The question text').setRequired(true))
                .addStringOption(opt => opt.setName('answer').setDescription('The answer text').setRequired(true))
                .addAttachmentOption(opt => opt.setName('image').setDescription('Optional image to attach'))
        )

        // --- 3. EDIT QUESTION ---
        .addSubcommand(sub => 
            sub.setName('edit')
                .setDescription('Edit an existing Q&A pair')
                .addStringOption(opt => opt.setName('target_question').setDescription('The EXACT existing question you want to edit').setRequired(true))
                .addStringOption(opt => opt.setName('new_question').setDescription('New question text (Optional)'))
                .addStringOption(opt => opt.setName('new_answer').setDescription('New answer text (Optional)'))
                .addAttachmentOption(opt => opt.setName('new_image').setDescription('New image (Optional)'))
        )

        // --- 4. REMOVE QUESTION ---
        .addSubcommand(sub => 
            sub.setName('remove')
                .setDescription('Remove a Q&A pair')
                .addStringOption(opt => opt.setName('question').setDescription('The exact question text to remove').setRequired(true))
        ),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // --- HELPER 1: RENDER LOADING STATE ---
        const renderLoading = () => {
            // Create instances explicitly
            const text = new TextDisplayBuilder().setContent('### 🔄 Updating FAQ...\nPlease wait.');
            
            const loadingContainer = new ContainerBuilder()
                .setAccentColor(0x888888) 
                .addTextDisplayComponents(text); // Pass instance
            
            return {
                content: '',
                components: [loadingContainer],
                flags: MessageFlags.IsComponentsV2
            };
        };

        // --- HELPER 2: RENDER FINAL FAQ ---
        const renderFAQ = (faqData) => {
            const now = moment().tz('Asia/Bangkok').format('DD/MM/YYYY hh:mm A');

            // 1. Build Container
            const container = new ContainerBuilder()
                .setAccentColor(0x888888);

            // Add Header
            const headerText = new TextDisplayBuilder().setContent('## ❓ Questions — Answers');
            container.addTextDisplayComponents(headerText);

            // 2. Loop through Questions
            if (faqData.questions.length > 0) {
                faqData.questions.forEach((q, index) => {
                    // Create Section Instance
                    const section = new SectionBuilder();
                    
                    // Create Text Instance
                    const qaText = new TextDisplayBuilder().setContent(`> ### ${q.question}\n${q.answer}`);
                    
                    // Add Text to Section
                    section.addTextDisplayComponents(qaText);
                    
                    // Add Section to Container
                    container.addSectionComponents(section);

                    // Add Separator (except after the last one)
                    if (index < faqData.questions.length - 1) {
                        const sep = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small);
                        container.addSeparatorComponents(sep);
                    }
                });

                // 3. Handle Images (Media Gallery)
                const images = faqData.questions.filter(q => q.image).map(q => q.image);
                if (images.length > 0) {
                    const gallery = new MediaGalleryBuilder();
                    
                    // Add items loop
                    // Note: Depending on lib version, addItems might take objects with { url: ... }
                    // or a builder. We try the standard object structure for galleries.
                    for (const imgUrl of images) {
                         // Some implementations use .addItems({ src: url }) or similar.
                         // Attempting the most standard V2 builder pattern:
                         gallery.addItems({ url: imgUrl }); 
                    }
                    
                    container.addMediaGalleryComponents(gallery);
                }
            } else {
                const emptyText = new TextDisplayBuilder().setContent('*No questions added yet.*');
                const emptySection = new SectionBuilder().addTextDisplayComponents(emptyText);
                container.addSectionComponents(emptySection);
            }

            // 4. Last Updated Button
            const btn = new ButtonBuilder()
                .setCustomId('faq_timestamp')
                .setLabel(`Last updated ${now} (GMT+7)`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

            const row = new ActionRowBuilder().addComponents(btn);

            container.addActionRowComponents(row);

            return { 
                content: '', 
                embeds: [], 
                files: [],   
                components: [container],
                flags: MessageFlags.IsComponentsV2 
            };
        };

        // --- HELPER 3: UPDATE MESSAGE WITH ANIMATION ---
        const updateMessageWithAnimation = async (channelId, messageId, faqData) => {
            const channel = await interaction.guild.channels.fetch(channelId);
            if (!channel) return false;

            const message = await channel.messages.fetch(messageId);
            if (!message) return false;

            // 1. Show Loading Animation
            await message.edit(renderLoading());

            // 2. Wait 3 seconds
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 3. Show Final Content
            await message.edit(renderFAQ(faqData));
            return true;
        };

        try {
            const faqEntry = await FAQ.findOne({ guildId: guildId });

            // ===========================================
            //                 SETUP
            // ===========================================
            if (sub === 'setup') {
                const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
                const targetMsgId = interaction.options.getString('message_id');
                let message;

                if (targetMsgId) {
                    try {
                        message = await targetChannel.messages.fetch(targetMsgId);
                        
                        await message.edit(renderLoading());
                        await new Promise(r => setTimeout(r, 3000));

                    } catch (e) {
                        return interaction.editReply(`<:no:1297814819105144862> Could not find message ID \`${targetMsgId}\` in ${targetChannel}.`);
                    }
                } else {
                    message = await targetChannel.send({ content: 'Creating FAQ...' });
                }

                await FAQ.deleteMany({ guildId: guildId });

                const newFaqData = await FAQ.create({
                    guildId: guildId,
                    channelId: targetChannel.id,
                    messageId: message.id,
                    questions: []
                });

                await message.edit(renderFAQ(newFaqData));
                return interaction.editReply(`<:yes:1297814648417943565> FAQ Panel setup successfully in ${targetChannel}.`);
            }

            if (!faqEntry) return interaction.editReply(`<:no:1297814819105144862> No FAQ panel found. Run \`/faq setup\` first.`);

            // ===========================================
            //                  ADD
            // ===========================================
            if (sub === 'add') {
                const question = interaction.options.getString('question');
                const answer = interaction.options.getString('answer');
                const attachment = interaction.options.getAttachment('image');

                faqEntry.questions.push({
                    question: question,
                    answer: answer,
                    image: attachment ? attachment.url : null
                });
                await faqEntry.save();

                const success = await updateMessageWithAnimation(faqEntry.channelId, faqEntry.messageId, faqEntry);
                
                if (success) return interaction.editReply(`<:yes:1297814648417943565> Question added!`);
                return interaction.editReply(`<:no:1297814819105144862> Could not find the original FAQ message.`);
            }

            // ===========================================
            //                 EDIT
            // ===========================================
            if (sub === 'edit') {
                const targetQ = interaction.options.getString('target_question');
                const newQ = interaction.options.getString('new_question');
                const newA = interaction.options.getString('new_answer');
                const newImg = interaction.options.getAttachment('new_image');

                const index = faqEntry.questions.findIndex(q => q.question === targetQ);
                if (index === -1) return interaction.editReply(`<:no:1297814819105144862> Question not found.`);

                if (newQ) faqEntry.questions[index].question = newQ;
                if (newA) faqEntry.questions[index].answer = newA;
                if (newImg) faqEntry.questions[index].image = newImg.url;

                await faqEntry.save();

                const success = await updateMessageWithAnimation(faqEntry.channelId, faqEntry.messageId, faqEntry);
                if (success) return interaction.editReply(`<:yes:1297814648417943565> FAQ updated!`);
                return interaction.editReply(`<:no:1297814819105144862> Could not find message.`);
            }

            // ===========================================
            //                 REMOVE
            // ===========================================
            if (sub === 'remove') {
                const targetQ = interaction.options.getString('question');
                const initialLength = faqEntry.questions.length;
                
                faqEntry.questions = faqEntry.questions.filter(q => q.question !== targetQ);

                if (faqEntry.questions.length === initialLength) {
                    return interaction.editReply(`<:no:1297814819105144862> Question not found.`);
                }

                await faqEntry.save();

                const success = await updateMessageWithAnimation(faqEntry.channelId, faqEntry.messageId, faqEntry);
                if (success) return interaction.editReply(`<:yes:1297814648417943565> Question removed!`);
                return interaction.editReply(`<:no:1297814819105144862> Could not find message.`);
            }

        } catch (error) {
            console.error(error);
            return interaction.editReply(`<:no:1297814819105144862> An error occurred: ${error.message}`);
        }
    }
};
