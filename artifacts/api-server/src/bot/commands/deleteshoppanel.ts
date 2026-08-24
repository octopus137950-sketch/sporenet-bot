import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("deleteshoppanel")
  .setDescription("🗑️ ลบแผงซื้อยศในห้องปัจจุบัน")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.channel;
  const botUserId = interaction.client.user?.id;

  if (!(channel instanceof TextChannel)) {
    await interaction.editReply("❌ คำสั่งนี้ต้องใช้ในห้องข้อความเท่านั้น");
    return;
  }

  if (!botUserId) {
    await interaction.editReply("❌ ไม่สามารถระบุบัญชีบอทได้");
    return;
  }

  try {
    const messages = await channel.messages.fetch({ limit: 100 });

    const panelMessages = messages.filter((message) => {
      if (message.author.id !== botUserId) return false;

      return message.components.some((row) =>
        row.components.some(
          (component) =>
            "customId" in component && component.customId === "shop_open",
        ),
      );
    });

    if (panelMessages.size === 0) {
      await interaction.editReply(
        "ℹ️ ไม่พบแผงซื้อยศของบอทใน 100 ข้อความล่าสุดของห้องนี้",
      );
      return;
    }

    for (const message of panelMessages.values()) {
      await message.delete();
    }

    await interaction.editReply(
      `✅ ลบแผงซื้อยศแล้ว ${panelMessages.size} แผง`,
    );
  } catch (error) {
    console.error("ไม่สามารถลบแผงซื้อยศได้:", error);
    await interaction.editReply(
      "❌ ลบแผงไม่ได้ ตรวจสอบว่าบอทมีสิทธิ์ Manage Messages หรือไม่",
    );
  }
}
