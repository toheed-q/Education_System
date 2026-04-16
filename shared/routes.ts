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
  enrollments,
  certificates
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
    sync: {
      method: 'POST' as const,
      path: '/api/auth/sync',
      input: z.object({
        role: z.enum(["student", "tutor"]).optional(),
      }),
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
    create: {
      method: 'POST' as const,
      path: '/api/programs',
      input: insertProgramSchema,
      responses: {
        201: z.custom<typeof programs.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
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
    create: {
      method: 'POST' as const,
      path: '/api/courses',
      input: insertCourseSchema,
      responses: {
        201: z.custom<typeof courses.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
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
      input: insertMessageSchema.omit({ senderId: true }),
      responses: {
        201: z.custom<typeof messages.$inferSelect>(),
      },
    },
  },
  enrollments: {
    create: {
      method: 'POST' as const,
      path: '/api/enrollments',
      input: z.object({
        courseId: z.number().optional(),
        programId: z.number().optional(),
      }).refine(data => data.courseId || data.programId, {
        message: "Either courseId or programId is required",
      }),
      responses: {
        201: z.custom<typeof enrollments.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  units: {
    listByCourse: {
      method: 'GET' as const,
      path: '/api/courses/:courseId/units',
      responses: {
        200: z.array(z.custom<typeof courseWeeks.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/units',
      input: z.object({
        courseId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        duration: z.string().optional(),
        status: z.string().optional(),
        weekNumber: z.number().optional(),
      }),
      responses: {
        201: z.custom<typeof courseWeeks.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/units/:id',
      input: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        learningOutcomes: z.string().optional(),
        topicsCovered: z.string().optional(),
        duration: z.string().optional(),
        status: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof courseWeeks.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/units/:id',
      responses: {
        200: z.object({ success: z.boolean() }),
        404: errorSchemas.notFound,
      },
    },
    reorder: {
      method: 'PATCH' as const,
      path: '/api/units/reorder',
      input: z.object({
        courseId: z.number(),
        orders: z.array(z.object({
          id: z.number(),
          weekNumber: z.number(),
        })),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
        400: errorSchemas.validation,
      },
    },
  },
  lessons: {
    listByUnit: {
      method: 'GET' as const,
      path: '/api/units/:unitId/lessons',
      responses: {
        200: z.array(z.custom<typeof courseContent.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/lessons',
      input: z.object({
        weekId: z.number(),
        title: z.string(),
        content: z.string().optional(), // Mapping to contentText usually
        type: z.enum(["video", "reading", "file", "link"]),
        videoUrl: z.string().optional(),
        resources: z.any().optional(),
        duration: z.string().optional(),
        sequenceOrder: z.number().optional(),
      }),
      responses: {
        201: z.custom<typeof courseContent.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/lessons/:id',
      input: z.object({
        title: z.string().optional(),
        content: z.string().optional(),
        type: z.enum(["video", "reading", "file", "link"]).optional(),
        videoUrl: z.string().optional(),
        resources: z.any().optional(),
        duration: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof courseContent.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/lessons/:id',
      responses: {
        200: z.object({ success: z.boolean() }),
        404: errorSchemas.notFound,
      },
    },
    reorder: {
      method: 'PATCH' as const,
      path: '/api/lessons/reorder',
      input: z.object({
        weekId: z.number(),
        orders: z.array(z.object({
          id: z.number(),
          sequenceOrder: z.number(),
        })),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
        400: errorSchemas.validation,
      },
    },
  },
  certificates: {
    list: {
      method: 'GET' as const,
      path: '/api/certificates',
      responses: {
        200: z.array(z.custom<typeof certificates.$inferSelect & { course?: typeof courses.$inferSelect, program?: typeof programs.$inferSelect }>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/certificates/:courseId',
      responses: {
        200: z.custom<typeof certificates.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    download: {
      method: 'GET' as const,
      path: '/api/certificates/download/:certificateId',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    verify: {
      method: 'GET' as const,
      path: '/api/certificates/verify/:code',
      responses: {
        200: z.object({
          valid: z.boolean(),
          userName: z.string().optional(),
          courseTitle: z.string().optional(),
          issuedAt: z.any().optional(),
        }),
        404: z.object({ valid: z.boolean(), message: z.string() }),
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
