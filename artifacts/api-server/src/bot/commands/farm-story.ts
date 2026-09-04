import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from "discord.js";
import { getInventory, getPlayer, savePlayer, addItemToInventory } from "../data/store.js";
import { getItemById, ITEMS_POOL, type BuffItem } from "../data/itemsPool.js";
import {
  createSession,
  getSession,
  saveSession,
  type ActiveQuest,
  type BattleState,
  type EquipmentSlot,
  type PlayerStats,
  type FarmStorySession,
  type MushroomDefinition,
  type StoryEventState,
  type StoryItem,
  type Weapon,
  WEAPONS,
  type WeaponSkill,
} from "../data/farmStoryStore.js";
import { requireVoiceChannel } from "../utils/voiceChannelGuard.js";

type ComponentInteraction = ButtonInteraction | StringSelectMenuInteraction;

const IMAGE_BASE =
  "https://raw.githubusercontent.com/octopus137950-sketch/sporenet-bot/main/artifacts/api-server/assets/farm";
const IMAGES = {
  king: `${IMAGE_BASE}/story_king_pixel.png`,
  weapons: `${IMAGE_BASE}/farm_crystalheart_mushroom.png`,
  adventure: `${IMAGE_BASE}/farm_mooncap_mushroom.png`,
  npc: `${IMAGE_BASE}/story_apothecary_quest_pixel.png`,
  mushroomQuest: `${IMAGE_BASE}/story_mushroom_quest_pixel.png`,
  monsterQuest: `${IMAGE_BASE}/story_monster_quest_pixel.png`,
  itemQuest: `${IMAGE_BASE}/story_item_quest_pixel.png`,
  shop: `${IMAGE_BASE}/story_mushroom_merchant.png`,
  item: `${IMAGE_BASE}/story_item_quest_pixel.png`,
  secret: `${IMAGE_BASE}/story_secret_ruins.png`,
  ruins: `${IMAGE_BASE}/story_secret_ruins.png`,
};

const MUSHROOMS: MushroomDefinition[] = [
  { id: "common_mushroom", name: "เห็ดฟางธรรมดา", emoji: "🍄", description: "เห็ดพื้นฐานที่เก็บได้ง่าย แต่มีราคาดีในตลาดอาณาจักร", value: 12, exp: 8, image: `${IMAGE_BASE}/farm_common_mushroom.png` },
  { id: "glowing_mushroom", name: "เห็ดเรืองแสงเวทมนตร์", emoji: "✨", description: "เห็ดเรืองแสงจากถ้ำลึก มีพลังเวทอยู่ภายใน", value: 35, exp: 12, image: `${IMAGE_BASE}/farm_glowing_mushroom.png` },
  { id: "golden_mushroom", name: "เห็ดทองคำโบราณ", emoji: "👑", description: "เห็ดหายากของราชวงศ์ ผู้ซื้อยอมจ่ายแพงเพื่อครอบครอง", value: 125, exp: 25, image: `${IMAGE_BASE}/farm_golden_mushroom.png` },
  { id: "mooncap_mushroom", name: "เห็ดจันทราน้ำค้าง", emoji: "🌙", description: "เห็ดที่ผลิบานใต้แสงจันทร์และเก็บรักษาเวทมนตร์ได้นาน", value: 48, exp: 15, image: `${IMAGE_BASE}/farm_mooncap_mushroom.png` },
  { id: "crystalheart_mushroom", name: "เห็ดหัวใจผลึก", emoji: "💎", description: "เห็ดสีฟ้าที่มีแกนผลึกแข็งแรงและเป็นที่ต้องการของนักเล่นแร่แปรธาตุ", value: 70, exp: 18, image: `${IMAGE_BASE}/farm_crystalheart_mushroom.png` },
  { id: "embercap_mushroom", name: "เห็ดเถ้าอัคคี", emoji: "🔥", description: "เห็ดร้อนที่ยังคุกรุ่นอยู่ใต้ผืนดิน", value: 32, exp: 13, image: `${IMAGE_BASE}/farm_embercap_mushroom.png` },
];

const MONSTER_IMAGES: Record<string, string> = {
  forest_worm: `${IMAGE_BASE}/farm_green_forest_worm.png`,
  poison_bat: `${IMAGE_BASE}/farm_poison_mushroom_bat.png`,
  bloodrage_boar: `${IMAGE_BASE}/farm_bloodrage_boar.png`,
  mushroom_dragon: `${IMAGE_BASE}/farm_mushroom_dragon.png`,
  mushroom_golem: `${IMAGE_BASE}/farm_mushroom_golem.png`,
};

const MONSTERS = [
  { id: "forest_worm", name: "หนอนเขียวป่า", emoji: "🐛", description: "หนอนยักษ์โผล่ขึ้นมาจากดินขวางหน้า!", level: 1, maxHP: 90, damageMin: 8, damageMax: 14, attackSkills: ["กัด", "พุ่งชน"], rewardSpore: 35, rewardExp: 22 },
  { id: "poison_bat", name: "ค้างคาวเห็ดพิษ", emoji: "🦇", description: "ฝูงค้างคาวกินเห็ดพิษบินลงมาจู่โจมจากความมืด!", level: 2, maxHP: 125, damageMin: 10, damageMax: 18, attackSkills: ["โฉบกัด", "โปรยพิษ"], rewardSpore: 55, rewardExp: 30 },
  { id: "bloodrage_boar", name: "หมูป่าบ้าเลือด", emoji: "🐗", description: "หมูป่าขนาดมหึมาพุ่งออกมาจากพุ่มไม้ตาแดงฉาน!", level: 3, maxHP: 170, damageMin: 14, damageMax: 24, attackSkills: ["พุ่งชน", "คำราม"], rewardSpore: 85, rewardExp: 42 },
  { id: "mushroom_golem", name: "โกเลมเห็ดโบราณ", emoji: "🪨", description: "โกเลมหินที่มีเห็ดขนาดใหญ่ปกคลุมร่างก้าวออกมาขวางทาง!", level: 4, maxHP: 230, damageMin: 18, damageMax: 30, attackSkills: ["หมัดหิน", "ทุบพื้น"], rewardSpore: 125, rewardExp: 58 },
  { id: "mushroom_dragon", name: "มังกรเห็ดโบราณ", emoji: "🐉", description: "มังกรตำนานแห่งป่าเห็ดปรากฏตัวขึ้นจากถ้ำ!", level: 6, maxHP: 330, damageMin: 24, damageMax: 40, attackSkills: ["กรงเล็บมังกร", "ลมหายใจสปอร์"], rewardSpore: 220, rewardExp: 90 },
].map((monster) => ({ ...monster, image: MONSTER_IMAGES[monster.id]! }));

const STORY_ITEMS: StoryItem[] = [
  { id: "healing_herb", name: "สมุนไพรฟื้นพลัง", emoji: "🌿", description: "ใช้ฟื้น HP 25 แต้มระหว่างการผจญภัย" },
  { id: "mana_crystal", name: "ผลึกมานา", emoji: "🔷", description: "ใช้ฟื้น MP 20 แต้มระหว่างการผจญภัย" },
];

export const data = new SlashCommandBuilder()
  .setName("farm-story")
  .setDescription("🏰 เข้าสู่อาณาจักรเห็ดและผจญภัยตามการเลือกของท่าน");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!(await requireVoiceChannel(interaction))) return;
  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guild!.id;
  const userId = interaction.user.id;
  const session = getSession(userId, guildId);
  if (session) {
  session.activeQuests ??= session.activeQuest ? [session.activeQuest] : [];
  // Opening the menu is a read-only action; only actions after this should trigger a leave summary.
  session.lastAction = undefined;
  syncFromPlayer(session);

    saveSession(session);
    await renderSession(interaction, session);
    return;
  }
  await renderKingScene(interaction, userId);
}

function userIdFromCustomId(customId: string): string | undefined {
  return customId.split(":")[2];
}

function validOwner(interaction: ComponentInteraction): boolean {
  const owner = userIdFromCustomId(interaction.customId);
  return owner === interaction.user.id;
}

async function update(interaction: ComponentInteraction, embeds: EmbedBuilder[], components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = []): Promise<void> {
  await interaction.update({ embeds, components });
}

function mushroomInventory(session: FarmStorySession) {
  return session.inventory.filter((item) => item.type === "mushroom" && item.quantity > 0);
}

function encodeQuestId(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeQuestId(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

async function rejectComponent(interaction: ComponentInteraction, message: string): Promise<void> {
  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply({ content: message, ephemeral: true });
  }
}

async function renderKingScene(interaction: ChatInputCommandInteraction, userId: string): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle("👑 ราชาเห็ดอัญเชิญท่าน")
    .setDescription(
      `✨ **ยินดีต้อนรับสู่อาณาจักรเห็ด** ✨\n\n` +
      `${interaction.user.displayName} ท่านถูกอัญเชิญมายังดินแดนแห่งนี้โดย **ราชาเห็ดผู้ยิ่งใหญ่**\n\n` +
      `จอมมารเห็ดกำลังทำลายผืนป่า ราชาจึงขอให้ท่านออกเดินทางไปปราบมัน\n\n` +
      `ท่านจะรับภารกิจ หรือปฏิเสธการอัญเชิญ?`
    )
    .setColor(0x7aa7ff)
    .setImage(IMAGES.king)
    .setFooter({ text: "การตัดสินใจนี้จะถูกบันทึกไว้ใน session" });

  await interaction.editReply({
    embeds: [embed],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`fs:accept:${userId}`).setLabel("✅ รับภารกิจ").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`fs:decline:${userId}`).setLabel("❌ ปฏิเสธ").setStyle(ButtonStyle.Secondary),
      ),
    ],
  });
}

export async function handleAccept(interaction: ButtonInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "❌ ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  await renderWeaponSelection(interaction, true);
}

export async function handleDecline(interaction: ButtonInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "❌ ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  await renderWeaponSelection(interaction, false);
}

async function renderWeaponSelection(interaction: ComponentInteraction, accepted: boolean): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle("⚔️ เลือกอาวุธของท่าน")
    .setDescription(
      accepted
        ? "ท่านรับภารกิจแล้ว ราชาจะมอบสปอร์เริ่มต้น **1,000** หลังเลือกอาวุธ"
        : "ท่านปฏิเสธภารกิจ แต่ยังได้รับอนุญาตให้ออกผจญภัยพร้อมอาวุธยืม โดยจะไม่ได้รับสปอร์เริ่มต้น"
    )
    .setColor(accepted ? 0x57f287 : 0xff9900)
    .addFields(
      { name: "⚔️ ดาบแห่งเมืองหิน", value: "สมดุล • ATK 25 • DEF 8 • HP 100", inline: true },
      { name: "🗡️ หอกเวทมนตร์", value: "เร็ว • ATK 28 • DEF 4 • HP 85", inline: true },
      { name: "🏹 ธนูแสงจันทร์", value: "อึด • ATK 22 • DEF 11 • HP 110", inline: true },
      { name: "🪓 ขวานไฟแห่งสงคราม", value: "แรง • ATK 32 • DEF 2 • HP 75", inline: true },
    )
    .setImage(IMAGES.weapons);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`fs:weapon:${interaction.user.id}:${accepted ? "1" : "0"}`)
    .setPlaceholder("เลือกอาวุธ...")
    .addOptions(
      { label: "ดาบแห่งเมืองหิน", value: "sword", emoji: "⚔️" },
      { label: "หอกเวทมนตร์", value: "spear", emoji: "🗡️" },
      { label: "ธนูแสงจันทร์", value: "bow", emoji: "🏹" },
      { label: "ขวานไฟแห่งสงคราม", value: "axe", emoji: "🪓" },
    );

  await update(interaction, [embed], [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)]);
}

export async function handleWeaponSelect(interaction: StringSelectMenuInteraction, weaponId: string, accepted: boolean): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "❌ เมนูนี้เป็นของผู้เล่นคนอื่น");
  if (getSession(interaction.user.id, interaction.guildId!) || !WEAPONS[weaponId as keyof typeof WEAPONS]) {
    return rejectComponent(interaction, "❌ session นี้ถูกสร้างไปแล้วหรืออาวุธไม่ถูกต้อง");
  }

  const player = getPlayer(interaction.user.id);
  if (accepted) player.sporePoints += 1_000;
  savePlayer(player);

  const weapon = WEAPONS[weaponId as keyof typeof WEAPONS]!;
  const session = createSession(interaction.user.id, interaction.guildId!, weapon, accepted, player.sporePoints, player.farmExp);
  saveSession(session);
  await renderAdventureStart(interaction, session, accepted);
}

async function renderAdventureStart(interaction: ComponentInteraction, session: FarmStorySession, accepted: boolean): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle("🏰 เริ่มการผจญภัย")
    .setDescription(
      accepted
        ? "ราชามอบสปอร์เริ่มต้น 1,000 ให้ท่านแล้ว จงออกเดินทางไปหยุดจอมมารเห็ด!"
        : "ราชาขับไล่ท่านออกจากวัง และประกาศว่าจะอัญเชิญผู้กล้าคนใหม่ แต่ท่านยังคงออกผจญภัยได้โดยไม่มีโบนัสสปอร์"
    )
    .setColor(accepted ? 0x57f287 : 0xff9900)
    .setImage(IMAGES.adventure)
    .addFields(
      { name: "⚔️ อาวุธ", value: `${session.weapon.emoji} ${session.weapon.name}`, inline: true },
      { name: "❤️ HP", value: `${session.currentHP}/${session.maxHP} (+${session.stats.hp})`, inline: true },
      { name: "💧 MP", value: `${session.currentMP}/${session.maxMP} (+${session.stats.mp})`, inline: true },
      { name: "⚔️ ATK / 🛡️ DEF", value: `${statTotal(session, "atk")} / ${statTotal(session, "def")}`, inline: true },
      { name: "💨 SPD / แต้ม", value: `${session.stats.spd} / ${session.stats.points}`, inline: true },
      { name: "💰 Wallet", value: session.currentSpore.toLocaleString(), inline: true },
      { name: "⭐ EXP / Level", value: `${session.currentExp} / ${getPlayer(session.userId).farmLevel}`, inline: true },
    );
  await update(interaction, [embed], [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`fs:start:${session.userId}`).setLabel("เข้าป่า").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`fs:stats:${session.userId}`).setLabel("อัพส���ตตัส").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`fs:bag:${session.userId}`).setLabel("กระเป๋า").setStyle(ButtonStyle.Secondary),
    ),
  ]);
}

export async function handleStats(interaction: ButtonInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  if (!session) return rejectComponent(interaction, "ไม่พบ session นี้");
  const embed = new EmbedBuilder().setTitle("สเตตัสตัวละคร").setDescription(`แต้มที่เหลือ: **${session.stats.points}**\n\nHP +${session.stats.hp} | MP +${session.stats.mp}\nATK +${session.stats.atk} | DEF +${session.stats.def} | SPD +${session.stats.spd}\n\nSPD เพิ่มโอกาสหลบการโจมตีของมอนสเตอร์`).setColor(0x57f287);
  const stats = (["hp", "mp", "atk", "def", "spd"] as const);
  const presetLabel = session.pendingStatAmount ? `จำนวนต่อครั้ง: ${session.pendingStatAmount} แต้ม` : "ตั้งจำนวนแต้มต่อครั้ง";
  return update(interaction, [embed], [
    new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`fs:statpreset:${session.userId}`).setLabel(presetLabel).setStyle(ButtonStyle.Primary)),
    new ActionRowBuilder<ButtonBuilder>().addComponents(...stats.map((stat) => new ButtonBuilder().setCustomId(`fs:statup:${session.userId}:${stat}`).setLabel(`เพิ่ม ${stat.toUpperCase()}`).setStyle(ButtonStyle.Success))),
    new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`fs:back:${session.userId}`).setLabel("กลับ").setStyle(ButtonStyle.Secondary)),
  ]);
}

export async function handleStatPreset(interaction: ButtonInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const modal = new ModalBuilder().setCustomId(`fs:statpreset:${interaction.user.id}`).setTitle("ตั้งจำนวนแต้มต่อครั้ง");
  const amount = new TextInputBuilder().setCustomId("amount").setLabel("จำนวนแต้มที่จะใช้ต่อการกด 1 ครั้ง").setPlaceholder("เช่น 10").setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(6);
  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(amount));
  return interaction.showModal(modal);
}

export async function handleStatUpgrade(interaction: ButtonInteraction, stat: string): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  if (!session || !["hp", "mp", "atk", "def", "spd"].includes(stat)) return rejectComponent(interaction, "ค่าสเตตัสไม่ถูกต้อง");
  const amount = session.pendingStatAmount;
  if (!amount) return rejectComponent(interaction, "กรุณากด ตั้งจำนวนแต้มต่อครั้ง ก่อน");
  if (amount > session.stats.points) return rejectComponent(interaction, `แต้มไม่พอ มีอยู่ ${session.stats.points} แต้ม`);
  session.stats[stat as keyof PlayerStats] += amount;
  session.stats.points -= amount;
  if (stat === "hp") session.maxHP += amount * 10;
  if (stat === "mp") session.maxMP += amount * 10;
  session.lastAction = `upgrade_${stat}_${amount}`;
  saveSession(session);
  return handleStats(interaction);
}

export async function handleStatAmount(interaction: ModalSubmitInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "ฟอร์มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  const amount = Number.parseInt(interaction.fields.getTextInputValue("amount"), 10);
  if (!session || !Number.isInteger(amount) || amount < 1) return rejectComponent(interaction, "กรุณากรอกจำนวนเต็มที่มากกว่า 0");
  if (amount > session.stats.points) return rejectComponent(interaction, `แต้มไม่พอ มีอยู่ ${session.stats.points} แต้ม`);
  session.pendingStatAmount = amount;
  saveSession(session);
  const embed = new EmbedBuilder().setTitle("ตั้งจำนวนแต้มแล้ว").setDescription(`กดปุ่มค่าสเตตัสเพื่อใช้ครั้งละ **${amount} แต้ม**\nแต้มที่เหลือ: **${session.stats.points}**`).setColor(0x57f287);
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

export async function handleStatUpgradeLegacy(interaction: ButtonInteraction, stat: string): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  if (!session || !["hp", "mp", "atk", "def", "spd"].includes(stat)) return rejectComponent(interaction, "ค่าสเตตัสไม่ถูกต้อง");
  if (session.stats.points < 1) return rejectComponent(interaction, "แต้มสเตตัสไม่พอ");
  session.stats[stat as keyof PlayerStats] += 1;
  session.stats.points -= 1;
  if (stat === "hp") session.maxHP += 10;
  if (stat === "mp") session.maxMP += 10;
  session.lastAction = `upgrade_${stat}`;
  saveSession(session);
  return handleStats(interaction);
}

export async function handleStartAdventure(interaction: ButtonInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "❌ ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  if (!session) return rejectComponent(interaction, "❌ ไม่พบ session นี้ กรุณาใช้ /farm-story ใหม่");
  session.chapter = Math.max(1, session.chapter);
  session.lastAction = "adventure_started";
  saveSession(session);
  await renderMain(interaction, session, "การผจญภ��ยเริ่มต้นขึ้นแล้ว");
}

async function renderSession(interaction: ChatInputCommandInteraction, session: FarmStorySession): Promise<void> {
  if (session.battle) return renderBattle(interaction, session, "กลับเข้าสู่การต่อสู้");
  if (session.pendingEvent) return renderEvent(interaction, session, session.pendingEvent);
  await renderMain(interaction, session, "โหล�� session ��ดิมสำเร็จ");
}

function syncFromPlayer(session: FarmStorySession): void {
  const player = getPlayer(session.userId);
  session.currentSpore = player.sporePoints;
  session.currentExp = player.farmExp;
  const level = Math.max(1, player.farmLevel ?? 1);
  session.stats ??= { hp: 0, mp: 0, atk: 0, def: 0, spd: 0, points: 5, awardedLevel: 1 };
  session.equipment ??= { weapon: session.weapon };
  const expectedLevel = Math.max(1, level);
  if (session.stats.awardedLevel < expectedLevel) {
    session.stats.points += (expectedLevel - session.stats.awardedLevel) * 3;
    session.stats.awardedLevel = expectedLevel;
  }
}

function statTotal(session: FarmStorySession, stat: keyof Omit<PlayerStats, "points" | "awardedLevel">): number {
  return session.stats[stat] + (stat === "atk" ? session.weapon.baseDamage : stat === "def" ? session.weapon.baseDefense : stat === "hp" ? session.weapon.baseHP : 0);
}

function award(session: FarmStorySession, spore: number, exp: number): string {
  const player = getPlayer(session.userId);
  if (spore !== 0) player.sporePoints = Math.max(0, player.sporePoints + Math.floor(spore));
  if (exp > 0) player.farmExp += Math.floor(exp);
  let levelUps = 0;
  while (player.farmExp >= player.farmLevel * 100) {
    player.farmExp -= player.farmLevel * 100;
    player.farmLevel += 1;
    levelUps += 1;
  }
  savePlayer(player);
  syncFromPlayer(session);
  return levelUps ? ` เลเวลอัป ${levelUps} ครั้ง! ตอนนี้ Lv.${player.farmLevel}` : "";
}

function questList(session: FarmStorySession): ActiveQuest[] {
  session.activeQuests ??= session.activeQuest ? [session.activeQuest] : [];
  for (const quest of session.activeQuests) {
    if (quest.id.startsWith("collect")) {
      quest.progress = Math.min(quest.target, mushroomInventory(session).reduce((sum, item) => sum + item.quantity, 0));
    } else if (quest.requiredMushroomIds) {
      quest.progress = Math.min(quest.target, mushroomInventory(session).filter((item) => quest.requiredMushroomIds!.includes(item.id)).reduce((sum, item) => sum + item.quantity, 0));
    }
  }
  return session.activeQuests;
}

function completeQuestIfNeeded(session: FarmStorySession, kind: "mushroom" | "monster"): string {
  const quests = questList(session);
  const matching = quests.filter((quest) => (kind === "mushroom" ? quest.id.startsWith("collect") : quest.id.startsWith("hunt")) && quest.progress < quest.target);
  for (const quest of matching) quest.progress = Math.min(quest.target, quest.progress + 1);
  session.activeQuest = quests[0];
  saveSession(session);
  return matching.length ? ` เควสอัปเดต ${matching.map((quest) => `${quest.title} ${quest.progress}/${quest.target}`).join(", ")}` : "";
}

export async function handleQuests(interaction: ButtonInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  if (!session) return rejectComponent(interaction, "ไม่พบ session นี้");
  const quests = questList(session);
  const description = quests.length ? quests.map((quest) => `**${quest.title}**\n${quest.description}\nความคืบหน้า: **${quest.progress}/${quest.target}**\nรางวัล: ${quest.rewardSpore} สปอร์ + ${quest.rewardExp} EXP`).join("\n\n") : "ยังไม่มีเควสที่กำลังทำ\nออกสำรวจเพื่อพบชาวบ้านและรับเควสใหม่";
  const embed = new EmbedBuilder().setTitle("📜 กระดานเควส").setDescription(description).setColor(0xf1c40f);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...quests.filter((quest) => quest.progress >= quest.target).slice(0, 4).map((quest) => new ButtonBuilder().setCustomId(`fs:quest_choose:${session.userId}:${encodeQuestId(quest.id)}`).setLabel(`เลือกเห็ดส่ง: ${quest.title.slice(0, 16)}`).setStyle(ButtonStyle.Success)),
    new ButtonBuilder().setCustomId(`fs:back:${session.userId}`).setLabel("กลับ").setStyle(ButtonStyle.Secondary),
  );
  await update(interaction, [embed], [row]);
}

export async function handleQuestChoose(interaction: ButtonInteraction, questId: string): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  const quest = session && questList(session).find((item) => item.id === questId);
  if (!session || !quest || quest.progress < quest.target) return rejectComponent(interaction, "เควสนี้ยังส่งไม่ได้");
  const mushrooms = mushroomInventory(session).filter((item) => !quest.requiredMushroomIds || quest.requiredMushroomIds.includes(item.id));
  if (mushrooms.length === 0) return rejectComponent(interaction, "ไม่มีเห็ดในกระเป๋า");
  const embed = new EmbedBuilder().setTitle("เลือกเห็ดที่จะส่ง").setDescription(`เควส **${quest.title}** ต้องการเห็ด ${quest.target} ชิ้น\nเลือกเห็ดราคาถูกหรือเห็ดชนิดที่ต้องการส่งได้เอง`).setColor(0xf1c40f);
  const menu = new StringSelectMenuBuilder().setCustomId(`fs:quest_mushroom:${session.userId}:${encodeQuestId(quest.id)}`)    .setPlaceholder("เลือกชนิดเห็ด").setMinValues(1).setMaxValues(Math.min(mushrooms.length, 5)).addOptions(mushrooms.slice(0, 25).map((item, index) => ({ label: `${item.name} (${item.quantity} ชิ้น)`.slice(0, 100), value: `slot_${index}`, description: `มูลค่าขาย ${item.value ?? 0} สปอร์/ชิ้น`.slice(0, 100), emoji: item.emoji })));

  await update(interaction, [embed], [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu), new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`fs:quests:${session.userId}`).setLabel("ยกเลิก").setStyle(ButtonStyle.Secondary))]);
}

export async function handleQuestMushroomSelect(interaction: StringSelectMenuInteraction, questId: string, mushroomIds: string[]): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "เมนูนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  const quest = session && questList(session).find((item) => item.id === questId);
  if (!session || !quest || quest.progress < quest.target) return rejectComponent(interaction, "เควสนี้ยังส่งไม่ได้");
  const mushrooms = mushroomInventory(session).filter((item) => !quest.requiredMushroomIds || quest.requiredMushroomIds.includes(item.id));
  const selected = mushroomIds.map((value) => mushrooms[Number(value.replace("slot_", ""))]).filter((item) => item?.quantity > 0) as typeof session.inventory;
  if (selected.length !== mushroomIds.length || selected.reduce((sum, item) => sum + item.quantity, 0) < quest.target) return rejectComponent(interaction, `เลือกเห็ดให้ครบ ${quest.target} ชิ้น`);
  const embed = new EmbedBuilder().setTitle("ยืนยันการส่งเห็ด").setDescription(`จะส่ง: ${selected.map((item) => `${item.emoji} ${item.name} x${Math.min(item.quantity, quest.target)}`).join("\n")}\n\nเมื่อยืนยัน เห็ดจะถูกหักออกจากกระเป๋าจริง`).setColor(0xe67e22);
  const chosenIds = selected.map((item) => item.id);
  session.pendingQuestSubmission = { questId: quest.id, mushroomIds: chosenIds };
  saveSession(session);
  const confirm = new ButtonBuilder().setCustomId(`fs:quest_confirm:${session.userId}`).setLabel("ยืนยันส่งเห็ด").setStyle(ButtonStyle.Success);
  await update(interaction, [embed], [new ActionRowBuilder<ButtonBuilder>().addComponents(confirm, new ButtonBuilder().setCustomId(`fs:quests:${session.userId}`).setLabel("ยกเลิก").setStyle(ButtonStyle.Secondary))]);
}

export async function handleQuestSubmit(interaction: ButtonInteraction, questId = "", mushroomIds: string[] = []): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  if (!session) return rejectComponent(interaction, "ไม่พบ session นี้");
  questId ||= session.pendingQuestSubmission?.questId ?? "";
  mushroomIds = mushroomIds.length ? mushroomIds : (session.pendingQuestSubmission?.mushroomIds ?? []);
  const quests = questList(session);
  const index = quests.findIndex((quest) => quest.id === questId);
  const quest = quests[index];
  if (!quest || quest.progress < quest.target) return rejectComponent(interaction, "เควสนี้ยังทำไม่ครบ");
  let remaining = quest.target;
  for (const id of mushroomIds) {
    const item = session.inventory.find((entry) => entry.type === "mushroom" && entry.id === id);
    if (!item || item.quantity <= 0) return rejectComponent(interaction, "เห็ดบาง���นิดไม่อยู่ในกระเป๋าแล้ว");
    const used = Math.min(item.quantity, remaining);
    item.quantity -= used;
    remaining -= used;
    if (item.quantity <= 0) session.inventory.splice(session.inventory.indexOf(item), 1);
  }
  if (remaining > 0) return rejectComponent(interaction, `เห็ดไม่ครบ ${quest.target} ชิ้น`);
  const levelText = award(session, quest.rewardSpore, quest.rewardExp);
  quests.splice(index, 1);
  session.activeQuest = quests[0];
  session.pendingQuestSubmission = undefined;
  session.lastAction = `submitted_quest_${quest.id}`;
  saveSession(session);
  await renderMain(interaction, session, `ส่งเควส ${quest.title} สำเร็จ เห็ดถูกหักออกจากกระเป๋าแล้ว +${quest.rewardSpore} สปอร์ +${quest.rewardExp} EXP${levelText}`);
}

async function renderMain(interaction: ComponentInteraction | ChatInputCommandInteraction, session: FarmStorySession, notice = ""): Promise<void> {
  syncFromPlayer(session);
  saveSession(session);
  const player = getPlayer(session.userId);
  const globalItems = getInventory(session.userId);
  const embed = new EmbedBuilder()
    .setTitle(`🌲 ผจญภัยในป่าเห็ด • Chapter ${session.chapter}`)
    .setDescription(`${notice ? `> ${notice}\n\n` : ""}เลือก���ารกระทำของท่านจากปุ่มด้านล่าง\n\n❤️ HP **${session.currentHP}/${session.maxHP}** · 💙 MP **${session.currentMP}/${session.maxMP}**\n⚔️ ${session.weapon.name} · ⭐ Lv.${player.farmLevel} · 🍄 ${player.sporePoints.toLocaleString()} สปอร์`)
    .setColor(0x57f287)
    .setThumbnail(IMAGES.adventure)
    .addFields(
      { name: "⭐ EXP", value: `${player.farmExp}/${player.farmLevel * 100}`, inline: true },
      { name: "🎒 เห็ดในตะกร้า", value: `${session.inventory.filter((item) => item.type === "mushroom").reduce((sum, item) => sum + item.quantity, 0)} ชิ้น`, inline: true },
      { name: "🎁 ไอเทม", value: `${globalItems.length + session.inventory.filter((item) => item.type === "item").reduce((sum, item) => sum + item.quantity, 0)} ชิ้น`, inline: true },
    )
    .setFooter({ text: "ฟาร์มในโหมดนี้ไม่มี cooldown • ทุก action สำคัญจะ autosave" });
  const rows = [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`fs:farm:${session.userId}`).setLabel("🍄 ฟาร์ม").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`fs:profile:${session.userId}`).setLabel("👤 โปรไฟล์").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`fs:bag:${session.userId}`).setLabel("🎒 กระเป๋า").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`fs:items:${session.userId}`).setLabel("ใช้ไอเทมฟื้น HP/MP").setStyle(ButtonStyle.Primary),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`fs:stats:${session.userId}`).setLabel("อัพสเตตัส").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`fs:quests:${session.userId}`).setLabel("📜 เควส").setStyle(ButtonStyle.Secondary),
    ),
  ];
  if ("update" in interaction) await update(interaction, [embed], rows);
  else await interaction.editReply({ embeds: [embed], components: rows });
}

function randomOf<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function newFarmEvent(playerLevel = 1): StoryEventState | BattleState {
  const roll = Math.random() * 100;
  if (roll < 42) {
    const mushroom = randomOf(MUSHROOMS);
    return { kind: "mushroom", id: mushroom.id, title: `${mushroom.emoji} พบเห็ด!`, description: mushroom.description, image: mushroom.image, mushroom };
  }
  if (roll < 67) {
  const base = randomOf(MONSTERS);
  const level = Math.max(1, playerLevel + randInt(-5, 5));
  const variance = 0.75 + Math.random() * 0.5;
  const monster = { ...base, level, maxHP: Math.max(20, Math.floor(base.maxHP * (0.7 + level * 0.12) * variance)), damageMin: Math.max(2, Math.floor(base.damageMin * (0.7 + level * 0.1) * variance)), damageMax: Math.max(4, Math.floor(base.damageMax * (0.7 + level * 0.1) * variance)), rewardSpore: Math.floor(base.rewardSpore * (0.8 + level * 0.12)), rewardExp: Math.floor(base.rewardExp * (0.8 + level * 0.12)) };
  return { monster, currentHP: monster.maxHP, enemyDefenseBrokenTurns: 0, enemyPoisonTurns: 0, enemyStunnedTurns: 0, playerDefending: false, turn: 1 };

  }
  if (roll < 77) return { kind: "npc", id: "apothecary", title: "นักปรุงยาเห็ดน้อยต้องการความช่วยเหลือ", description: "นักปรุงยาเห็ดน้อยทำขวดฟื้นพลังหล่นกระจาย ช่วยเก็บสมุนไพรให้เขา แล้วเขาจะรักษา HP และเปิดเควสต่อเนื่องให้", image: IMAGES.npc };
  if (roll < 82) {
    return { kind: "quest", id: "collect_mushrooms", title: "คำขอจากชาวบ้านเห็ด", description: "ชาวบ้านต้องการเห็ด 3 ชิ้นเพื่อทำยาป้องกันจอมมาร หากมีอยู่ในกระเป๋าแล้ว สามารถส่งได้ทันที", image: IMAGES.mushroomQuest, quest: { id: "collect_mushrooms", title: "ส่งเห็ดให้ชาวบ้าน", description: "ส่งเห็ดชนิดใดก็ได้ 3 ชิ้น", target: 3, progress: 0, rewardSpore: 100, rewardExp: 45 } };
  }
  if (roll < 87) {
    return { kind: "quest", id: "hunt_monster", title: "ประกาศจับมอนสเตอร์จอมซน", description: "ช่วยปกป้องหมู่บ้านจากมอนสเตอร์จอมซน 2 ตัว แล้วกลับมารับรางวัล", image: IMAGES.monsterQuest, quest: { id: "hunt_monster", title: "ปกป้องหมู่บ้าน", description: "ชนะมอนสเตอร์ 2 ตัว", target: 2, progress: 0, rewardSpore: 150, rewardExp: 70 } };
  }

  if (roll < 97) {
    const offer = randomOf(ITEMS_POOL) as BuffItem;
    const marketPrice = Math.max(180, 180 + Math.round(offer.buffValue * 12) + (offer.buffType === "attack_percent" ? 120 : 0));
    return { kind: "shop", id: `shop_${offer.id}`, title: "พ่อค้าเร่แห่งป่าเห็ด", description: `พ่อค้าเร่เปิดร้านชั่วคราว — ราคาตลาดของ ${offer.name} ปรับตามความหายาก`, image: IMAGES.shop, offer: { id: offer.id, name: offer.name, emoji: offer.emoji, description: offer.lore, price: marketPrice } };
  }
  if (roll < 99) return { kind: "secret", id: "hidden_grotto", title: "🌌 พื้นที่ลับใต้รากไม้", description: "ท่านพบทางลับท���่มีแสงสีฟ้าส่องออกมา เหมือนมีบางอย่างรออยู่", image: IMAGES.secret };
  return { kind: "ruins", id: "ancient_ruins", title: "🏛️ เหตุการณ��ต่อเนื่อง: ซากวิหาร", description: "��ระตูวิหารโบรา��เปิดอ��ก เผยร่องรอยของผู้กล้าคนก่อน", image: IMAGES.ruins };
}

function regenerateAfterFarm(session: FarmStorySession): string {
  const hp = Math.max(1, Math.ceil(session.maxHP * 0.1));
  const mp = Math.max(1, Math.ceil(session.maxMP * 0.1));
  const oldHP = session.currentHP;
  const oldMP = session.currentMP;
  session.currentHP = Math.min(session.maxHP, session.currentHP + hp);
  session.currentMP = Math.min(session.maxMP, session.currentMP + mp);
  return `ฟื้น HP +${session.currentHP - oldHP} และ MP +${session.currentMP - oldMP}`;
}

export async function handleItems(interaction: ButtonInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  if (!session) return rejectComponent(interaction, "ไม่พบ session นี้");
  const items = session.inventory.filter((item) => item.type === "item" && item.quantity > 0 && (item.id === "healing_herb" || item.id === "mana_crystal"));
  const embed = new EmbedBuilder().setTitle("ไอเทมฟื้นพลัง").setDescription("เลือกอาหารหรือไอเทมเพื่อฟื้น HP/MP").setColor(0x3498db);
  const buttons = items.map((item) => new ButtonBuilder().setCustomId(`fs:itemuse:${session.userId}:${item.id}`).setLabel(`${item.emoji ?? "ไอเทม"} ${item.name} x${item.quantity}`).setStyle(ButtonStyle.Primary));
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let index = 0; index < buttons.length; index += 5) rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons.slice(index, index + 5)));
  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`fs:back:${session.userId}`).setLabel("กลับ").setStyle(ButtonStyle.Secondary)));
  return update(interaction, [embed], rows);
}

export async function handleUseItem(interaction: ButtonInteraction, itemId: string): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  const item = session?.inventory.find((entry) => entry.id === itemId && entry.type === "item" && entry.quantity > 0);
  if (!session || !item) return rejectComponent(interaction, "ไม่มีไอเทมนี้ในกระเป๋า");
  const amount = itemId === "healing_herb" ? 25 : 20;
  const before = itemId === "healing_herb" ? session.currentHP : session.currentMP;
  if (itemId === "healing_herb") session.currentHP = Math.min(session.maxHP, session.currentHP + amount);
  else session.currentMP = Math.min(session.maxMP, session.currentMP + amount);
  const restored = (itemId === "healing_herb" ? session.currentHP : session.currentMP) - before;
  item.quantity -= 1;
  if (item.quantity <= 0) session.inventory.splice(session.inventory.indexOf(item), 1);
  saveSession(session);
  return handleItems(interaction).then(() => undefined);
}

export async function handleFarm(interaction: ButtonInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "❌ ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  if (!session) return rejectComponent(interaction, "❌ ไม่พบ session นี้");
  if (session.battle) return renderBattle(interaction, session, "ต่อสู้ให้จบก่อนจึงจะออกฟาร์มได้");
  if (session.pendingEvent) return renderEvent(interaction, session, session.pendingEvent);

  session.chapter += 1;
  const regenText = regenerateAfterFarm(session);
  const event = newFarmEvent(getPlayer(session.userId).farmLevel ?? 1);
  if ("monster" in event) session.battle = event;
  else session.pendingEvent = event;
  session.lastAction = "farm";
  saveSession(session);
  if ("monster" in event) await renderBattle(interaction, session, `${regenText}\n${event.monster.emoji} ${event.monster.name} ปรากฏตัว!`);
  else await renderEvent(interaction, session, event);
}

export async function handleBack(interaction: ButtonInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "❌ ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  if (!session) return rejectComponent(interaction, "❌ ไม่พบ session นี้");
  await renderMain(interaction, session, "กลับสู่การผจญภัย");
}

function eventImage(event: StoryEventState): string {
  if (event.kind === "npc" || event.id === "apothecary") return IMAGES.npc;
  if (event.kind === "quest" && event.id === "collect_mushrooms") return IMAGES.mushroomQuest;
  if (event.kind === "quest" && event.id === "hunt_monster") return IMAGES.monsterQuest;
  if (event.kind === "item") return IMAGES.itemQuest;
  if (event.kind === "shop") return IMAGES.shop;
  if (event.kind === "secret") return IMAGES.secret;
  if (event.kind === "ruins") return IMAGES.ruins;
  return event.image;
}

async function renderEvent(interaction: ComponentInteraction | ChatInputCommandInteraction, session: FarmStorySession, event: StoryEventState): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle(event.title)
    .setDescription(`${event.description}\n\n🍄 Wallet: **${session.currentSpore.toLocaleString()}** · ⭐ EXP: **${session.currentExp}**`)
    .setColor(event.kind === "secret" ? 0xb05cff : 0x66bb6a)
    .setThumbnail(eventImage(event));
  const row = new ActionRowBuilder<ButtonBuilder>();
  if (event.kind === "mushroom") {
    embed.addFields({ name: "💰 ราคาขาย", value: `${event.mushroom!.value} สปอร์`, inline: true }, { name: "⭐ EXP เมื่อเก็บ", value: `${event.mushroom!.exp} EXP`, inline: true });
    row.addComponents(new ButtonBuilder().setCustomId(`fs:collect:${session.userId}`).setLabel("🧺 เก็บ").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`fs:skip:${session.userId}`).setLabel("ไม่เก็บ (+5 EXP)").setStyle(ButtonStyle.Secondary));
  } else if (event.kind === "npc") {
    row.addComponents(new ButtonBuilder().setCustomId(`fs:npc_talk:${session.userId}`).setLabel("💬 ช่วยเหลือ").setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId(`fs:leave:${session.userId}`).setLabel("เดินต่อ").setStyle(ButtonStyle.Secondary));
  } else if (event.kind === "quest") {
    embed.addFields({ name: "ภารกิจ", value: `${event.quest!.description}\nรา���วัล: ${event.quest!.rewardSpore} สปอร์ + ${event.quest!.rewardExp} EXP` });
    row.addComponents(new ButtonBuilder().setCustomId(`fs:quest_accept:${session.userId}`).setLabel("📜 รับเควสต์").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`fs:leave:${session.userId}`).setLabel("ปฏิเสธ").setStyle(ButtonStyle.Secondary));
  } else if (event.kind === "item") {
    row.addComponents(new ButtonBuilder().setCustomId(`fs:item_take:${session.userId}`).setLabel("🎁 เก็บไอเทม").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`fs:leave:${session.userId}`).setLabel("ทิ้งไว้").setStyle(ButtonStyle.Secondary));
  } else if (event.kind === "shop") {
    embed.addFields({ name: `${event.offer!.emoji} ${event.offer!.name}`, value: `${event.offer!.description}\nราคา **${event.offer!.price} สปอร์**` });
    row.addComponents(new ButtonBuilder().setCustomId(`fs:shop_buy:${session.userId}`).setLabel("ซื้อ").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`fs:shop_sell:${session.userId}`).setLabel("ขายเห็ด 1 ดอก").setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId(`fs:leave:${session.userId}`).setLabel("ออกจากร้าน").setStyle(ButtonStyle.Secondary));
  } else if (event.kind === "secret") {
    row.addComponents(new ButtonBuilder().setCustomId(`fs:secret_open:${session.userId}`).setLabel("🔮 เปิดทางลับ").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`fs:leave:${session.userId}`).setLabel("ไม่เสี่ยง").setStyle(ButtonStyle.Secondary));
  } else {
    row.addComponents(new ButtonBuilder().setCustomId(`fs:ruins_continue:${session.userId}`).setLabel("📖 อ่านต่อ").setStyle(ButtonStyle.Primary));
  }
  if ("update" in interaction) await update(interaction, [embed], [row]);
  else await interaction.editReply({ embeds: [embed], components: [row] });
}

function finishEvent(session: FarmStorySession, action: string): void {
  session.pendingEvent = undefined;
  session.lastAction = action;
  saveSession(session);
}

export async function handleCollect(interaction: ButtonInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "❌ ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  const mushroom = session?.pendingEvent?.mushroom;
  if (!session || session.pendingEvent?.kind !== "mushroom" || !mushroom) return rejectComponent(interaction, "❌ เหตุการณ์นี้หมดอายุแล้ว");
  const existing = session.inventory.find((item) => item.id === mushroom.id && item.type === "mushroom");
  if (existing) existing.quantity += 1;
  else session.inventory.push({ id: mushroom.id, name: mushroom.name, emoji: mushroom.emoji, type: "mushroom", quantity: 1, value: mushroom.value });
  const questText = completeQuestIfNeeded(session, "mushroom");
  const levelText = award(session, 0, mushroom.exp);
  finishEvent(session, `collected_${mushroom.id}`);
  await renderMain(interaction, session, `เก็บ ${mushroom.name} แล้ว — นำไปขายที่ร้านค้าได้${questText}.${levelText}`);
}

export async function handleSkipMushroom(interaction: ButtonInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "❌ ปุ่มนี้เป็นขอ��ผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  if (!session || session.pendingEvent?.kind !== "mushroom") return rejectComponent(interaction, "�� เหตุการณ์นี้หมดอายุแล้ว");
  const levelText = award(session, 0, 5);
  finishEvent(session, "skipped_mushroom");
  await renderMain(interaction, session, `ท่านปล่อยเห็ดไว้ในป่า ได้รับ +5 EXP${levelText}`);
}

export async function handleShopMushroomSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "เมนูนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  if (!session) return rejectComponent(interaction, "ไม่พบ session นี้");
  const mushrooms = mushroomInventory(session);
  const selected = interaction.values.map((value) => mushrooms[Number(value.replace("slot_", ""))]).filter((item) => item?.quantity > 0) as typeof session.inventory;
  const total = selected.reduce((sum, item) => sum + (item.value ?? 10) * item.quantity, 0);
  if (!selected.length) return rejectComponent(interaction, "ไม่พบเห็ดที่เลือก");
  const summary = selected.map((item) => `${item.emoji} ${item.name} x${item.quantity} = ${(item.value ?? 10) * item.quantity} สปอร์`).join("\n");
  const event = session.pendingEvent;
  if (!event || event.kind !== "shop") return rejectComponent(interaction, "ร้านค้าหมดเวลาแล้ว");
  const embed = new EmbedBuilder().setTitle("ยืนยันการขายเห็ด").setDescription(`${summary}\n\nยอดรวมที่จะได้รับ: **${total.toLocaleString()} สปอร์**\nเห็ดทั้งหมดที่เลือกจะถูกนำออกจากกระเป๋า`).setColor(0x2ecc71);
  const ids = selected.map((item) => encodeQuestId(item.id)).join(",");
  await update(interaction, [embed], [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`fs:shop_confirm:${session.userId}:${ids}`).setLabel("ยืนยันขายทั้งหมด").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`fs:event_leave:${session.userId}`).setLabel("ยกเลิก").setStyle(ButtonStyle.Secondary))]);
}

export async function handleShopMushroomConfirm(interaction: ButtonInteraction, ids: string[]): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  if (!session || !session.pendingEvent || session.pendingEvent.kind !== "shop") return rejectComponent(interaction, "ร้านค้าหมดเวลาแล้ว");
  let total = 0;
  for (const id of ids) {
    const item = session.inventory.find((entry) => entry.type === "mushroom" && entry.id === id);
    if (!item) continue;
    total += (item.value ?? 10) * item.quantity;
    session.inventory.splice(session.inventory.indexOf(item), 1);
  }
  if (!total) return rejectComponent(interaction, "เห็ดที่เลือกไม่มีอยู่แล้ว");
  award(session, total, Math.max(2, Math.floor(total / 40)));
  finishEvent(session, `sold_mushrooms_${ids.length}`);
  return renderMain(interaction, session, `ขายเห็ด ${ids.length} ชนิดสำเร็จ ได้รับ **${total.toLocaleString()} สปอร์**`);
}

export async function handleEventAction(interaction: ButtonInteraction, action: string): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "❌ ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  const event = session?.pendingEvent;
  if (!session || !event) return rejectComponent(interaction, "❌ เหตุการณ์นี้หมดอา��ุแล้ว");

  if (action === "leave") {
    finishEvent(session, "left_event");
    return renderMain(interaction, session, "���่านเดินทางต่อโดยไม่รับข้อเสนอ");
  }
  if (action === "npc_talk" && event.kind === "npc") {
    session.currentHP = Math.min(session.maxHP, session.currentHP + 25);
    const followUp: ActiveQuest = { id: "apothecary_herbs", title: "สมุนไพรให้ขวดฟื้นพลัง", description: "ส่งเห็ดเรืองแสงหรือเห็ดหัวใจผลึก 2 ชิ้นให้นักปรุงยา", target: 2, progress: 0, rewardSpore: 120, rewardExp: 55, requiredMushroomIds: ["glowing_mushroom", "crystalheart_mushroom"] };
    const quests = questList(session);
    if (!quests.some((quest) => quest.id === followUp.id)) quests.push(followUp);
    const levelText = award(session, 0, 20);
    finishEvent(session, "helped_apothecary");
    return renderMain(interaction, session, `นักปรุงยาเห็ดน้อยรักษาให้ +25 HP และเปิดเควส **${followUp.title}** แล้ว — เข้าเมนูเควสเพื่อดูและส่งของได้ทันที${levelText}`);
  }
  if (action === "quest_accept" && event.kind === "quest" && event.quest) {
    const quests = questList(session);
    if (quests.some((quest) => quest.id === event.quest!.id)) return rejectComponent(interaction, "รับเควสนี้อยู่แล้ว");
    quests.push(event.quest);
    session.activeQuest = event.quest;
    finishEvent(session, "accepted_quest");
    return renderMain(interaction, session, `รับเควส **${event.quest.title}** แล้ว — ดูคว��มคืบหน้าได้ที่ปุ่ม เควส`);
  }
  if (action === "item_take" && event.kind === "item" && event.item) {
    session.inventory.push({ ...event.item, type: "item", quantity: 1 });
    finishEvent(session, "found_story_item");
    return renderMain(interaction, session, `เก็บ ${event.item.name} เข้ากระเป๋าแล้ว`);
  }
  if (action === "shop_sell" && event.kind === "shop") {
    const mushrooms = mushroomInventory(session);
    if (!mushrooms.length) return rejectComponent(interaction, "ยังไม่มีเห็ดให้ขาย");
    const menu = new StringSelectMenuBuilder().setCustomId(`fs:shop_mushrooms:${session.userId}`).setPlaceholder("เลือกเห็ดและจำนวนที่จะขาย").setMinValues(1).setMaxValues(Math.min(mushrooms.length, 25)).addOptions(mushrooms.slice(0, 25).map((item, index) => ({ label: `${item.name} x${item.quantity}`.slice(0, 100), value: `slot_${index}`, description: `${item.value ?? 10} สปอร์/ชิ้น · ยอดสูงสุด ${(item.value ?? 10) * item.quantity}`.slice(0, 100), emoji: item.emoji })));
    const embed = new EmbedBuilder().setTitle("เลือกเห็ดที่จะขาย").setDescription("เลือกชนิดเห็ดได้หลายรายการ ระบบจะสรุปยอดรวมก่อนยืนยัน").setColor(0x2ecc71);
    return update(interaction, [embed], [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu), new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`fs:event_leave:${session.userId}`).setLabel("ยกเลิก").setStyle(ButtonStyle.Secondary))]);
  }
  if (action === "shop_buy" && event.kind === "shop" && event.offer) {
    if (session.currentSpore < event.offer.price) return rejectComponent(interaction, "❌ สปอร์ไม่พอสำหรับซื้อไอเทมนี้");
    const player = getPlayer(session.userId);
    player.sporePoints -= event.offer.price;
    savePlayer(player);
    addItemToInventory(session.userId, event.offer.id);
    finishEvent(session, `bought_${event.offer.id}`);
    return renderMain(interaction, session, `ซื้อ ${event.offer.name} และเพิ่มเข้า wallet inventory แล้ว`);
  }
  if (action === "secret_open" && event.kind === "secret") {
    const item = randomOf(STORY_ITEMS);
    session.inventory.push({ ...item, type: "item", quantity: 1 });
    const levelText = award(session, 0, 30);
    finishEvent(session, `opened_secret_${item.id}`);
    return renderMain(interaction, session, `พื้นที���ลับมอบ ${item.name} และ +30 EXP${levelText}`);
  }
  if (action === "ruins_continue" && event.kind === "ruins") {
    const mushroom = randomOf(MUSHROOMS);
    session.inventory.push({ id: mushroom.id, name: mushroom.name, emoji: mushroom.emoji, type: "mushroom", quantity: 1, value: mushroom.value });
    const levelText = award(session, 45, 35);
    finishEvent(session, `completed_${event.id}`);
    return renderMain(interaction, session, `ท่านอ่านจารึกจนจบ ได้ ${mushroom.name} และ +45 สปอร์ +35 EXP${levelText}`);
  }
  return rejectComponent(interaction, "❌ การกระทำนี้ใช้กับเหตุการณ์ปัจจุบันไม่ได้");
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function skillDescription(skill: WeaponSkill): string {
  return `${skill.name} (${skill.costMP} MP) — ${skill.description}`;
}

async function renderBattle(interaction: ComponentInteraction | ChatInputCommandInteraction, session: FarmStorySession, notice = ""): Promise<void> {
  const battle = session.battle!;
  const embed = new EmbedBuilder()
    .setTitle(`⚔️ Battle • Lv.${battle.monster.level} ${battle.monster.emoji} ${battle.monster.name}`)
    .setDescription(`${notice ? `> ${notice}\n\n` : ""}${battle.monster.description}\n\n❤️ ศัตรู: **${Math.max(0, battle.currentHP)}/${battle.monster.maxHP} HP**\n❤️ ท่าน: **${session.currentHP}/${session.maxHP} HP** · 💙 **${session.currentMP}/${session.maxMP} MP**\n\nเทิร์นที่ **${battle.turn}** — เลือกการกระทำของท่าน`)
    .setColor(0xff4444)
    .setImage(battle.monster.image)
    .addFields({ name: "📜 Skills", value: session.weapon.skills.map(skillDescription).join("\n") });
  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fs:battle:${session.userId}:attack`).setLabel("⚔️ โจมตีปกติ").setStyle(ButtonStyle.Danger),
    ...session.weapon.skills.map((skill) => new ButtonBuilder().setCustomId(`fs:skill:${session.userId}:${skill.id}`).setLabel(`✨ ${skill.name}`).setStyle(ButtonStyle.Primary)),
  );
  const fleeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fs:flee:${session.userId}`).setLabel("🏃 หนี").setStyle(ButtonStyle.Secondary),
  );
  if ("update" in interaction) await update(interaction, [embed], [actionRow, fleeRow]);
  else await interaction.editReply({ embeds: [embed], components: [actionRow, fleeRow] });
}

export async function handleBattleAction(interaction: ButtonInteraction, action: string, skillId?: string): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "❌ ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  const battle = session?.battle;
  if (!session || !battle) return rejectComponent(interaction, "❌ การต่อสู้นี้หมดอายุแล้ว");

  if (action === "flee") {
    session.battle = undefined;
    session.chapter += 1;
    session.lastAction = "fled_battle";
    saveSession(session);
    return renderMain(interaction, session, `ท่านหนีจาก ${battle.monster.name} สำเร็จ แต่ไม่ได้ร���บรางวัล`);
  }

  let damage = 0;
  let playerText = "";
  if (action === "skill") {
    const skill = session.weapon.skills.find((entry) => entry.id === skillId);
    if (!skill) return rejectComponent(interaction, "❌ ไม่พบสกิลนี้");
    if (session.currentMP < skill.costMP) return rejectComponent(interaction, "❌ MP ไม่พอสำหรับใช้สกิลนี้");
    session.currentMP -= skill.costMP;
    if (Math.random() * 100 > skill.hitChance) {
      playerText = `ใช้ **${skill.name}** แต่พลาดเป้า`;
    } else {
      damage = Math.max(1, Math.floor(statTotal(session, "atk") * skill.damageMultiplier * (0.9 + Math.random() * 0.25)));
      if (skill.effect === "double_hit") damage += Math.floor(damage * 0.65);
      if (skill.effect === "pierce") battle.enemyDefenseBrokenTurns = skill.effectDuration ?? 2;
      if (skill.effect === "poison") battle.enemyPoisonTurns = skill.effectDuration ?? 3;
      if (skill.effect === "stun" && Math.random() * 100 < (skill.effectChance ?? 50)) battle.enemyStunnedTurns = skill.effectDuration ?? 1;
      if (skill.effect === "defend" || skill.effect === "whirlwind") battle.playerDefending = true;
      if (skill.id === "moonlight") session.currentHP = Math.min(session.maxHP, session.currentHP + 10);
      playerText = `ใช้ **${skill.name}** สร้างความเสียหาย **${damage}**`;
    }
  } else {
    damage = Math.max(1, Math.floor(statTotal(session, "atk") * (0.9 + Math.random() * 0.2)));
    playerText = `โจมตีปกติ สร้างความเสียหาย **${damage}**`;
  }

  battle.currentHP = Math.max(0, battle.currentHP - damage);
  if (battle.enemyPoisonTurns > 0) {
    const poisonDamage = 6 + battle.monster.level;
    battle.currentHP = Math.max(0, battle.currentHP - poisonDamage);
    battle.enemyPoisonTurns -= 1;
    playerText += ` และพิษทำงานอีก **${poisonDamage}**`;
  }
  if (battle.currentHP <= 0) {
    const levelText = award(session, battle.monster.rewardSpore, battle.monster.rewardExp);
    const regenText = regenerateAfterFarm(session);
    const questText = completeQuestIfNeeded(session, "monster");
    let dropName = "";
    if (Math.random() < 0.25) {
      const drop = Math.random() < 0.5 ? STORY_ITEMS[0] : STORY_ITEMS[1];
      dropName = drop.name;
      addItemToSession(session, { ...drop, type: "item", quantity: 1 });
    } else if (Math.random() < 0.15) {
      const equipment = { id: `drop_weapon_${Date.now()}`, name: "ดาบนักล่าเห็ด", emoji: "⚔️", type: "equipment" as const, quantity: 1, equipment: { id: `drop_weapon_${Date.now()}`, name: "ดาบนักล่าเห็ด", emoji: "⚔️", slot: "weapon" as const, description: "อาวุธที่ดรอปจากมอนสเตอร์", attack: 12, defense: 2, value: 120 } };
      dropName = equipment.name;
      addItemToSession(session, equipment);
    }
    session.battle = undefined;
    session.chapter += 1;
    session.lastAction = "won_battle";
    saveSession(session);
    return renderMain(interaction, session, `ชนะ ${battle.monster.name}! +${battle.monster.rewardSpore} สปอร์ +${battle.monster.rewardExp} EXP${questText}.${levelText} ${regenText}${dropName ? ` ได้รับ ${dropName}` : ""}`);
  }

  let enemyText = "";
  if (battle.enemyStunnedTurns > 0) {
    battle.enemyStunnedTurns -= 1;
    enemyText = `${battle.monster.name} ชะงัก จึงโจมตีไม่ได้`;
  } else {
    const dodgeChance = Math.min(45, session.stats.spd * 2);
    if (Math.random() * 100 < dodgeChance) {
      enemyText = `${battle.monster.name} ใช้ ${randomOf(battle.monster.attackSkills)} แต่พลาดเป้า — หลบได้ (${dodgeChance}% )`;
    } else {
      const enemyDamage = Math.max(1, randInt(battle.monster.damageMin, battle.monster.damageMax) - Math.floor((session.weapon.baseDefense + session.stats.def) / 3));
      const actualDamage = battle.playerDefending ? Math.ceil(enemyDamage / 2) : enemyDamage;
      session.currentHP = Math.max(0, session.currentHP - actualDamage);
      enemyText = `${battle.monster.name} ใช้ ${randomOf(battle.monster.attackSkills)} ทำให้เสีย **${actualDamage} HP**`;
    }
  }
  battle.playerDefending = false;
  session.currentMP = Math.min(session.maxMP, session.currentMP + 5);

  if (session.currentHP <= 0) {
    const penalty = Math.floor(getPlayer(session.userId).sporePoints * 0.1);
    award(session, -penalty, 0);
    session.currentHP = 1;
    session.battle = undefined;
    session.chapter += 1;
    session.lastAction = "lost_battle";
    saveSession(session);
    return renderMain(interaction, session, `พ่ายแพ้ต่อ ${battle.monster.name} เสีย ${penalty} สปอร์ และถูกส่งกลับพร้อม HP คร���่งหนึ่ง`);
  }

  battle.turn += 1;
  session.lastAction = `battle_${action}`;
  saveSession(session);
  await renderBattle(interaction, session, `${playerText}\n${enemyText}`);
}

export async function handleProfile(interaction: ButtonInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "❌ ปุ่มนี้เป���นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  if (!session) return rejectComponent(interaction, "❌ ไม่พบ session นี้");
  const player = getPlayer(session.userId);
  const embed = new EmbedBuilder()
    .setTitle(`👤 โป���ไฟล์นักผจญภัย • Chapter ${session.chapter}`)
    .setDescription(`อาวุธ **${session.weapon.emoji} ${session.weapon.name}**\n${session.weapon.description}`)
    .setColor(0x5865f2)
    .addFields(
      { name: "🍄 Wallet / สปอร์", value: player.sporePoints.toLocaleString(), inline: true },
      { name: "⭐ Level / EXP", value: `Lv.${player.farmLevel} · ${player.farmExp}/${player.farmLevel * 100}`, inline: true },
      { name: "❤️ HP / 💙 MP", value: `${session.currentHP}/${session.maxHP} · ${session.currentMP}/${session.maxMP}`, inline: true },
      { name: "📜 เควส", value: questList(session).length ? questList(session).map((quest) => `${quest.title} (${quest.progress}/${quest.target})`).join("\n") : "ไม่มีเควสที่กำลังทำ", inline: false },
    )
    .setImage(IMAGES.adventure);
  await update(interaction, [embed], [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`fs:back:${session.userId}`).setLabel("↩️ กลับ").setStyle(ButtonStyle.Secondary))]);
}

export async function handleBag(interaction: ComponentInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "❌ ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  if (!session) return rejectComponent(interaction, "❌ ไม่พบ session นี้");
  const storyItems = session.inventory.length ? session.inventory.map((item) => `${item.emoji ?? "🎁"} **${item.name}** ×${item.quantity}${item.type === "mushroom" ? ` — ขายได้ ${item.value ?? 10}/ชิ้น` : ""}`).join("\n") : "ว่างเปล่า";
  const globalItems = getInventory(session.userId).map((entry) => { const item = getItemById(entry.itemId); return `${item?.emoji ?? "🎁"} **${item?.name ?? entry.itemId}**${entry.isEquipped ? " (สวมใส่)" : ""}`; });
  const embed = new EmbedBuilder().setTitle("🎒 กระเป๋าผจญภัย").setDescription("เลือกอุปกรณ์ด้านล่างเพื่อสวมใส่ อุปกรณ์ที่สวมอยู่จะไม่ถูกขาย").setColor(0x9b59b6).addFields(
    { name: "🍄 Story inventory", value: storyItems, inline: false },
    { name: "อุปกรณ์ที่สวมใส่", value: (["weapon", "helmet", "armor", "pants", "boots"] as const).map((slot) => `${slot}: ${session.equipment[slot]?.emoji ?? "ว่าง"} ${session.equipment[slot]?.name ?? "ยังไม่มี"}`).join("\n"), inline: false },
    { name: "🎁 Wallet inventory", value: globalItems.length ? globalItems.join("\n") : "ว่างเปล่า", inline: false },
  );
  const equipment = session.inventory.filter((item) => item.type === "equipment" && item.equipment);
  const components: Array<ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>> = [];
  if (equipment.length) {
    const menu = new StringSelectMenuBuilder().setCustomId(`fs:equip:${session.userId}`).setPlaceholder("เลือกอุปกรณ์เพื่อสวมใส่").addOptions(equipment.slice(0, 25).map((item) => ({ label: item.name.slice(0, 100), value: item.id, description: `${item.equipment!.slot} ${item.equipment!.description}`.slice(0, 100), emoji: item.emoji ?? "⚔️" })));
    components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu));
  }
  components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`fs:back:${session.userId}`).setLabel("↩️ กลับ").setStyle(ButtonStyle.Secondary)));
  await update(interaction, [embed], components);
}

export async function handleEquip(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  const item = session?.inventory.find((entry) => entry.id === interaction.values[0] && entry.type === "equipment" && entry.equipment);
  if (!session || !item?.equipment) return rejectComponent(interaction, "ไม่พบอุปกรณ์นี้");
  session.equipment[item.equipment.slot] = item.equipment;
  if (item.equipment.slot === "weapon") session.weapon = { ...session.weapon, name: item.equipment.name, emoji: item.equipment.emoji, description: item.equipment.description, baseDamage: item.equipment.attack ?? session.weapon.baseDamage, baseDefense: item.equipment.defense ?? session.weapon.baseDefense, baseHP: item.equipment.hp ?? session.weapon.baseHP };
  session.maxHP += item.equipment.hp ?? 0;
  session.maxMP += item.equipment.mp ?? 0;
  saveSession(session);
  await update(interaction, [new EmbedBuilder().setTitle("สวมใส่อุปกรณ์แล้ว").setDescription(`${item.equipment.emoji} ${item.equipment.name} ถูกสวมใส่ในช่อง ${item.equipment.slot}`).setColor(0x57f287)], [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`fs:bag:${session.userId}`).setLabel("กลับไปกระเป๋า").setStyle(ButtonStyle.Secondary))]);
}
