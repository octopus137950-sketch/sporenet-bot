import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits,
    TextChannel,
    } from "discord.js";
    import { addItemToInventory, getLogChannel } from "../data/store.js";
    import { ITEMS_POOL, getItemById } from "../data/itemsPool.js";

    export const data = new SlashCommandBuilder()
    .setName("give-item")
    .setDescription("🎁 เสกไอเทมบัฟให้ผู้เล่น (เฉพาะแอดมิน)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((o) =>
      o.setName("player").setDescription("ผู้เล่นที่ต้องการให้ไอเทม").setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("item")
        .setDescription("ไอเทมที่ต้องการให้")
        .setRequired(true)
        .addChoices(
          ...ITEMS_POOL.map((item) => ({
            name: `${item.emoji} ${item.name} — ${item.lore}`,
            value: item.id,
          }))
        )
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("เหตุผลที่ให้ไอเทม").setRequired(false)
    );

    export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    if (!guild) {
      await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
      return;
    }

    const target = interaction.options.getUser("player", true);
    const itemId = interaction.options.getString("item", true);
    const reason = interaction.options.getString("reason") ?? "ไม่ระบุเหตุผล";

    const item = getItemById(itemId);
    if (!item) {
      await interaction.editReply("❌ ไม่พบไอเทมนี้ในระบบ");
      return;
    }

    addItemToInventory(target.id, itemId);

    const embed = new EmbedBuilder()
      .setTitle(`🎁 มอบไอเทมสำเร็จ`)
      .setColor(0x57f287)
      .addFields(
        { name: "👤 ผู้รับ", value: `<@${target.id}> (${target.username})`, inline: true },
        { name: `${item.emoji} ไอเทม`, value: `**${item.name}**`, inline: true },
        { name: "✨ บัฟ", value: item.lore, inline: false },
        { name: "📝 เหตุผล", value: reason, inline: false },
        {
          name: "💡 วิธีใช้",
          value: `ผู้รับสามารถสวมใส่ได้ผ่าน </wallet:0> → เลือกไอเทม → กด **สวมใส่**`,
          inline: false,
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    const logChannelId = getLogChannel(guild.id);
    if (logChannelId) {
      const logChannel = guild.channels.cache.get(logChannelId) as TextChannel | undefined;
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle("🔑 แอดมินเสกไอเทม")
          .setColor(0xfee75c)
          .addFields(
            { name: "🛡️ แอดมิน", value: `<@${interaction.user.id}> (${interaction.user.username})`, inline: true },
            { name: "👤 ผู้รับ", value: `<@${target.id}> (${target.username})`, inline: true },
            { name: `${item.emoji} ไอเทม`, value: `${item.name}`, inline: true },
            { name: "✨ บัฟ", value: item.lore, inline: false },
            { name: "📝 เหตุผล", value: reason, inline: false }
          )
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
      }
    }
    }
    