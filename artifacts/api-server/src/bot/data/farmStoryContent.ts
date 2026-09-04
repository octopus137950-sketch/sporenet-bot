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
export interface MainQuestChain { id: string; title: string; description: string; stages: MainQuestStage[]; image: string; }
export const MAIN_QUESTS: MainQuestChain[] = [{
  id: "main_awakening", title: "เสียงเรียกจากหัวใจผลึก", description: "ค้นหาต้นกำเนิดของสปอร์ที่กำลังตื่นขึ้น", image: "story_main_awakening_pixel.png", stages: [
    { id: "find_grove", title: "ตามรอยแสงฟ้า", description: "ออกสำรวจป่า 3 ครั้ง", target: 3, rewardSpore: 120, rewardExp: 80, image: "quest_main_grove_pixel.png" },
    { id: "defeat_guardian", title: "ผู้พิทักษ์ใต้รากไม้", description: "เอาชนะมอนสเตอร์ 1 ตัว", target: 1, rewardSpore: 240, rewardExp: 160, image: "quest_main_guardian_pixel.png" },
    { id: "return_crystal", title: "นำผลึกกลับคืน", description: "เก็บเห็ดหัวใจผลึก 2 ชิ้น", target: 2, rewardSpore: 400, rewardExp: 280, image: "quest_main_crystal_pixel.png" },
  ],
}];

export const STORY_EVENT_IMAGES = {
  moon_grove: "event_moon_grove_pixel.png", merchant: "event_mushroom_merchant_pixel.png", guardian: "event_root_guardian_pixel.png", crystal: "event_crystal_cavern_pixel.png", camp: "event_forest_camp_pixel.png",
} as const;

export function cloneQuest(quest: ActiveQuest): ActiveQuest { return { ...quest, progress: 0 }; }
export function rewardText(quest: ActiveQuest): string { return `รางวัล: ${quest.rewardSpore} สปอร์ และ ${quest.rewardExp} EXP`; }
export function newSideQuest(): ActiveQuest { return cloneQuest(SIDE_QUESTS[Math.floor(Math.random() * SIDE_QUESTS.length)]!); }
export function mainStage(chain: MainQuestChain, index: number): ActiveQuest { const stage = chain.stages[index]!; return { id: `${chain.id}:${stage.id}`, title: `${chain.title} — ${stage.title}`, description: stage.description, target: stage.target, progress: 0, rewardSpore: stage.rewardSpore, rewardExp: stage.rewardExp }; }
