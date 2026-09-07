import type { EquipmentItem, ActiveQuest, StoryEventState } from "./farmStoryStore.js";

export const FARM_EQUIPMENT: EquipmentItem[] = [
  { id: "iron_sword", name: "ดาบเหล็กป่าเห็ด", emoji: "⚔️", slot: "weapon", description: "ดาบพื้นฐานที่เชื่อถือได้", attack: 18, defense: 4, hp: 30, value: 90 },
  { id: "moon_bow", name: "ธนูจันทรา", emoji: "🏹", slot: "weapon", description: "ธนูที่ยิงได้แม่นยำในความมืด", attack: 24, speed: 5, value: 150 },
  { id: "ember_axe", name: "ขวานเถ้าอัคคี", emoji: "🪓", slot: "weapon", description: "ขวานร้อนระอุจากถ้ำภูเขาไฟ", attack: 32, hp: 20, value: 220 },
  { id: "crystal_spear", name: "หอกผลึกดาวตก", emoji: "🔱", slot: "weapon", description: "ปลายหอกเจาะเกราะมอนสเตอร์", attack: 28, defense: 6, value: 200 },
  { id: "moss_helm", name: "หมวกเห็ดมอส", emoji: "🪖", slot: "helmet", description: "หมวกเบา ป้องกันสปอร์พิษ", defense: 8, hp: 45, value: 110 },
  { id: "crystal_crown", name: "มงกุฎผลึกฟ้า", emoji: "👑", slot: "helmet", description: "สะท้อนพลังเวทของป่า", defense: 12, mp: 45, value: 260 },
  { id: "bark_armor", name: "เกราะเปลือกไม้โบราณ", emoji: "🛡️", slot: "armor", description: "เกราะแข็งแรงจากต้นไม้พันปี", defense: 20, hp: 110, value: 280 },
  { id: "spore_mail", name: "เกราะเกล็ดสปอร์", emoji: "🛡️", slot: "armor", description: "เกราะที่ขยับตามลมหายใจ", defense: 15, hp: 70, mp: 20, value: 240 },
  { id: "root_pants", name: "กางเกงรากไม้", emoji: "👖", slot: "pants", description: "ยึดเกาะพื้นดินได้ดี", defense: 8, hp: 60, value: 130 },
  { id: "shadow_pants", name: "กางเกงเงาจันทร์", emoji: "👖", slot: "pants", description: "ช่วยให้เคลื่อนไหวไร้เสียง", defense: 5, speed: 10, value: 180 },
  { id: "moss_boots", name: "รองเท้ามอสเงียบ", emoji: "🥾", slot: "boots", description: "ก้าวผ่านป่าโดยไม่ปลุกมอนสเตอร์", defense: 5, speed: 8, value: 120 },
  { id: "crystal_boots", name: "รองเท้าผลึกวายุ", emoji: "🥾", slot: "boots", description: "เบาราวกับเดินบนสายลม", defense: 7, speed: 15, value: 230 },
];

export const SIDE_QUESTS: ActiveQuest[] = [
  { id: "side_gather_3", title: "เก็บเห็ดริมทาง", description: "เก็บเห็ดชนิดใดก็ได้ 3 ครั้ง", target: 3, progress: 0, rewardSpore: 80, rewardExp: 45 },
  { id: "side_hunt_2", title: "กำจัดผู้บุกรุก", description: "ชนะการต่อสู้กับมอนสเตอร์ 2 ตัว", target: 2, progress: 0, rewardSpore: 130, rewardExp: 75 },
  { id: "side_voice_20", title: "เฝ้าป่ามอส", description: "อยู่ในห้องเสียงระหว่างการผจญภัย 20 นาที", target: 20, progress: 0, rewardSpore: 110, rewardExp: 60 },
  { id: "side_use_item", title: "เตรียมเสบียง", description: "ใช้ไอเทมฟื้นฟู 2 ครั้ง", target: 2, progress: 0, rewardSpore: 100, rewardExp: 55 },
];

export interface MainQuestStage { id: string; title: string; description: string; target: number; rewardSpore: number; rewardExp: number; image: string; }
export interface MainQuestChain { id: string; chapter: number; title: string; description: string; stages: MainQuestStage[]; image: string; }
export interface ChapterDefinition {
  id: number;
  title: string;
  intro: string;
  unlockAfterChapter?: number;
  unlockQuestIds: string[];
  lore: string[];
}

export const CHAPTERS: ChapterDefinition[] = [
  { id: 0, title: "บทนำ • เส้นทางก่อนอาณาจักร", intro: "ทุกการเดินทางเริ่มต้นจากการสำรวจครั้งแรก", unlockQuestIds: [], lore: ["เก็บเกี่ยวสปอร์และค้นหาเส้นทางที่ซ่อนอยู่ ก่อนเรื่องราวของหัวใจผลึกจะเริ่มต้น"] },
  { id: 1, title: "เสียงเรียกจากหัวใจผลึก", intro: "ผลึกโบราณกำลังตื่นขึ้นใต้ป่าเห็ด", unlockQuestIds: [], lore: ["อาณาจักรเห็ดเคยรุ่งเรืองด้วยพลังของหัวใจผลึก", "ผู้พิทักษ์รากไม้ไม่ได้ปกป้องสมบัติ แต่กำลังปกป้องผนึกโบราณ"] },
  { id: 2, title: "หมู่บ้านใต้รากไม้", intro: "ผู้รอดชีวิตรวมตัวกันใต้รากไม้ยักษ์", unlockAfterChapter: 1, unlockQuestIds: ["main_awakening:return_crystal"], lore: ["หมู่บ้านใต้รากไม้คือที่หลบภัยสุดท้ายของชาวเห็ด", "ผู้อาวุโสกำลังตามหาผู้ถือผลึกคนใหม่"] },
  { id: 3, title: "เมืองเห็ดที่ถูกทิ้งร้าง", intro: "ซากเมืองเก่าซ่อนความจริงของราชวงศ์", unlockAfterChapter: 2, unlockQuestIds: ["chapter_2:root_village"] , lore: ["เมืองหลวงไม่ได้ล่มสลายเพราะสงคราม แต่เพราะผลึกถูกใช้ผิดวิธี"] },
  { id: 4, title: "รอยแยกใต้ป่า", intro: "รอยแยกเปิดทางให้สิ่งมีชีวิตจากใต้พิภพ", unlockAfterChapter: 3, unlockQuestIds: ["chapter_3:ruined_city"], lore: ["จอมมารเห็ดถือกำเนิดจากเงาของหัวใจผลึก"] },
  { id: 5, title: "สงครามราชันเห็ด", intro: "ชะตาของอาณาจักรเชื่อมเข้ากับสงครามบอสโลก", unlockAfterChapter: 4, unlockQuestIds: ["chapter_4:rift_sealed"], lore: ["ผู้ถือผลึกต้องเลือกว่าจะรักษาอาณาจักร หรือเปลี่ยนแปลงมันตลอดกาล"] },
];

export const MAIN_QUESTS: MainQuestChain[] = [{
  id: "main_awakening", chapter: 1, title: "เสียงเรียกจากหัวใจผลึก", description: "ค้นหาต้นกำเนิดของสปอร์ที่กำลังตื่นขึ้น", image: "story_main_awakening_pixel.png", stages: [
    { id: "find_grove", title: "ตามรอยแสงฟ้า", description: "ออกสำรวจป่า 3 ครั้ง", target: 3, rewardSpore: 120, rewardExp: 80, image: "quest_main_grove_pixel.png" },
    { id: "defeat_guardian", title: "ผู้พิทักษ์ใต้รากไม้", description: "เอาชนะมอนสเตอร์ 1 ตัว", target: 1, rewardSpore: 240, rewardExp: 160, image: "quest_main_guardian_pixel.png" },
    { id: "return_crystal", title: "นำผลึกกลับคืน", description: "เก็บเห็ดหัวใจผลึก 2 ชิ้น", target: 2, rewardSpore: 400, rewardExp: 280, image: "quest_main_crystal_pixel.png" },
  ],
  },
  { id: "main_root_village", chapter: 2, title: "หมู่บ้านใต้รากไม้", description: "ช่วยผู้รอดชีวิตตั้งหลักใต้รากไม้ยักษ์", image: "event_moon_grove_pixel.png", stages: [{ id: "root_village", title: "ตามหาเสียงจากรากไม้", description: "ออกสำรวจป่า 2 ครั้ง", target: 2, rewardSpore: 180, rewardExp: 120, image: "event_moon_grove_pixel.png" }, { id: "village_guard", title: "ปกป้องหมู่บ้าน", description: "เอาชนะมอนสเตอร์ 2 ตัว", target: 2, rewardSpore: 300, rewardExp: 200, image: "quest_main_guardian_pixel.png" }] },
  { id: "main_ruined_city", chapter: 3, title: "เมืองเห็ดที่ถูกทิ้งร้าง", description: "เปิดเผยความลับของราชวงศ์เก่า", image: "quest_main_crystal_pixel.png", stages: [{ id: "ruined_city", title: "อ่านบันทึกที่แตกสลาย", description: "เก็บเห็ด 3 ครั้ง", target: 3, rewardSpore: 380, rewardExp: 240, image: "quest_main_crystal_pixel.png" }] },
  { id: "main_underforest_rift", chapter: 4, title: "รอยแยกใต้ป่า", description: "ปิดรอยแยกก่อนสิ่งจากใต้พิภพจะหลุดออกมา", image: "quest_main_guardian_pixel.png", stages: [{ id: "rift_sealed", title: "ผนึกเสียงใต้ดิน", description: "เอาชนะมอนสเตอร์ 3 ตัว", target: 3, rewardSpore: 520, rewardExp: 340, image: "quest_main_guardian_pixel.png" }] },
  { id: "main_mushroom_war", chapter: 5, title: "สงครามราชันเห็ด", description: "เตรียมตัวเผชิญหน้าบอสโลก", image: "story_main_awakening_pixel.png", stages: [{ id: "world_war", title: "รวบรวมกำลังพล", description: "เก็บเห็ด 5 ครั้ง", target: 5, rewardSpore: 700, rewardExp: 500, image: "story_main_awakening_pixel.png" }] },
];

export const STORY_EVENT_IMAGES = {
  moon_grove: "event_moon_grove_pixel.png", merchant: "event_mushroom_merchant_pixel.png", guardian: "event_root_guardian_pixel.png", crystal: "event_crystal_cavern_pixel.png", camp: "event_forest_camp_pixel.png",
} as const;

export function cloneQuest(quest: ActiveQuest): ActiveQuest { return { ...quest, progress: 0 }; }
export function rewardText(quest: ActiveQuest): string { return `รางวัล: ${quest.rewardSpore} สปอร์ และ ${quest.rewardExp} EXP`; }
export function newSideQuest(): ActiveQuest { return cloneQuest(SIDE_QUESTS[Math.floor(Math.random() * SIDE_QUESTS.length)]!); }
export function mainStage(chain: MainQuestChain, index: number): ActiveQuest { const stage = chain.stages[index]!; return { id: `${chain.id}:${stage.id}`, title: `${chain.title} — ${stage.title}`, description: stage.description, target: stage.target, progress: 0, rewardSpore: stage.rewardSpore, rewardExp: stage.rewardExp }; }
