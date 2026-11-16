import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { profiles } from '../db/schema.js';
import type { ProfileInput } from './recommendation.js';

export type Profile = ProfileInput;

export async function getProfile(userId: string): Promise<Profile | undefined> {
  const [row] = await db
    .select({
      monthlyIncomeMxn: profiles.monthlyIncomeMxn,
      monthlyExpensesMxn: profiles.monthlyExpensesMxn,
      hasEmergencyFund: profiles.hasEmergencyFund,
      horizon: profiles.horizon,
      risk: profiles.risk,
    })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return row;
}

export async function upsertProfile(userId: string, profile: Profile): Promise<Profile> {
  await db
    .insert(profiles)
    .values({ userId, ...profile })
    .onConflictDoUpdate({ target: profiles.userId, set: profile });
  return profile;
}
