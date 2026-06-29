import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { disableWelcome, disableGoodbye } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("disablewelcome")
  .setDescription("ปิดระบบต้อนรับ/ลาก่อน")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) =>
    o
      .setName("type")
      .setDescription("ปิดระบบไหน")
      .setRequired(true)
      .addChoices(
        { name: "ยินดีต้อนรับ (Welcome)", value: "welcome" },
        { name: "ลาก่อน (Goodbye)", value: "goodbye" },
        { name: "ทั้งคู่", value: "both" }
      )
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้คำสั่งนี้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const type = interaction.options.getString("type", true);

  if (type === "welcome" || type === "both") {
    disableWelcome(guild.id);
  }
  if (type === "goodbye" || type === "both") {
    disableGoodbye(guild.id);
  }

  const label =
    type === "welcome"
      ? "ระบบต้อนรับ"
      : type === "goodbye"
        ? "ระบบลาก่อน"
        : "ระบบต้อนรับและลาก่อน";

  await interaction.editReply(`✅ ปิด${label}สำเร็จแล้ว`);
}
