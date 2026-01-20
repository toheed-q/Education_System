import { z } from 'zod';
import { 
  insertUserSchema, 
  insertProgramSchema, 
  insertCourseSchema,
  insertTutorProfileSchema,
  insertBookingSchema,
  insertMessageSchema,
  users,
  programs,
  courses,
  tutorProfiles,
  bookings,
  messages,
  courseWeeks,
  courseContent,
  quizzes,
  quizQuestions,
  quizAttempts,
  enrollments
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register',
      input: insertUserSchema.extend({ role: z.enum(["student", "tutor"]).default("student") }),
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({
        username: z.string(), // mapping email to username field for consistency with passport local strategy naming often
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  programs: {
    list: {
      method: 'GET' as const,
      path: '/api/programs',
      responses: {
        200: z.array(z.custom<typeof programs.$inferSelect & { courseCount: number }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/programs/:id',
      responses: {
        200: z.custom<typeof programs.$inferSelect & { courses: typeof courses.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
  },
  courses: {
    list: {
      method: 'GET' as const,
      path: '/api/courses',
      responses: {
        200: z.array(z.custom<typeof courses.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/courses/:id',
      responses: {
        // Response varies based on enrollment - full content for enrolled, preview for non-enrolled
        200: z.custom<typeof courses.$inferSelect & { 
          weeks: (typeof courseWeeks.$inferSelect & { 
            content: { id: number; title: string; type: string; sequenceOrder: number; contentUrl?: string; contentText?: string }[]; 
            quiz?: { id: number; title: string; passScorePercent: number; isFinalExam: boolean } 
          })[] 
        }>(),
        404: errorSchemas.notFound,
      },
    },
  },
  tutors: {
    list: {
      method: 'GET' as const,
      path: '/api/tutors',
      input: z.object({
        subject: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof tutorProfiles.$inferSelect & { user: typeof users.$inferSelect }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/tutors/:id',
      responses: {
        200: z.custom<typeof tutorProfiles.$inferSelect & { user: typeof users.$inferSelect }>(),
        404: errorSchemas.notFound,
      },
    },
  },
  bookings: {
    create: {
      method: 'POST' as const,
      path: '/api/bookings',
      input: insertBookingSchema,
      responses: {
        201: z.custom<typeof bookings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/bookings',
      responses: {
        200: z.array(z.custom<typeof bookings.$inferSelect & { tutor?: typeof users.$inferSelect, student?: typeof users.$inferSelect }>()),
      },
    },
  },
  messages: {
    list: {
      method: 'GET' as const,
      path: '/api/messages',
      input: z.object({ userId: z.coerce.number() }), // Messages with a specific user
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect>()),
      },
    },
    send: {
      method: 'POST' as const,
      path: '/api/messages',
      input: insertMessageSchema,
      responses: {
        201: z.custom<typeof messages.$inferSelect>(),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
