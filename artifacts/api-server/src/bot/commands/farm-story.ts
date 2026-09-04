import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
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
  king: `${IMAGE_BASE}/farm_golden_mushroom.png`,
  weapons: `${IMAGE_BASE}/farm_crystalheart_mushroom.png`,
  adventure: `${IMAGE_BASE}/farm_mooncap_mushroom.png`,
  npc: `${IMAGE_BASE}/farm_common_mushroom.png`,
  quest: `${IMAGE_BASE}/farm_glowing_mushroom.png`,
  shop: `${IMAGE_BASE}/farm_golden_mushroom.png`,
  item: `${IMAGE_BASE}/farm_embercap_mushroom.png`,
  secret: `${IMAGE_BASE}/farm_crystalheart_mushroom.png`,
  ruins: `${IMAGE_BASE}/farm_mushroom_dragon.png`,
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
      { name: "❤️ HP", value: `${session.currentHP}/${session.maxHP}`, inline: true },
      { name: "💰 Wallet", value: session.currentSpore.toLocaleString(), inline: true },
      { name: "⭐ EXP / Level", value: `${session.currentExp} / ${getPlayer(session.userId).farmLevel}`, inline: true },
    );
  await update(interaction, [embed], [new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fs:start:${session.userId}`).setLabel("🚀 เข้าป่า").setStyle(ButtonStyle.Primary),
  )]);
}

export async function handleStartAdventure(interaction: ButtonInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "❌ ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  if (!session) return rejectComponent(interaction, "❌ ไม่พบ session นี้ กรุณาใช้ /farm-story ใหม่");
  session.chapter = Math.max(1, session.chapter);
  session.lastAction = "adventure_started";
  saveSession(session);
  await renderMain(interaction, session, "การผจญภัยเริ่มต้นขึ้นแล้ว");
}

async function renderSession(interaction: ChatInputCommandInteraction, session: FarmStorySession): Promise<void> {
  if (session.battle) return renderBattle(interaction, session, "กลับเข้าสู่การต่อสู้");
  if (session.pendingEvent) return renderEvent(interaction, session, session.pendingEvent);
  await renderMain(interaction, session, "โหลด session เดิมสำเร็จ");
}

function syncFromPlayer(session: FarmStorySession): void {
  const player = getPlayer(session.userId);
  session.currentSpore = player.sporePoints;
  session.currentExp = player.farmExp;
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

function completeQuestIfNeeded(session: FarmStorySession, kind: "mushroom" | "monster"): string {
  const quest = session.activeQuest;
  if (!quest) return "";
  if ((kind === "mushroom" && !quest.id.startsWith("collect")) || (kind === "monster" && !quest.id.startsWith("hunt"))) return "";
  quest.progress = Math.min(quest.target, quest.progress + 1);
  if (quest.progress < quest.target) return ` เควสต์ ${quest.progress}/${quest.target}`;
  const reward = award(session, quest.rewardSpore, quest.rewardExp);
  session.activeQuest = undefined;
  return ` เควสต์สำเร็จ! +${quest.rewardSpore} สปอร์ +${quest.rewardExp} EXP.${reward}`;
}

async function renderMain(interaction: ComponentInteraction | ChatInputCommandInteraction, session: FarmStorySession, notice = ""): Promise<void> {
  syncFromPlayer(session);
  saveSession(session);
  const player = getPlayer(session.userId);
  const globalItems = getInventory(session.userId);
  const embed = new EmbedBuilder()
    .setTitle(`🌲 ผจญภัยในป่าเห็ด • Chapter ${session.chapter}`)
    .setDescription(`${notice ? `> ${notice}\n\n` : ""}เลือกการกระทำของท่านจากปุ่มด้านล่าง\n\n❤️ HP **${session.currentHP}/${session.maxHP}** · 💙 MP **${session.currentMP}/${session.maxMP}**\n⚔️ ${session.weapon.name} · ⭐ Lv.${player.farmLevel} · 🍄 ${player.sporePoints.toLocaleString()} สปอร์`)
    .setColor(0x57f287)
    .setImage(IMAGES.adventure)
    .addFields(
      { name: "⭐ EXP", value: `${player.farmExp}/${player.farmLevel * 100}`, inline: true },
      { name: "🎒 เห็ดในตะกร้า", value: `${session.inventory.filter((item) => item.type === "mushroom").reduce((sum, item) => sum + item.quantity, 0)} ชิ้น`, inline: true },
      { name: "🎁 ไอเทม", value: `${globalItems.length + session.inventory.filter((item) => item.type === "item").reduce((sum, item) => sum + item.quantity, 0)} ชิ้น`, inline: true },
    )
    .setFooter({ text: "ฟาร์มในโหมดนี้ไม่มี cooldown • ทุก action สำคัญจะ autosave" });
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fs:farm:${session.userId}`).setLabel("🍄 ฟาร์ม").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`fs:profile:${session.userId}`).setLabel("👤 โปรไฟล์").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fs:bag:${session.userId}`).setLabel("🎒 กระเป๋า").setStyle(ButtonStyle.Secondary),
  );
  if ("update" in interaction) await update(interaction, [embed], [row]);
  else await interaction.editReply({ embeds: [embed], components: [row] });
}

function randomOf<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function newFarmEvent(): StoryEventState | BattleState {
  const roll = Math.random() * 100;
  if (roll < 42) {
    const mushroom = randomOf(MUSHROOMS);
    return { kind: "mushroom", id: mushroom.id, title: `${mushroom.emoji} พบเห็ด!`, description: mushroom.description, image: mushroom.image, mushroom };
  }
  if (roll < 67) {
    const monster = randomOf(MONSTERS);
    return { monster, currentHP: monster.maxHP, enemyDefenseBrokenTurns: 0, enemyPoisonTurns: 0, enemyStunnedTurns: 0, playerDefending: false, turn: 1 };
  }
  if (roll < 77) return { kind: "npc", id: "herbalist", title: "🧙 นักปรุงยาผู้หลงทาง", description: "นักปรุงยาขอให้ท่านช่วยชี้ทางกลับหมู่บ้าน แลกกับการรักษาและความรู้", image: IMAGES.npc };
  if (roll < 85) return { kind: "quest", id: "collect_mushrooms", title: "📜 กระดาษคำร้องจากหมู่บ้าน", description: "ชาวบ้านต้องการเห็ดเพื่อปรุงยาป้องกันจอมมาร เก็บเห็ด 3 ดอกแล้วนำกลับมา", image: IMAGES.quest, quest: { id: "collect_mushrooms", title: "เก็บเห็ดช่วยหมู่บ้าน", description: "เก็บเห็ด 3 ดอก", target: 3, progress: 0, rewardSpore: 100, rewardExp: 45 } };
  if (roll < 92) {
    const item = randomOf(STORY_ITEMS);
    return { kind: "item", id: item.id, title: `${item.emoji} หีบเสบียงเก่า`, description: `ท่านพบ ${item.name} ในหีบที่ถูกทิ้งไว้`, image: IMAGES.item, item };
  }
  if (roll < 97) {
    const offer = randomOf(ITEMS_POOL) as BuffItem;
    return { kind: "shop", id: `shop_${offer.id}`, title: "🛒 พ่อค้าเร่แห่งป่าเห็ด", description: "พ่อค้าเร่เปิดร้านชั่วคราว ก่อนจะเดินทางต่อในไม่ช้า", image: IMAGES.shop, offer: { id: offer.id, name: offer.name, emoji: offer.emoji, description: offer.lore, price: 100 + Math.floor(Math.random() * 151) } };
  }
  if (roll < 99) return { kind: "secret", id: "hidden_grotto", title: "🌌 พื้นที่ลับใต้รากไม้", description: "ท่านพบทางลับที่มีแสงสีฟ้าส่องออกมา เหมือนมีบางอย่างรออยู่", image: IMAGES.secret };
  return { kind: "ruins", id: "ancient_ruins", title: "🏛️ เหตุการณ์ต่อเนื่อง: ซากวิหาร", description: "ประตูวิหารโบราณเปิดออก เผยร่องรอยของผู้กล้าคนก่อน", image: IMAGES.ruins };
}

export async function handleFarm(interaction: ButtonInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "❌ ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  if (!session) return rejectComponent(interaction, "❌ ไม่พบ session นี้");
  if (session.battle) return renderBattle(interaction, session, "ต่อสู้ให้จบก่อนจึงจะออกฟาร์มได้");
  if (session.pendingEvent) return renderEvent(interaction, session, session.pendingEvent);

  session.chapter += 1;
  const event = newFarmEvent();
  if ("monster" in event) session.battle = event;
  else session.pendingEvent = event;
  session.lastAction = "farm";
  saveSession(session);
  if ("monster" in event) await renderBattle(interaction, session, `${event.monster.emoji} ${event.monster.name} ปรากฏตัว!`);
  else await renderEvent(interaction, session, event);
}

export async function handleBack(interaction: ButtonInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "❌ ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  if (!session) return rejectComponent(interaction, "❌ ไม่พบ session นี้");
  await renderMain(interaction, session, "กลับสู่การผจญภัย");
}

async function renderEvent(interaction: ComponentInteraction | ChatInputCommandInteraction, session: FarmStorySession, event: StoryEventState): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle(event.title)
    .setDescription(`${event.description}\n\n🍄 Wallet: **${session.currentSpore.toLocaleString()}** · ⭐ EXP: **${session.currentExp}**`)
    .setColor(event.kind === "secret" ? 0xb05cff : 0x66bb6a)
    .setImage(event.image);
  const row = new ActionRowBuilder<ButtonBuilder>();
  if (event.kind === "mushroom") {
    embed.addFields({ name: "💰 ราคาขาย", value: `${event.mushroom!.value} สปอร์`, inline: true }, { name: "⭐ EXP เมื่อเก็บ", value: `${event.mushroom!.exp} EXP`, inline: true });
    row.addComponents(new ButtonBuilder().setCustomId(`fs:collect:${session.userId}`).setLabel("🧺 เก็บ").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`fs:skip:${session.userId}`).setLabel("ไม่เก็บ (+5 EXP)").setStyle(ButtonStyle.Secondary));
  } else if (event.kind === "npc") {
    row.addComponents(new ButtonBuilder().setCustomId(`fs:npc_talk:${session.userId}`).setLabel("💬 ช่วยเหลือ").setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId(`fs:leave:${session.userId}`).setLabel("เดินต่อ").setStyle(ButtonStyle.Secondary));
  } else if (event.kind === "quest") {
    embed.addFields({ name: "ภารกิจ", value: `${event.quest!.description}\nรางวัล: ${event.quest!.rewardSpore} สปอร์ + ${event.quest!.rewardExp} EXP` });
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
  if (!validOwner(interaction)) return rejectComponent(interaction, "❌ ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  if (!session || session.pendingEvent?.kind !== "mushroom") return rejectComponent(interaction, "❌ เหตุการณ์นี้หมดอายุแล้ว");
  const levelText = award(session, 0, 5);
  finishEvent(session, "skipped_mushroom");
  await renderMain(interaction, session, `ท่านปล่อยเห็ดไว้ในป่า ได้รับ +5 EXP${levelText}`);
}

export async function handleEventAction(interaction: ButtonInteraction, action: string): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "❌ ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  const event = session?.pendingEvent;
  if (!session || !event) return rejectComponent(interaction, "❌ เหตุการณ์นี้หมดอายุแล้ว");

  if (action === "leave") {
    finishEvent(session, "left_event");
    return renderMain(interaction, session, "ท่านเดินทางต่อโดยไม่รับข้อเสนอ");
  }
  if (action === "npc_talk" && event.kind === "npc") {
    session.currentHP = Math.min(session.maxHP, session.currentHP + 25);
    const levelText = award(session, 0, 20);
    finishEvent(session, "helped_npc");
    return renderMain(interaction, session, `นักปรุงยารักษาให้ +25 HP และมอบความรู้ +20 EXP${levelText}`);
  }
  if (action === "quest_accept" && event.kind === "quest" && event.quest) {
    session.activeQuest = event.quest;
    finishEvent(session, "accepted_quest");
    return renderMain(interaction, session, `รับเควสต์ **${event.quest.title}** แล้ว`);
  }
  if (action === "item_take" && event.kind === "item" && event.item) {
    session.inventory.push({ ...event.item, type: "item", quantity: 1 });
    finishEvent(session, "found_story_item");
    return renderMain(interaction, session, `เก็บ ${event.item.name} เข้ากระเป๋าแล้ว`);
  }
  if (action === "shop_sell" && event.kind === "shop") {
    const mushroom = session.inventory.find((item) => item.type === "mushroom" && item.quantity > 0);
    if (!mushroom) return rejectComponent(interaction, "❌ ยังไม่มีเห็ดให้ขาย");
    const value = mushroom.value ?? 10;
    mushroom.quantity -= 1;
    if (mushroom.quantity <= 0) session.inventory.splice(session.inventory.indexOf(mushroom), 1);
    award(session, value, 2);
    saveSession(session);
    return renderEvent(interaction, session, event);
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
    return renderMain(interaction, session, `พื้นที่ลับมอบ ${item.name} และ +30 EXP${levelText}`);
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
    return renderMain(interaction, session, `ท่านหนีจาก ${battle.monster.name} สำเร็จ แต่ไม่ได้รับรางวัล`);
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
      damage = Math.max(1, Math.floor(session.weapon.baseDamage * skill.damageMultiplier * (0.9 + Math.random() * 0.25)));
      if (skill.effect === "double_hit") damage += Math.floor(damage * 0.65);
      if (skill.effect === "pierce") battle.enemyDefenseBrokenTurns = skill.effectDuration ?? 2;
      if (skill.effect === "poison") battle.enemyPoisonTurns = skill.effectDuration ?? 3;
      if (skill.effect === "stun" && Math.random() * 100 < (skill.effectChance ?? 50)) battle.enemyStunnedTurns = skill.effectDuration ?? 1;
      if (skill.effect === "defend" || skill.effect === "whirlwind") battle.playerDefending = true;
      if (skill.id === "moonlight") session.currentHP = Math.min(session.maxHP, session.currentHP + 10);
      playerText = `ใช้ **${skill.name}** สร้างความเสียหาย **${damage}**`;
    }
  } else {
    damage = Math.max(1, Math.floor(session.weapon.baseDamage * (0.9 + Math.random() * 0.2)));
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
    const questText = completeQuestIfNeeded(session, "monster");
    session.battle = undefined;
    session.chapter += 1;
    session.lastAction = "won_battle";
    saveSession(session);
    return renderMain(interaction, session, `ชนะ ${battle.monster.name}! +${battle.monster.rewardSpore} สปอร์ +${battle.monster.rewardExp} EXP${questText}.${levelText}`);
  }

  let enemyText = "";
  if (battle.enemyStunnedTurns > 0) {
    battle.enemyStunnedTurns -= 1;
    enemyText = `${battle.monster.name} ชะงัก จึงโจมตีไม่ได้`;
  } else {
    const enemyDamage = Math.max(1, randInt(battle.monster.damageMin, battle.monster.damageMax) - Math.floor(session.weapon.baseDefense / 3));
    const actualDamage = battle.playerDefending ? Math.ceil(enemyDamage / 2) : enemyDamage;
    session.currentHP = Math.max(0, session.currentHP - actualDamage);
    enemyText = `${battle.monster.name} ใช้ ${randomOf(battle.monster.attackSkills)} ทำให้เสีย **${actualDamage} HP**`;
  }
  battle.playerDefending = false;
  session.currentMP = Math.min(session.maxMP, session.currentMP + 5);

  if (session.currentHP <= 0) {
    const penalty = Math.floor(getPlayer(session.userId).sporePoints * 0.1);
    award(session, -penalty, 0);
    session.currentHP = Math.max(1, Math.ceil(session.maxHP / 2));
    session.battle = undefined;
    session.chapter += 1;
    session.lastAction = "lost_battle";
    saveSession(session);
    return renderMain(interaction, session, `พ่ายแพ้ต่อ ${battle.monster.name} เสีย ${penalty} สปอร์ และถูกส่งกลับพร้อม HP ครึ่งหนึ่ง`);
  }

  battle.turn += 1;
  session.lastAction = `battle_${action}`;
  saveSession(session);
  await renderBattle(interaction, session, `${playerText}\n${enemyText}`);
}

export async function handleProfile(interaction: ButtonInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "❌ ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  if (!session) return rejectComponent(interaction, "❌ ไม่พบ session นี้");
  const player = getPlayer(session.userId);
  const embed = new EmbedBuilder()
    .setTitle(`👤 โปรไฟล์นักผจญภัย • Chapter ${session.chapter}`)
    .setDescription(`อาวุธ **${session.weapon.emoji} ${session.weapon.name}**\n${session.weapon.description}`)
    .setColor(0x5865f2)
    .addFields(
      { name: "🍄 Wallet / สปอร์", value: player.sporePoints.toLocaleString(), inline: true },
      { name: "⭐ Level / EXP", value: `Lv.${player.farmLevel} · ${player.farmExp}/${player.farmLevel * 100}`, inline: true },
      { name: "❤️ HP / 💙 MP", value: `${session.currentHP}/${session.maxHP} · ${session.currentMP}/${session.maxMP}`, inline: true },
      { name: "📜 เควสต์", value: session.activeQuest ? `${session.activeQuest.title} (${session.activeQuest.progress}/${session.activeQuest.target})` : "ไม่มีเควสต์ที่กำลังทำ", inline: false },
    )
    .setImage(IMAGES.adventure);
  await update(interaction, [embed], [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`fs:back:${session.userId}`).setLabel("↩️ กลับ").setStyle(ButtonStyle.Secondary))]);
}

export async function handleBag(interaction: ButtonInteraction): Promise<void> {
  if (!validOwner(interaction)) return rejectComponent(interaction, "❌ ปุ่มนี้เป็นของผู้เล่นคนอื่น");
  const session = getSession(interaction.user.id, interaction.guildId!);
  if (!session) return rejectComponent(interaction, "❌ ไม่พบ session นี้");
  const storyItems = session.inventory.length
    ? session.inventory.map((item) => `${item.emoji ?? "🎁"} **${item.name}** ×${item.quantity}${item.type === "mushroom" ? ` — ขายได้ ${item.value ?? 10}/ชิ้น` : ""}`).join("\n")
    : "ว่างเปล่า";
  const globalItems = getInventory(session.userId).map((entry) => {
    const item = getItemById(entry.itemId);
    return `${item?.emoji ?? "🎁"} **${item?.name ?? entry.itemId}**${entry.isEquipped ? " (สวมใส่)" : ""}`;
  });
  const embed = new EmbedBuilder()
    .setTitle("🎒 กระเป๋าผจญภัย")
    .setDescription("เห็ดในตะกร้าต้องนำไปขายผ่านเหตุการณ์ร้านค้า ส่วนไอเทมบัฟอยู่ใน wallet inventory เดิม")
    .setColor(0x9b59b6)
    .addFields(
      { name: "🍄 Story inventory", value: storyItems, inline: false },
      { name: "🎁 Wallet inventory", value: globalItems.length ? globalItems.join("\n") : "ว่างเปล่า", inline: false },
    );
  await update(interaction, [embed], [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`fs:back:${session.userId}`).setLabel("↩️ กลับ").setStyle(ButtonStyle.Secondary))]);
}
