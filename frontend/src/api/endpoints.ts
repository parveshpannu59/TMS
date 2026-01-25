export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    VERIFY: '/auth/verify',
  },

  USERS: {
    LIST: '/users',
    CREATE: '/users',
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
    GET: (id: string) => `/users/${id}`,
    STATS: '/users/stats',
    CHANGE_PASSWORD: (id: string) => `/users/${id}/password`,
  },

  LOADS: {
    LIST: '/loads',
    CREATE: '/loads',
    UPDATE: (id: string) => `/loads/${id}`,
    DELETE: (id: string) => `/loads/${id}`,
    GET: (id: string) => `/loads/${id}`,
  },

  DRIVERS: {
    LIST: '/drivers',
    CREATE: '/drivers',
    UPDATE: (id: string) => `/drivers/${id}`,
    DELETE: (id: string) => `/drivers/${id}`,
    GET: (id: string) => `/drivers/${id}`,
  },

  TRUCKS: {
    LIST: '/trucks',
    CREATE: '/trucks',
    UPDATE: (id: string) => `/trucks/${id}`,
    DELETE: (id: string) => `/trucks/${id}`,
    GET: (id: string) => `/trucks/${id}`,
  },

  SETTINGS: {
    GET: '/settings',
    UPDATE: '/settings',
    UPDATE_SECTION: (section: string) => `/settings/${section}`,
    CHANGE_PASSWORD: '/settings/password',
    PROFILE_PICTURE: '/settings/profile-picture',
    TEST_NOTIFICATION: '/settings/test-notification',
    TWO_FACTOR: {
      ENABLE: '/settings/2fa/enable',
      VERIFY: '/settings/2fa/verify',
      DISABLE: '/settings/2fa/disable',
      BACKUP_CODES: '/settings/2fa/backup-codes',
      REGENERATE_CODES: '/settings/2fa/regenerate-codes',
    },
  },
} as const;