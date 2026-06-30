import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMember,
  TextChannel,
} from "discord.js";
import { getShopItems, getPlayer, savePlayer, getLogChannel } from "../data/store.js";

async function buildShopView(guildId: string, userId: string) {
  const items = getShopItems(guildId);
  const player = getPlayer(userId);

  const embed = new EmbedBuilder()
    .setTitle("🏪 ร้านค้าสปอร์")
    .setColor(0xf4a460)
    .setDescription(`🍄 สปอร์ของคุณ: **${player.sporePoints.toLocaleString()}**\n\nเลือกสินค้าจากเมนูด้านล่าง`);

  if (items.length === 0) {
    embed.setDescription("🍄 สปอร์ของคุณ: **" + player.sporePoints.toLocaleString() + "**\n\n*ยังไม่มีสินค้าในร้านค้า*");
    return { embeds: [embed], components: [] };
  }

  const selectOptions = items.map((item) => {
    const canAfford = player.sporePoints >= item.price;
    const icon = item.type === "role" ? "🎖️" : "🎨";
    const opt = new StringSelectMenuOptionBuilder()
      .setLabel(`${item.name} — ${item.price.toLocaleString()} สปอร์`)
      .setDescription(item.description.slice(0, 100))
      .setValue(item.id)
      .setEmoji(canAfford ? "✅" : "❌");
    return opt;
  });

  const select = new StringSelectMenuBuilder()
    .setCustomId("shop_select")
    .setPlaceholder("เลือกสินค้าที่ต้องการ...")
    .addOptions(selectOptions);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  return { embeds: [embed], components: [row] };
}

export async function handleShopOpen(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const view = await buildShopView(interaction.guildId!, interaction.user.id);
  await interaction.editReply(view);
}

export async function handleShopBack(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferUpdate();
  const view = await buildShopView(interaction.guildId!, interaction.user.id);
  await interaction.editReply(view);
}

export async function handleShopSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  await interaction.deferUpdate();

  const guild = interaction.guild;
  if (!guild) return;

  const itemId = interaction.values[0]!;
  const items = getShopItems(guild.id);
  const item = items.find((i) => i.id === itemId);
  const player = getPlayer(interaction.user.id);

  if (!item) {
    await interaction.editReply({ content: "❌ ไม่พบสินค้า", components: [], embeds: [] });
    return;
  }

  const canAfford = player.sporePoints >= item.price;
  const typeText =
    item.type === "role" && item.roleId
      ? `🎖️ จะได้รับยศ <@&${item.roleId}> อัตโนมัติ`
      : "🎨 แอดมินจะดำเนินการให้ภายใน 24 ชม.";

  const embed = new EmbedBuilder()
    .setTitle(`🛍️ ${item.name}`)
    .setDescription(item.description)
    .setColor(canAfford ? 0x57f287 : 0xed4245)
    .addFields(
      { name: "💰 ราคา", value: `${item.price.toLocaleString()} สปอร์`, inline: true },
      { name: "🍄 สปอร์ของคุณ", value: `${player.sporePoints.toLocaleString()}`, inline: true },
      { name: "📦 รายละเอียด", value: typeText }
    );

  if (!canAfford) {
    const need = item.price - player.sporePoints;
    embed.addFields({ name: "❌ สปอร์ไม่พอ", value: `ต้องการอีก **${need.toLocaleString()}** สปอร์` });
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`shop_confirm_${itemId}`)
      .setLabel(canAfford ? "✅ ยืนยันซื้อ" : "❌ สปอร์ไม่พอ")
      .setStyle(canAfford ? ButtonStyle.Success : ButtonStyle.Danger)
      .setDisabled(!canAfford),
    new ButtonBuilder()
      .setCustomId("shop_back")
      .setLabel("◀️ ดูสินค้าอื่น")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

export async function handleShopConfirm(
  interaction: ButtonInteraction,
  itemId: string
): Promise<void> {
  await interaction.deferUpdate();

  const guild = interaction.guild;
  if (!guild) return;

  const items = getShopItems(guild.id);
  const item = items.find((i) => i.id === itemId);
  const player = getPlayer(interaction.user.id);

  if (!item) {
    await interaction.editReply({ content: "❌ ไม่พบสินค้า", components: [], embeds: [] });
    return;
  }

  if (player.sporePoints < item.price) {
    await interaction.editReply({
      content: `❌ สปอร์ไม่พอ! มี ${player.sporePoints.toLocaleString()} ต้องการ ${item.price.toLocaleString()}`,
      components: [],
      embeds: [],
    });
    return;
  }

  player.sporePoints -= item.price;
  savePlayer(player);

  const embed = new EmbedBuilder()
    .setTitle("✅ ซื้อสินค้าสำเร็จ!")
    .setColor(0x57f287)
    .addFields(
      { name: "🛍️ สินค้า", value: item.name, inline: true },
      { name: "💰 จ่าย", value: `${item.price.toLocaleString()} สปอร์`, inline: true },
      { name: "🍄 คงเหลือ", value: `${player.sporePoints.toLocaleString()} สปอร์`, inline: true }
    );

  if (item.type === "role" && item.roleId) {
    const member = interaction.member as GuildMember;
    const role = guild.roles.cache.get(item.roleId);
    if (role) {
      try {
        await member.roles.add(role);
        embed.addFields({ name: "🎖️ ยศที่ได้รับ", value: `<@&${role.id}>` });
      } catch {
        embed.addFields({ name: "⚠️ หมายเหตุ", value: "ไม่สามารถเพิ่มยศได้อัตโนมัติ โปรดติดต่อแอดมิน" });
      }
    }
  } else if (item.type === "custom") {
    embed.addFields({ name: "📬 หมายเหตุ", value: "แอดมินจะมาดำเนินการให้ท่านในเร็วๆ นี้" });
  }

  const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("shop_back")
      .setLabel("🏪 กลับสู่ร้านค้า")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.editReply({ embeds: [embed], components: [closeRow] });

  const logChannelId = getLogChannel(guild.id);
  if (logChannelId) {
    const logChannel = guild.channels.cache.get(logChannelId) as TextChannel | undefined;
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle("🛒 มีการซื้อสินค้า")
        .setColor(0xfee75c)
        .addFields(
          { name: "👤 ผู้ซื้อ", value: `<@${interaction.user.id}> (${interaction.user.username})`, inline: true },
          { name: "🛍️ สินค้า", value: `${item.name} [${item.id}]`, inline: true },
          { name: "💰 ราคา", value: `${item.price.toLocaleString()} สปอร์`, inline: true },
          { name: "📦 ประเภท", value: item.type === "role" ? "ยศอัตโนมัติ" : "ต้องดำเนินการ Manual", inline: true }
        )
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
    }
  }
}
