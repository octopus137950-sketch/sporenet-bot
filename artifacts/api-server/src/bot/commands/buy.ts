import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel,
  GuildMember,
  PermissionFlagsBits,
} from "discord.js";
import { getPlayer, savePlayer, getShopItems, getLogChannel } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("buy")
  .setDescription("🛒 ซื้อสินค้าจากร้านค้าด้วยสปอร์")
  .addStringOption((o) =>
    o.setName("id").setDescription("ID ของสินค้าที่ต้องการซื้อ (ดูจาก /shop)").setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const itemId = interaction.options.getString("id", true).toLowerCase();
  const items = getShopItems(guild.id);
  const item = items.find((i) => i.id.toLowerCase() === itemId);

  if (!item) {
    await interaction.editReply(`❌ ไม่พบสินค้า ID: \`${itemId}\` ลองใช้ /shop เพื่อดูรายการสินค้า`);
    return;
  }

  const player = getPlayer(interaction.user.id);

  if (player.sporePoints < item.price) {
    const need = item.price - player.sporePoints;
    await interaction.editReply(
      `❌ สปอร์ไม่พอ!\n\nต้องการ **${item.price.toLocaleString()}** สปอร์\nคุณมี **${player.sporePoints.toLocaleString()}** สปอร์\nขาดอีก **${need.toLocaleString()}** สปอร์`
    );
    return;
  }

  player.sporePoints -= item.price;
  savePlayer(player);

  const embed = new EmbedBuilder()
    .setTitle("✅ ซื้อสินค้าสำเร็จ!")
    .setColor(0x57f287)
    .addFields(
      { name: "🛍️ สินค้า", value: item.name, inline: true },
      { name: "💰 ราคาที่จ่าย", value: `${item.price.toLocaleString()} สปอร์`, inline: true },
      { name: "🍄 คงเหลือ", value: `${player.sporePoints.toLocaleString()} สปอร์`, inline: true }
    )
    .setTimestamp();

  if (item.type === "role" && item.roleId) {
    const member = interaction.member as GuildMember;
    const role = guild.roles.cache.get(item.roleId);
    if (role) {
      try {
        await member.roles.add(role);
        embed.addFields({ name: "🎖️ ยศที่ได้รับ", value: `<@&${role.id}>` });
      } catch {
        embed.addFields({ name: "⚠️ หมายเหตุ", value: "ไม่สามารถเพิ่มยศได้ โปรดติดต่อแอดมิน" });
      }
    }
  } else if (item.type === "custom") {
    embed.addFields({ name: "📬 หมายเหตุ", value: "แอดมินจะมาดำเนินการให้ท่านในเร็วๆ นี้" });
  }

  await interaction.editReply({ embeds: [embed] });

  const logChannelId = getLogChannel(guild.id);
  if (logChannelId) {
    const logChannel = guild.channels.cache.get(logChannelId) as TextChannel | undefined;
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle("🛒 มีการซื้อสินค้า")
        .setColor(0xfee75c)
        .addFields(
          { name: "👤 ผู้ซื้อ", value: `<@${interaction.user.id}> (${interaction.user.username})`, inline: true },
          { name: "🛍️ สินค้า", value: `${item.name} \`[${item.id}]\``, inline: true },
          { name: "💰 ราคา", value: `${item.price.toLocaleString()} สปอร์`, inline: true },
          { name: "📦 ประเภท", value: item.type === "role" ? "ยศอัตโนมัติ" : "ต้องดำเนินการ Manual", inline: true }
        )
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
    }
  }
}
