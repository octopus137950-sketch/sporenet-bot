import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import {
  createMarketplaceListing,
  getInventory,
  getMarketplaceConfig,
  cancelMarketplaceListing,
  setMarketplaceListingMessageId,
} from "../data/store.js";
import { getItemById, ITEMS_POOL } from "../data/itemsPool.js";

export const data = new SlashCommandBuilder()
  .setName("market-sell")
  .setDescription("📤 ลงขายไอเทมในตลาดกลาง (ใช้ในห้องตลาดเท่านั้น)")
  .addStringOption((option) =>
    option
      .setName("item")
      .setDescription("ไอเทมที่ต้องการขาย")
      .setRequired(true)
      .setAutocomplete(true),
  )
  .addIntegerOption((option) =>
    option
      .setName("price")
      .setDescription("ราคาขายเป็นสปอร์")
      .setRequired(true)
      .setMinValue(1),
  );

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const focused = interaction.options.getFocused().toLowerCase();
  const choices: { name: string; value: string }[] = [];
  const seen = new Set<string>();

  for (const entry of getInventory(interaction.user.id)) {
    if (entry.isEquipped || seen.has(entry.itemId)) continue;
    seen.add(entry.itemId);

    const item = getItemById(entry.itemId);
    if (!item || !ITEMS_POOL.some((poolItem) => poolItem.id === item.id)) continue;
    if (
      focused &&
      !item.id.toLowerCase().includes(focused) &&
      !item.name.toLowerCase().includes(focused)
    ) continue;

    choices.push({
      name: `${item.emoji} ${item.name} — ${item.lore}`.slice(0, 100),
      value: item.id,
    });
  }

  await interaction.respond(choices.slice(0, 25));
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  const config = guild ? getMarketplaceConfig(guild.id) : undefined;
  const channel = interaction.channel;
  if (!guild || !config?.enabled) {
    await interaction.editReply("❌ แอดมินยังไม่ได้ตั้งค่าห้องตลาดกลางด้วย `/marketplace`");
    return;
  }
  if (!(channel instanceof TextChannel) || channel.id !== config.channelId) {
    await interaction.editReply(`❌ คำสั่งนี้ใช้ได้เฉพาะในห้องตลาดกลาง <#${config.channelId}> เท่านั้น`);
    return;
  }

  const itemId = interaction.options.getString("item", true);
  const price = interaction.options.getInteger("price", true);
  const item = getItemById(itemId);
  if (!item || !ITEMS_POOL.some((poolItem) => poolItem.id === item.id)) {
    await interaction.editReply("❌ ไอเทมนี้ไม่สามารถลงขายในตลาดกลางได้");
    return;
  }

  const listing = createMarketplaceListing(guild.id, channel.id, interaction.user.id, item.id, price);
  if (!listing) {
    await interaction.editReply("❌ คุณไม่มีไอเทมนี้ที่ถอดออกจากการสวมใส่แล้ว หรือข้อมูลเปลี่ยนแปลงระหว่างดำเนินการ");
    return;
  }

  try {
    const message = await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${item.emoji} ${item.name}`)
          .setColor(0x5865f2)
          .setDescription(item.description)
          .addFields(
            { name: "✨ เอฟเฟกต์", value: item.lore, inline: false },
            { name: "💰 ราคา", value: `${listing.price.toLocaleString()} สปอร์`, inline: true },
            { name: "🏦 ค่าธรรมเนียม", value: `${listing.fee.toLocaleString()} สปอร์`, inline: true },
            { name: "📤 ผู้ขายได้รับ", value: `${listing.sellerReceives.toLocaleString()} สปอร์`, inline: true },
            { name: "👤 ผู้ขาย", value: `<@${interaction.user.id}>`, inline: true },
            { name: "⏳ หมดอายุ", value: `<t:${Math.floor(listing.expiresAt / 1_000)}:R>`, inline: true },
            { name: "🆔 รายการ", value: `\`${listing.listingId.slice(0, 8)}\``, inline: true },
          )
          .setFooter({ text: "กดปุ่มซื้อไอเทมเพื่อทำรายการทันที" })
          .setTimestamp(),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`market_buy:${listing.listingId}`)
            .setLabel("🛒 ซื้อไอเทม")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`market_cancel:${listing.listingId}`)
            .setLabel("❌ ยกเลิกรายการ")
            .setStyle(ButtonStyle.Danger),
        ),
      ],
    });
    setMarketplaceListingMessageId(listing.listingId, message.id);
  } catch {
    cancelMarketplaceListing(listing.listingId, interaction.user.id);
    await interaction.editReply("❌ ไม่สามารถสร้างประกาศในห้องตลาดได้ ระบบคืนไอเทมให้คุณแล้ว");
    return;
  }

  await interaction.editReply(
    `✅ ลงขาย **${item.emoji} ${item.name}** ที่ราคา **${price.toLocaleString()} สปอร์** แล้ว`,
  );
}