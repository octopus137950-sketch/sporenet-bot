import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} from "discord.js";
import { getVoiceRewardConfig, setVoiceRewardConfig } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("blockvoiceroom")
  .setDescription("🚫 บล็อค/ปลดบล็อคห้องเสียงไม่ให้แจกสปอร์ (สลับ on/off)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption((o) =>
    o
      .setName("channel")
      .setDescription("ห้องเสียงที่ต้องการบล็อค/ปลดบล็อค")
      .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const channel = interaction.options.getChannel("channel", true);
  const config = getVoiceRewardConfig(guild.id) ?? {
    enabled: false,
    timeLoopMinutes: 5,
    giveSpore: 50,
    giveExp: 5,
    blockedRoomIds: [],
  };

  const blocked = config.blockedRoomIds ?? [];
  const isBlocked = blocked.includes(channel.id);

  if (isBlocked) {
    config.blockedRoomIds = blocked.filter((id) => id !== channel.id);
  } else {
    config.blockedRoomIds = [...blocked, channel.id];
  }

  setVoiceRewardConfig(guild.id, config);

  const embed = new EmbedBuilder()
    .setTitle(isBlocked ? "✅ ปลดบล็อคห้องเสียงแล้ว" : "🚫 บล็อคห้องเสียงแล้ว")
    .setColor(isBlocked ? 0x57f287 : 0xed4245)
    .setDescription(
      isBlocked
        ? `<#${channel.id}> จะแจกสปอร์ให้สมาชิกอีกครั้ง`
        : `<#${channel.id}> จะไม่แจกสปอร์ให้สมาชิกในห้องนี้`
    )
    .addFields({
      name: "🚫 ห้องที่บล็อคทั้งหมด",
      value:
        config.blockedRoomIds.length > 0
          ? config.blockedRoomIds.map((id) => `<#${id}>`).join(", ")
          : "ไม่มี",
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
