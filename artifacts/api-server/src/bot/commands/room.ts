import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  GuildMember,
} from "discord.js";
import { isDynRoom, getDynRoomOwner } from "../events/dynVoiceHandler.js";

export const data = new SlashCommandBuilder()
  .setName("room")
  .setDescription("🎙️ ปรับแต่งห้องเสียงส่วนตัวของคุณ (เฉพาะเจ้าของ)")
  .addSubcommand((sub) =>
    sub
      .setName("name")
      .setDescription("📝 เปลี่ยนชื่อห้อง")
      .addStringOption((o) =>
        o
          .setName("ชื่อใหม่")
          .setDescription("ชื่อห้องที่ต้องการ")
          .setRequired(true)
          .setMaxLength(100)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("limit")
      .setDescription("👥 จำกัดจำนวนคนในห้อง (0 = ไม่จำกัด)")
      .addIntegerOption((o) =>
        o
          .setName("จำนวน")
          .setDescription("จำนวนคนสูงสุด (0-99)")
          .setMinValue(0)
          .setMaxValue(99)
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName("lock").setDescription("🔒 ล็อก / ปลดล็อกห้องของคุณ (สลับ)")
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;

  if (!voiceChannel) {
    await interaction.editReply("❌ คุณต้องอยู่ในห้องเสียงก่อนถึงจะใช้คำสั่งนี้ได้");
    return;
  }

  if (!isDynRoom(voiceChannel.id)) {
    await interaction.editReply(
      "❌ ห้องนี้ไม่ใช่ห้องเสียงส่วนตัวที่ระบบสร้างให้"
    );
    return;
  }

  const ownerId = getDynRoomOwner(voiceChannel.id);
  if (ownerId !== member.id) {
    await interaction.editReply(
      "❌ คุณไม่ใช่เจ้าของห้องนี้ ไม่สามารถปรับแต่งได้"
    );
    return;
  }

  const sub = interaction.options.getSubcommand();

  // ── /room name ──────────────────────────────────────────────────
  if (sub === "name") {
    const newName = interaction.options.getString("ชื่อใหม่", true);
    try {
      await voiceChannel.setName(newName);
      const embed = new EmbedBuilder()
        .setTitle("✅ เปลี่ยนชื่อห้องแล้ว")
        .setColor(0x57f287)
        .addFields({ name: "ชื่อใหม่", value: newName })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply("❌ ไม่สามารถเปลี่ยนชื่อได้ อาจถูก Discord rate-limit");
    }
    return;
  }

  // ── /room limit ─────────────────────────────────────────────────
  if (sub === "limit") {
    const limit = interaction.options.getInteger("จำนวน", true);
    try {
      await voiceChannel.setUserLimit(limit);
      const embed = new EmbedBuilder()
        .setTitle("✅ ตั้งค่าจำนวนคนแล้ว")
        .setColor(0x57f287)
        .addFields({
          name: "จำนวนคนสูงสุด",
          value: limit === 0 ? "ไม่จำกัด" : `${limit} คน`,
        })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply("❌ ไม่สามารถตั้งค่าจำนวนคนได้");
    }
    return;
  }

  // ── /room lock ──────────────────────────────────────────────────
  if (sub === "lock") {
    const everyoneRole = interaction.guild!.roles.everyone;
    const currentPerms = voiceChannel.permissionOverwrites.cache.get(
      everyoneRole.id
    );
    const isLocked = currentPerms?.deny.has(PermissionFlagsBits.Connect) ?? false;

    try {
      if (isLocked) {
        await voiceChannel.permissionOverwrites.edit(everyoneRole, {
          Connect: null,
        });
      } else {
        await voiceChannel.permissionOverwrites.edit(everyoneRole, {
          Connect: false,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(isLocked ? "🔓 ปลดล็อกห้องแล้ว" : "🔒 ล็อกห้องแล้ว")
        .setColor(isLocked ? 0x57f287 : 0xed4245)
        .setDescription(
          isLocked
            ? "ตอนนี้ทุกคนสามารถเข้าห้องได้"
            : "ตอนนี้ห้องถูกล็อก คนอื่นไม่สามารถเข้าได้"
        )
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply("❌ ไม่สามารถเปลี่ยนสถานะล็อกห้องได้");
    }
  }
}
