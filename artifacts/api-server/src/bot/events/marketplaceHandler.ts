import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import {
  buyMarketplaceListing,
  cancelMarketplaceListing,
  expireMarketplaceListing,
  getMarketplaceListing,
  MarketplaceListing,
} from "../data/store.js";
import { getItemById } from "../data/itemsPool.js";

function listingButtons(listingId: string, disabled: boolean): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`market_buy:${listingId}`)
      .setLabel("🛒 ซื้อไอเทม")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`market_cancel:${listingId}`)
      .setLabel("❌ ยกเลิกรายการ")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  );
}

function buildListingEmbed(listing: MarketplaceListing): EmbedBuilder {
  const item = getItemById(listing.itemId);
  const itemName = item ? `${item.emoji} ${item.name}` : listing.itemId;
  const embed = new EmbedBuilder()
    .setTitle(`${item?.emoji ?? "🍄"} ${itemName.replace(`${item?.emoji ?? ""} `, "")}`)
    .setColor(listing.status === "active" ? 0x5865f2 : listing.status === "sold" ? 0x57f287 : 0x95a5a6)
    .setTimestamp(listing.completedAt ?? listing.createdAt);

  if (listing.status === "active") {
    embed
      .setDescription(item?.description ?? "ไอเทมจากตลาดกลาง")
      .addFields(
        { name: "✨ เอฟเฟกต์", value: item?.lore ?? "ไม่ทราบข้อมูลไอเทม", inline: false },
        { name: "💰 ราคา", value: `${listing.price.toLocaleString()} สปอร์`, inline: true },
        { name: "🏦 ค่าธรรมเนียม", value: `${listing.fee.toLocaleString()} สปอร์`, inline: true },
        { name: "📤 ผู้ขายได้รับ", value: `${listing.sellerReceives.toLocaleString()} สปอร์`, inline: true },
        { name: "👤 ผู้ขาย", value: `<@${listing.sellerId}>`, inline: true },
        { name: "⏳ หมดอายุ", value: `<t:${Math.floor(listing.expiresAt / 1_000)}:R>`, inline: true },
        { name: "🆔 รายการ", value: `\`${listing.listingId.slice(0, 8)}\``, inline: true },
      )
      .setFooter({ text: "กดปุ่มซื้อไอเทมเพื่อทำรายการทันที" });
  } else {
    const statusText = listing.status === "sold"
      ? `✅ ขายแล้วให้ <@${listing.buyerId ?? "ไม่ทราบผู้ซื้อ"}>`
      : listing.status === "cancelled"
        ? "↩️ ผู้ขายยกเลิกรายการแล้ว"
        : "⌛ รายการหมดอายุและคืนไอเทมให้ผู้ขายแล้ว";
    embed
      .setDescription(statusText)
      .addFields(
        { name: "💰 ราคาประกาศ", value: `${listing.price.toLocaleString()} สปอร์`, inline: true },
        { name: "👤 ผู้ขาย", value: `<@${listing.sellerId}>`, inline: true },
        { name: "🆔 รายการ", value: `\`${listing.listingId.slice(0, 8)}\``, inline: true },
      )
      .setFooter({ text: "ประกาศนี้จะถูกลบหลังผ่านไป 1 ชั่วโมง" });
  }

  return embed;
}

export async function handleMarketplaceButton(interaction: ButtonInteraction): Promise<void> {
  const [action, listingId] = interaction.customId.split(":");
  if (!listingId || (action !== "market_buy" && action !== "market_cancel")) return;

  const listing = getMarketplaceListing(listingId);
  if (!listing) {
    await interaction.reply({ content: "❌ ไม่พบรายการนี้แล้ว", ephemeral: true });
    return;
  }
  if (
    interaction.guildId !== listing.guildId ||
    interaction.channelId !== listing.channelId
  ) {
    await interaction.reply({ content: "❌ รายการนี้ใช้ได้เฉพาะในห้องตลาดของเซิร์ฟเวอร์ต้นทาง", ephemeral: true });
    return;
  }

  if (action === "market_cancel") {
    const result = cancelMarketplaceListing(listingId, interaction.user.id);
    if (!result.ok) {
      const message = result.reason === "not_owner"
        ? "❌ คุณไม่ใช่เจ้าของรายการนี้"
        : result.reason === "not_active"
          ? "⚠️ รายการนี้จบไปแล้ว"
          : "❌ ไม่พบรายการนี้";
      await interaction.reply({ content: message, ephemeral: true });
      return;
    }

    await interaction.update({
      embeds: [buildListingEmbed(result.listing)],
      components: [listingButtons(listingId, true)],
    });
    return;
  }

  const result = buyMarketplaceListing(listingId, interaction.user.id);
  if (!result.ok) {
    if (result.reason === "expired") {
      const expired = expireMarketplaceListing(listingId);
      if (expired.ok) {
        await interaction.update({
          embeds: [buildListingEmbed(expired.listing)],
          components: [listingButtons(listingId, true)],
        });
        return;
      }
    }

    const message = result.reason === "own_listing"
      ? "❌ ไม่สามารถซื้อไอเทมของตัวเองได้"
      : result.reason === "insufficient_spores"
        ? "❌ สปอร์ของคุณไม่พอสำหรับรายการนี้"
        : result.reason === "not_active"
          ? "⚠️ รายการนี้ถูกซื้อหรือยกเลิกไปแล้ว"
          : "❌ ไม่พบรายการนี้";
    await interaction.reply({ content: message, ephemeral: true });
    return;
  }

  await interaction.update({
    embeds: [buildListingEmbed(result.listing)],
    components: [listingButtons(listingId, true)],
  });
}