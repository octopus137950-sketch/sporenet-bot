import type { Client, EmbedBuilder } from "discord.js";
import { EmbedBuilder as DiscordEmbedBuilder } from "discord.js";
import {
  getEcosystemState,
  getLogChannel,
  type EcosystemState,
  type EcosystemWeather,
  saveEcosystemState,
} from "../data/store.js";

export const BASE_REGEN = 100_000;
export const FERTILIZER_REGEN = 500;
export const HOUR_MS = 3_600_000;

const WEATHER_DETAILS: Record<
  EcosystemWeather,
  { emoji: string; label: string; multiplier: number; color: number }
> = {
  Sunny: { emoji: "☀️", label: "แดดออก", multiplier: 0.8, color: 0xffc107 },
  Normal: { emoji: "🌤️", label: "ปกติ", multiplier: 1, color: 0x8bc34a },
  Rainy: { emoji: "🌧️", label: "ฝนตก", multiplier: 1.5, color: 0x4fc3f7 },
};

const SUNNY_MULTIPLIERS: Record<30 | 60 | 90, number> = {
  30: 0.8,
  60: 0.5,
  90: 0.2,
};

const RAINY_MULTIPLIERS: Record<30 | 60 | 90, number> = {
  30: 1.5,
  60: 2.5,
  90: 4,
};

export function getWeatherDetails(
  weather: EcosystemWeather,
  intensity: EcosystemState["weatherIntensity"],
): { emoji: string; label: string; multiplier: number; color: number } {
  if (weather === "Sunny") {
    return {
      ...WEATHER_DETAILS.Sunny,
      multiplier: SUNNY_MULTIPLIERS[intensity === 100 ? 30 : intensity],
    };
  }
  if (weather === "Rainy") {
    return {
      ...WEATHER_DETAILS.Rainy,
      multiplier: RAINY_MULTIPLIERS[intensity === 100 ? 30 : intensity],
    };
  }
  return WEATHER_DETAILS.Normal;
}

export function calculateRegen(state: EcosystemState): number {
  const details = getWeatherDetails(state.currentWeather, state.weatherIntensity);
  return Math.floor(
    (BASE_REGEN + state.hourlyFertilizeCount * FERTILIZER_REGEN) *
      details.multiplier,
  );
}

export function getNextCycleAt(state = getEcosystemState(), now = Date.now()): number {
  const next = state.lastCycleAt + HOUR_MS;
  return next > now ? next : Math.ceil(now / HOUR_MS) * HOUR_MS;
}

function randomWeather(): EcosystemWeather {
  const weather: EcosystemWeather[] = ["Sunny", "Normal", "Rainy"];
  return weather[Math.floor(Math.random() * weather.length)]!;
}

function randomIntensity(weather: EcosystemWeather): EcosystemState["weatherIntensity"] {
  if (weather === "Normal") return 100;
  const tiers = [30, 60, 90] as const;
  return tiers[Math.floor(Math.random() * tiers.length)]!;
}

export interface HourlyCycleResult {
  previousWeather: EcosystemState;
  newWeather: EcosystemState;
  regenerated: number;
  fertilizerCount: number;
}

export function applyHourlyCycle(now = Date.now()): HourlyCycleResult {
  const previousWeather = { ...getEcosystemState() };
  const regenerated = calculateRegen(previousWeather);
  const fertilizerCount = previousWeather.hourlyFertilizeCount;
  const newWeather = randomWeather();
  const nextState: EcosystemState = {
    currentSpores: Math.min(
      previousWeather.maxSpores,
      previousWeather.currentSpores + regenerated,
    ),
    maxSpores: previousWeather.maxSpores,
    hourlyFertilizeCount: 0,
    currentWeather: newWeather,
    weatherIntensity: randomIntensity(newWeather),
    lastCycleAt: Math.floor(now / HOUR_MS) * HOUR_MS,
  };
  saveEcosystemState(nextState);
  return {
    previousWeather,
    newWeather: { ...nextState },
    regenerated,
    fertilizerCount,
  };
}

export function formatCountdown(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.ceil((timestamp - now) / 1000));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours} ชม. ${minutes} นาที ${remainingSeconds} วินาที`;
}

export function buildEcosystemEmbed(now = Date.now()): EmbedBuilder {
  const state = getEcosystemState();
  const weather = getWeatherDetails(state.currentWeather, state.weatherIntensity);
  const nextCycleAt = getNextCycleAt(state, now);
  const estimatedRegen = calculateRegen(state);
  return new DiscordEmbedBuilder()
    .setTitle("🌿 สถานะระบบนิเวศ SporeNet")
    .setDescription(
      `${weather.emoji} สภาพอากาศตอนนี้: **${weather.label}** ` +
        `(ความรุนแรง ${state.weatherIntensity}% · ตัวคูณ x${weather.multiplier})`,
    )
    .setColor(weather.color)
    .addFields(
      {
        name: "🍄 สปอร์ในธรรมชาติ",
        value: `**${state.currentSpores.toLocaleString()}** / ${state.maxSpores.toLocaleString()}`,
        inline: true,
      },
      {
        name: "🌱 ปุ๋ยสะสมชั่วโมงนี้",
        value: `**${state.hourlyFertilizeCount.toLocaleString()}** ครั้ง`,
        inline: true,
      },
      {
        name: "📈 คาดการณ์การเติมรอบถัดไป",
        value: `ประมาณ **+${estimatedRegen.toLocaleString()}** สปอร์`,
        inline: false,
      },
      {
        name: "⏳ เติมสปอร์รอบถัดไปใน",
        value: formatCountdown(nextCycleAt, now),
        inline: false,
      },
    )
    .setFooter({ text: "ระบบจะสุ่มสภาพอากาศใหม่ทุกต้นชั่วโมง" })
    .setTimestamp(now);
}

export async function announceHourlyCycle(
  client: Client,
  result: HourlyCycleResult,
): Promise<void> {
  const weather = getWeatherDetails(
    result.newWeather.currentWeather,
    result.newWeather.weatherIntensity,
  );
  const description =
    `${weather.emoji} สภาพอากาศเปลี่ยนเป็น **${weather.label}** ` +
    `(Intensity: ${result.newWeather.weatherIntensity}%)!\n` +
    `🍄 เติมสปอร์เข้าธรรมชาติแล้ว **${result.regenerated.toLocaleString()}** ดอก ` +
    `(จากปุ๋ย ${result.fertilizerCount.toLocaleString()} ครั้ง)\n` +
    `⚡ ตัวคูณการเติบโตรอบนี้: **x${weather.multiplier}** เท่า!`;
  const embed = new DiscordEmbedBuilder()
    .setTitle("🌎 ระบบนิเวศเปลี่ยนแปลงรายชั่วโมง")
    .setDescription(description)
    .setColor(weather.color)
    .addFields({
      name: "🍄 สปอร์คงเหลือในธรรมชาติ",
      value: `${result.newWeather.currentSpores.toLocaleString()} / ${result.newWeather.maxSpores.toLocaleString()}`,
    })
    .setTimestamp();

  for (const guild of client.guilds.cache.values()) {
    const configuredChannelId = getLogChannel(guild.id);
    const configuredChannel = configuredChannelId
      ? guild.channels.cache.get(configuredChannelId)
      : undefined;
    const channel =
      configuredChannel?.isTextBased()
        ? configuredChannel
        : guild.systemChannel?.isTextBased()
          ? guild.systemChannel
          : undefined;
    if (channel) {
      await channel.send({ embeds: [embed] }).catch(() => undefined);
    }
  }
}
