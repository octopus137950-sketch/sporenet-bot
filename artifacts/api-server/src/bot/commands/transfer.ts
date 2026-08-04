import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  Role,
  TextChannel,
} from "discord.js";
import { getPlayer, savePlayer, getLogChannel, getInventory, transferItem } from "../data/store.js";
import { getItemById } from "../data/itemsPool.js";
import { requireGameChannel } from "../utils/channelGuard.js";
import { incrementQuestProgress } from "../events/questTracker.js";

export const data = new SlashCommandBuilder()
  .setName("transfer")
  .setDescription("💸 โอนสปอร์ ไอเทม และ/หรือยศให้ผู้เล่นคนอื่น")
  .addUserOption((o) =>
    o.setName("to").setDescription("ผู้รับ").setRequired(true)
  )
  .addIntegerOption((o) =>
    o.setName("amount")
      .setDescription("จำนวนสปอร์ที่ต้องการโอน (ไม่ต้องใส่ถ้าไม่โอนสปอร์)")
      .setRequired(false)
      .setMinValue(1)
  )
  .addStringOption((o) =>
    o.setName("item")
      .setDescription("ไอเทมที่ต้องการโอน (พิมพ์เพื่อค้นหาจากกระเป๋าของคุณ)")
      .setRequired(false)
      .setAutocomplete(true)
  )
  .addRoleOption((o) =>
    o.setName("role")
      .setDescription("ยศที่ต้องการโอน (ต้องเป็นยศที่คุณมีและบอทจัดการได้)")
      .setRequired(false)
  );

/** Autocomplete: แสดงไอเทมที่ไม่ได้สวมใส่จากกระเป๋าของผู้ใช้ */
export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const focused = interaction.options.getFocused().toLowerCase();
  const inv = getInventory(interaction.user.id);

  // กรองเฉพาะไอเทมที่ไม่ได้ equipped และ dedupe ตาม itemId
  const seen = new Set<string>();
  const choices: { name: string; value: string }[] = [];

  for (const entry of inv) {
    if (entry.isEquipped) continue;
    if (seen.has(entry.itemId)) continue;
    seen.add(entry.itemId);

    const item = getItemById(entry.itemId);
    if (!item) continue;

    const label = `${item.emoji} ${item.name} — ${item.lore}`;
    if (
      focused === "" ||
      item.name.toLowerCase().includes(focused) ||
      item.id.toLowerCase().includes(focused)
    ) {
      choices.push({ name: label.slice(0, 100), value: item.id });
    }
  }

  await interaction.respond(choices.slice(0, 25));
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!(await requireGameChannel(interaction))) return;
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const target = interaction.options.getUser("to", true);
  const amount = interaction.options.getInteger("amount");
  const itemId = interaction.options.getString("item");
  const selectedRole = interaction.options.getRole("role");

  if (target.id === interaction.user.id) {
    await interaction.editReply("❌ ไม่สามารถโอนให้ตัวเองได้");
    return;
  }
  if (target.bot) {
    await interaction.editReply("❌ ไม่สามารถโอนให้บอทได้");
    return;
  }
  if (!amount && !itemId && !selectedRole) {
    await interaction.editReply("❌ กรุณาระบุ **จำนวนสปอร์**, **ไอเทม** หรือ **ยศ** ที่ต้องการโอนอย่างน้อยหนึ่งอย่าง");
    return;
  }

  // ── Pre-validate ทุกอย่างก่อน — ไม่มีการแก้ข้อมูลใด ๆ ในบล็อกนี้ ──────────

  // ตรวจสปอร์
  const sender = getPlayer(interaction.user.id);
  if (amount !== null && amount !== undefined) {
    if (sender.sporePoints < amount) {
      await interaction.editReply(
        `❌ สปอร์ไม่พอ!\nคุณมี **${sender.sporePoints.toLocaleString()}** สปอร์\nต้องการโอน **${amount.toLocaleString()}** สปอร์`
      );
      return;
    }
  }

  // ตรวจไอเทม
  let itemToTransfer: ReturnType<typeof getItemById> = undefined;
  if (itemId) {
    itemToTransfer = getItemById(itemId);
    if (!itemToTransfer) {
      await interaction.editReply("❌ ไม่พบไอเทมนี้ในระบบ กรุณาเลือกจากรายการที่แสดงในช่อง `item`");
      return;
    }

    const senderInv = getInventory(interaction.user.id);
    const hasUnequipped = senderInv.some((e) => e.itemId === itemId && !e.isEquipped);
    if (!hasUnequipped) {
      const hasEquipped = senderInv.some((e) => e.itemId === itemId && e.isEquipped);
      if (hasEquipped) {
        await interaction.editReply(
          `❌ ไอเทม **${itemToTransfer.emoji} ${itemToTransfer.name}** กำลังสวมใส่อยู่!\nกรุณาถอดออกก่อนจึงจะโอนได้ (ใช้คำสั่ง /wallet เพื่อถอด)`
        );
      } else {
        await interaction.editReply(`❌ คุณไม่มีไอเทม **${itemToTransfer.emoji} ${itemToTransfer.name}** ในกระเป๋า`);
      }
      return;
    }
  }

  let senderMember: GuildMember | undefined;
  let targetMember: GuildMember | undefined;
  let botMember: GuildMember | undefined;
  let role: Role | undefined;

  if (selectedRole) {
    role = await guild.roles.fetch(selectedRole.id).catch(() => null) ?? undefined;
    if (!role) {
      await interaction.editReply("❌ ไม่สามารถโหลดข้อมูลยศนี้จากเซิร์ฟเวอร์ได้ กรุณาลองใหม่");
      return;
    }
    senderMember = await guild.members.fetch(interaction.user.id).catch(() => undefined);
    targetMember = await guild.members.fetch(target.id).catch(() => undefined);
    botMember = await guild.members.fetchMe().catch(() => undefined);

    if (!senderMember || !targetMember || !botMember) {
      await interaction.editReply("❌ ไม่สามารถตรวจสอบสมาชิกในเซิร์ฟเวอร์ได้ กรุณาลองใหม่");
      return;
    }
    if (role.id === guild.id || role.managed) {
      await interaction.editReply("❌ ไม่สามารถโอนยศระบบหรือยศที่จัดการโดยบอท/Integration ได้");
      return;
    }
    if (
      role.permissions.has(PermissionFlagsBits.Administrator) ||
      role.permissions.has(PermissionFlagsBits.ManageGuild) ||
      role.permissions.has(PermissionFlagsBits.ManageRoles) ||
      role.permissions.has(PermissionFlagsBits.ManageChannels)
    ) {
      await interaction.editReply("❌ ไม่สามารถโอนยศที่มีสิทธิ์ผู้ดูแลเซิร์ฟเวอร์ได้");
      return;
    }
    if (!senderMember.roles.cache.has(role.id)) {
      await interaction.editReply(`❌ คุณไม่มียศ <@&${role.id}> จึงไม่สามารถโอนได้`);
      return;
    }
    if (targetMember.roles.cache.has(role.id)) {
      await interaction.editReply(`❌ ผู้รับมียศ <@&${role.id}> อยู่แล้ว`);
      return;
    }
    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.editReply("❌ บอทไม่มีสิทธิ์ Manage Roles จึงโอนยศไม่ได้");
      return;
    }
    if (role.position >= botMember.roles.highest.position) {
      await interaction.editReply("❌ ยศนี้อยู่สูงกว่าหรือเท่ากับยศสูงสุดของบอท บอทจึงโอนไม่ได้");
      return;
    }
  }

  // ── Execute — ผ่าน validation ทั้งหมดแล้ว จึงค่อยแก้ข้อมูล ─────────────────

  const resultFields: { name: string; value: string; inline?: boolean }[] = [
    { name: "📤 ผู้โอน", value: `<@${interaction.user.id}>`, inline: true },
    { name: "📥 ผู้รับ", value: `<@${target.id}>`, inline: true },
  ];

  // โอนไอเทม
  let itemTransferred = false;
  if (itemId && itemToTransfer) {
    const success = transferItem(interaction.user.id, target.id, itemId);
    if (!success) {
      await interaction.editReply("❌ เกิดข้อผิดพลาดในการโอนไอเทม (ข้อมูลเปลี่ยนแปลงระหว่างดำเนินการ กรุณาลองใหม่)");
      return;
    }
    itemTransferred = true;

    resultFields.push(
      { name: "✨ ไอเทมที่โอน", value: `${itemToTransfer.emoji} **${itemToTransfer.name}**`, inline: false },
      { name: "🔮 เอฟเฟกต์", value: itemToTransfer.lore, inline: false }
    );

    const logId = getLogChannel(guild.id);
    if (logId) {
      const logCh = guild.channels.cache.get(logId) as TextChannel | undefined;
      logCh?.send({
        content: `🎒 **${interaction.user.username}** โอนไอเทม **${itemToTransfer.emoji} ${itemToTransfer.name}** ให้ **${target.username}**`,
      }).catch(() => null);
    }
  }

  // โอนยศ Discord
  if (role && senderMember && targetMember) {
    try {
      await targetMember.roles.add(role, `Role transfer from ${interaction.user.tag}`);
      await senderMember.roles.remove(role, `Role transfer to ${target.tag}`);
    } catch {
      await targetMember.roles.remove(role).catch(() => undefined);
      if (itemTransferred && itemId) {
        transferItem(target.id, interaction.user.id, itemId);
      }
      await interaction.editReply("❌ โอนยศไม่สำเร็จ บอทอาจไม่มีสิทธิ์จัดการยศนี้");
      return;
    }

    resultFields.push(
      { name: "🏷️ ยศที่โอน", value: `<@&${role.id}>`, inline: false },
      { name: "🔒 สถานะยศ", value: "ผู้รับได้รับยศแล้ว และผู้โอนถูกถอดยศนี้", inline: false }
    );

    const logId = getLogChannel(guild.id);
    if (logId) {
      const logCh = guild.channels.cache.get(logId) as TextChannel | undefined;
      logCh?.send({
        content: `🏷️ **${interaction.user.username}** โอนยศ **${role.name}** ให้ **${target.username}**`,
      }).catch(() => null);
    }
  }

  // โอนสปอร์
  if (amount !== null && amount !== undefined) {
    const receiver = getPlayer(target.id);
    sender.sporePoints -= amount;
    receiver.sporePoints += amount;
    savePlayer(sender);
    savePlayer(receiver);

    incrementQuestProgress(interaction.client, guild.id, interaction.user.id, "transfer", 1, interaction).catch(
      (e) => console.error("[transfer] quest track error:", e)
    );

    resultFields.push(
      { name: "🍄 สปอร์ที่โอน", value: `**${amount.toLocaleString()}** สปอร์`, inline: false },
      { name: "💼 สปอร์คงเหลือ", value: `**${sender.sporePoints.toLocaleString()}** สปอร์`, inline: true }
    );

    const logId = getLogChannel(guild.id);
    if (logId) {
      const logCh = guild.channels.cache.get(logId) as TextChannel | undefined;
      logCh?.send({
        content: `💸 **${interaction.user.username}** โอน **${amount.toLocaleString()}** สปอร์ ให้ **${target.username}**`,
      }).catch(() => null);
    }
  }

  // ── สรุปผล ─────────────────────────────────────────────────────
  const transferParts = [
    amount !== null && amount !== undefined,
    Boolean(itemId),
    Boolean(role),
  ].filter(Boolean).length;
  const title =
    transferParts === 3
      ? "💸🎒🏷️ โอนสปอร์ ไอเทม และยศสำเร็จ!"
      : transferParts === 2 && amount !== null && amount !== undefined && itemId
      ? "💸🎒 โอนสปอร์และไอเทมสำเร็จ!"
      : transferParts === 2 && amount !== null && amount !== undefined && role
      ? "💸🏷️ โอนสปอร์และยศสำเร็จ!"
      : transferParts === 2 && itemId && role
      ? "🎒🏷️ โอนไอเทมและยศสำเร็จ!"
      : amount !== null && amount !== undefined
      ? "💸 โอนสปอร์สำเร็จ!"
      : itemId
      ? "🎒 โอนไอเทมสำเร็จ!"
      : "🏷️ โอนยศสำเร็จ!";

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(role ? 0xffd700 : amount && itemId ? 0xfee75c : amount ? 0x57f287 : 0x5865f2)
    .addFields(resultFields)
    .setTimestamp();

  const footerNotes = [];
  if (itemId) footerNotes.push("ไอเทมจะยังไม่สวมใส่อัตโนมัติ");
  if (role) footerNotes.push("ผู้รับได้รับยศแล้ว");
  if (footerNotes.length > 0) {
    embed.setFooter({ text: footerNotes.join(" • ") });
  }

  await interaction.editReply({ embeds: [embed] });
}
