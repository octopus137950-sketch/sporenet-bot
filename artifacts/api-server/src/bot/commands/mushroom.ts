import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("mushroom")
  .setDescription("🌱 สุ่มเกร็ดความรู้เกี่ยวกับเห็ด");

const FACTS: string[] = [
  "เห็ดไม่ใช่พืชและไม่ใช่สัตว์ — พวกมันอยู่ในอาณาจักรของตัวเอง (Fungi) มีระบบย่อยอาหารแบบภายนอก",
  "บางชนิดของเห็ดสามารถส่องแสงเรืองแสงได้ (bioluminescence) เช่น 'foxfire' หรือ 'jack-o'-lantern'",
  "เห็ดบางชนิด (เช่น Amanita muscaria) ถูกใช้ในพิธีกรรมทางวัฒนธรรมโบราณ มีผลต่อจิตประสาท",
  "เส้นใยของเห็ด (mycelium) สามารถเชื่อมต่อกับระบบรากของพืชและช่วยแลกเปลี่ยนสารอาหาร — บางคนเรียกเครือข่ายนี้ว่า 'Wood Wide Web'",
  "เห็ดบางชนิดสามารถย่อยพลาสติกหรือมลพิษได้ — นักวิจัยกำลังศึกษาใช้เห็ดช่วยบำบัดสิ่งแวดล้อม",
  "เห็ดหูหนู (Pleurotus) สามารถกินเชื้อราอื่นได้ (mycoparasitism) — แปลกแต่เป็นกลยุทธ์ทางนิเวศ",
  "สปอร์ของเห็ดบางชนิดสามารถลอยในอากาศเป็นระยะทางไกล และเป็นวิธีหลักในการแพร่พันธุ์",
  "เห็ดหลินจือ (Ganoderma lucidum) ถูกใช้ในแพทย์แผนจีนมานานนับพันปี และถูกวิจัยในด้านคุณสมบัติต้านการอักเสบ",
  "มีเห็ดที่ขึ้นจากซ���กศพสัตว์หรือแม้แต่จากศพมนุษย์ (เช่นบาง Basidiomycota) — วัฏจักรชีวิตในธรรมชาติซับซ้อน",
  "บางชนิดของเห็ดมีเครือข่าย mycelium ขนาดใหญ่ที่สุดในโลก — พบ mycelium ที่ครอบคลุมพื้นที่หลายเฮกตาร์",
  "เห็ดบางชนิดสามารถเพิ่มความสามารถในการดูดซับแร่ธาตุในดิน ช่วยส่งเสริมการเจริญเติบโตของพืชในระบบนิเวศ",
  "เห็ดบางชนิดผลิตเอนไซม์พิเศษที่ใช้ในการแปรสภาพไม้ (wood decay) ทำให้เป็นผู้ย่อยสลายสำคัญของระบบนิเวศ",
];

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const fact = FACTS[Math.floor(Math.random() * FACTS.length)];

  const embed = new EmbedBuilder()
    .setTitle("🍄 เกร็ดความรู้เกี่ยวกับเห็ด")
    .setDescription(fact)
    .setColor(0x7cfc00)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
