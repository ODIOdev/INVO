import type { StoredRecord } from "@/lib/storage/dataBins";
import { MASTER_PROFILE_ID } from "@/lib/admin-auth-constants";

export { MASTER_PROFILE_ID };

export type StorageScope = {
  profileId: string;
};

export function recordProfileId(record: StoredRecord): string {
  return record.profileId ?? MASTER_PROFILE_ID;
}

export function belongsToScope(
  record: StoredRecord,
  scope: StorageScope
): boolean {
  return recordProfileId(record) === scope.profileId;
}

export function scopeRecords(
  records: StoredRecord[],
  scope: StorageScope
): StoredRecord[] {
  return records.filter((record) => belongsToScope(record, scope));
}

export function sameProfile(
  a: StoredRecord,
  b: StoredRecord
): boolean {
  return recordProfileId(a) === recordProfileId(b);
}
