import { Client, EmbedBuilder, TextChannel } from "discord.js";
import {
  expireMarketplaceListing,
  getMarketplaceListings,
  markMarketplaceMessageDeleted,
} from "../data/store.js";

let schedulerStarted = false;

async function deleteListingMessage(client: Client, listingId: string, channelId: string, messageId: string): Promise<void> {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!(channel instanceof TextChannel)) return;
  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (message) await message.delete().catch(() => undefined);
  markMarketplaceMessageDeleted(listingId);
}

async function processMarketplace(client: Client): Promise<void> {
  const now = Date.now();
  for (const listing of Object.values(
    Object.fromEntries(
      Array.from(client.guilds.cache.values()).flatMap((guild) =>
        getMarketplaceListings(guild.id).map((entry) => [entry.listingId, entry] as const),
      ),
    ),
  )) {
    if (listing.status === "active" && listing.expiresAt <= now) {
      const expired = expireMarketplaceListing(listing.listingId);
      if (expired.ok && expired.listing.messageId) {
        const channel = await client.channels.fetch(expired.listing.channelId).catch(() => null);
        if (channel instanceof TextChannel) {
          const message = await channel.messages.fetch(expired.listing.messageId).catch(() => null);
          await message?.edit({
            embeds: [
              new EmbedBuilder()
                .setTitle("⌛ รายการหมดอายุ")
                .setDescription("คืนไอเทมให้ผู้ขายแล้ว")
                .setColor(0x95a5a6),
            ],
            components: [],
          }).catch(() => undefined);
        }
      }
    }

    if (
      listing.status !== "active" &&
      listing.messageId &&
      listing.messageDeletedAt !== undefined &&
      listing.messageDeletedAt <= now
    ) {
      await deleteListingMessage(client, listing.listingId, listing.channelId, listing.messageId);
    }
  }
}

export function startMarketplaceScheduler(client: Client): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  setInterval(() => {
    void processMarketplace(client).catch((error) =>
      console.error("[Marketplace] scheduler error:", error),
    );
  }, 60_000);
  console.log("🛒 Marketplace scheduler started");
}