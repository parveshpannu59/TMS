// In-memory store for temporary 2FA setup data
// In production, consider using Redis or database with TTL

interface TwoFactorTempData {
  secret: string;
  backupCodes: string[];
  expiresAt: Date;
}

const store = new Map<string, TwoFactorTempData>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [key, value] of store.entries()) {
    if (value.expiresAt < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export const twoFactorStore = {
  set(userId: string, secret: string, backupCodes: string[]): void {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minute expiry
    
    store.set(userId, {
      secret,
      backupCodes,
      expiresAt,
    });
  },

  get(userId: string): { secret: string; backupCodes: string[] } | null {
    const data = store.get(userId);
    if (!data) {
      return null;
    }
    
    if (data.expiresAt < new Date()) {
      store.delete(userId);
      return null;
    }
    
    return {
      secret: data.secret,
      backupCodes: data.backupCodes,
    };
  },

  delete(userId: string): void {
    store.delete(userId);
  },
};
