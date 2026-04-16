import { pgTable, text, serial, integer, boolean, timestamp, jsonb, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["super_admin", "admin", "student", "tutor"]);
export const contentTypeEnum = pgEnum("content_type", ["video", "reading", "file", "link"]);
export const bookingStatusEnum = pgEnum("booking_status", ["pending", "confirmed", "completed", "cancelled"]);
export const sessionTypeEnum = pgEnum("session_type", ["online", "physical"]);
export const paymentIntentStatusEnum = pgEnum("payment_intent_status", ["initiated", "paid", "failed", "expired"]);
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "approved", "rejected", "not_applied"]);
export const withdrawalStatusEnum = pgEnum("withdrawal_status", ["pending", "approved", "rejected"]);
export const superCategoryEnum = pgEnum("super_category", ["school_tutoring", "higher_education", "professional_skills"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // Hashed
  role: userRoleEnum("role").default("student").notNull(),
  name: text("name").notNull(),
  isVerified: boolean("is_verified").default(false),
  verificationOtp: text("verification_otp"),
  otpExpiresAt: timestamp("otp_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const session = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  slug: text("slug").notNull().unique(),
  price: integer("price_kes").notNull(), // KES
  image: text("image"),
  duration: text("duration"),
  published: boolean("published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  slug: text("slug").notNull().unique(),
  price: integer("price_kes").notNull(), // KES
  programId: integer("program_id").references(() => programs.id),
  learningObjectives: text("learning_objectives"),
  duration: text("duration"),
  status: text("status").default("draft"),
  published: boolean("published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const courseWeeks = pgTable("course_weeks", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => courses.id),
  weekNumber: integer("week_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  learningOutcomes: text("learning_outcomes"),
  topicsCovered: text("topics_covered"),
  duration: text("duration"),
  status: text("status").default("draft"),
});

export const courseContent = pgTable("course_content", {
  id: serial("id").primaryKey(),
  weekId: integer("week_id").notNull().references(() => courseWeeks.id),
  title: text("title").notNull(),
  type: contentTypeEnum("type").notNull(),
  contentUrl: text("content_url"), // For video, file, link
  videoUrl: text("video_url"), // Dedicated video URL
  contentText: text("content_text"), // For reading
  resources: jsonb("resources"), // For attachments
  duration: text("duration"),
  sequenceOrder: integer("sequence_order").notNull(),
});

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  weekId: integer("week_id").notNull().references(() => courseWeeks.id),
  title: text("title").notNull(),
  passScorePercent: integer("pass_score_percent").default(70).notNull(),
  isFinalExam: boolean("is_final_exam").default(false),
  maxRetakes: integer("max_retakes").default(3).notNull(),
  timeLimitMinutes: integer("time_limit_minutes"),
});

export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizzes.id),
  questionText: text("question_text").notNull(),
  options: jsonb("options").notNull(), // Array of strings
  correctOptionIndex: integer("correct_option_index").notNull(),
  explanation: text("explanation"),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizzes.id),
  userId: integer("user_id").notNull().references(() => users.id),
  scorePercent: integer("score_percent").notNull(),
  passed: boolean("passed").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  courseId: integer("course_id").references(() => courses.id),
  programId: integer("program_id").references(() => programs.id),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  progress: integer("progress").default(0),
  // Completion tracking
  status: text("status").default("in_progress"), // 'in_progress' | 'completed'
  completedAt: timestamp("completed_at"),
});

export const completedContent = pgTable("completed_content", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  contentId: integer("content_id").notNull().references(() => courseContent.id),
  completedAt: timestamp("completed_at").defaultNow(),
}, (table) => ({
  // DB-level unique constraint: prevents duplicate rows even under concurrent requests
  userContentUnique: uniqueIndex("cc_user_content_unique").on(table.userId, table.contentId),
}));


export const certificates = pgTable("certificates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  courseId: integer("course_id").references(() => courses.id),
  programId: integer("program_id").references(() => programs.id),
  issuedAt: timestamp("issued_at").defaultNow(),
  code: text("code").notNull().unique(),
  pdfUrl: text("pdf_url"),
});

export const tutorProfiles = pgTable("tutor_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id),
  bio: text("bio").notNull(),
  hourlyRate: integer("hourly_rate_kes").notNull(),
  subjects: jsonb("subjects").notNull(), // Array of strings (legacy, for backwards compat)
  // Per-category verification status
  schoolTutoringStatus: verificationStatusEnum("school_tutoring_status").default("not_applied"),
  higherEducationStatus: verificationStatusEnum("higher_education_status").default("not_applied"),
  professionalSkillsStatus: verificationStatusEnum("professional_skills_status").default("not_applied"),
  // Per-category subjects
  schoolTutoringSubjects: jsonb("school_tutoring_subjects").default([]),
  higherEducationSubjects: jsonb("higher_education_subjects").default([]),
  professionalSkillsSubjects: jsonb("professional_skills_subjects").default([]),
  // Legacy field - kept for backwards compatibility
  verificationStatus: verificationStatusEnum("verification_status").default("pending"),
  earnings: integer("earnings_kes").default(0),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => users.id),
  tutorId: integer("tutor_id").notNull().references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: bookingStatusEnum("status").default("pending"),
  sessionType: sessionTypeEnum("session_type").default("online"),
  location: text("location"),
  pricePaid: integer("price_paid_kes").notNull(),
  meetingLink: text("meeting_link"),
  paystackReference: text("paystack_reference"),
  subject: text("subject"),
  gradeLevel: text("grade_level"),
  topic: text("topic"),
  sessionNotes: text("session_notes"),
});

export const bookingPaymentIntents = pgTable("booking_payment_intents", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => users.id),
  tutorId: integer("tutor_id").notNull().references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  sessionType: sessionTypeEnum("session_type").default("online"),
  location: text("location"), // For physical sessions
  amountKes: integer("amount_kes").notNull(),
  platformFeeKes: integer("platform_fee_kes").notNull(), // 25% platform fee
  tutorShareKes: integer("tutor_share_kes").notNull(), // 75% for tutor
  paystackReference: text("paystack_reference").notNull().unique(),
  status: paymentIntentStatusEnum("status").default("initiated"),
  subject: text("subject"),
  gradeLevel: text("grade_level"),
  topic: text("topic"),
  sessionNotes: text("session_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const enrollmentPaymentIntents = pgTable("enrollment_payment_intents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  courseId: integer("course_id").references(() => courses.id),
  programId: integer("program_id").references(() => programs.id),
  amountKes: integer("amount_kes").notNull(),
  paystackReference: text("paystack_reference").notNull().unique(),
  status: paymentIntentStatusEnum("enrollment_payment_status").default("initiated"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  read: boolean("read").default(false),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const verificationTypeEnum = pgEnum("verification_type", ["school_tutoring", "higher_education", "professional_skills"]);

export const verificationRequests = pgTable("verification_requests", {
  id: serial("id").primaryKey(),
  tutorProfileId: integer("tutor_profile_id").notNull().references(() => tutorProfiles.id),
  verificationType: verificationTypeEnum("verification_type").notNull(),
  documentUrl: text("document_url").notNull(),
  nationalIdUrl: text("national_id_url"),
  additionalNotes: text("additional_notes"),
  feeAmountKes: integer("fee_amount_kes").notNull(),
  paymentReference: text("payment_reference"),
  status: verificationStatusEnum("status").default("pending"),
  reviewNotes: text("review_notes"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const withdrawals = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutor_id").notNull().references(() => users.id),
  amount: integer("amount_kes").notNull(),
  status: withdrawalStatusEnum("status").default("pending"),
  requestedAt: timestamp("requested_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("general"),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  tutorProfile: one(tutorProfiles, { fields: [users.id], references: [tutorProfiles.userId] }),
  enrollments: many(enrollments),
  bookingsAsStudent: many(bookings, { relationName: "studentBookings" }),
  bookingsAsTutor: many(bookings, { relationName: "tutorBookings" }),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
}));

export const tutorProfilesRelations = relations(tutorProfiles, ({ one, many }) => ({
  user: one(users, { fields: [tutorProfiles.userId], references: [users.id] }),
  verificationRequests: many(verificationRequests),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  program: one(programs, { fields: [courses.programId], references: [programs.id] }),
  weeks: many(courseWeeks),
  enrollments: many(enrollments),
}));

export const courseWeeksRelations = relations(courseWeeks, ({ one, many }) => ({
  course: one(courses, { fields: [courseWeeks.courseId], references: [courses.id] }),
  content: many(courseContent),
  quiz: one(quizzes, { fields: [courseWeeks.id], references: [quizzes.weekId] }), // Assuming 1 quiz per week for simplicity, or 1 quiz relation
}));

export const courseContentRelations = relations(courseContent, ({ one }) => ({
  week: one(courseWeeks, { fields: [courseContent.weekId], references: [courseWeeks.id] }),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  week: one(courseWeeks, { fields: [quizzes.weekId], references: [courseWeeks.id] }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertProgramSchema = createInsertSchema(programs).omit({ id: true, createdAt: true, slug: true });
export const insertCourseSchema = createInsertSchema(courses).omit({ id: true, createdAt: true, slug: true });
export const insertWeekSchema = createInsertSchema(courseWeeks).omit({ id: true });
export const insertContentSchema = createInsertSchema(courseContent).omit({ id: true });
export const insertQuizSchema = createInsertSchema(quizzes).omit({ id: true });
export const insertQuestionSchema = createInsertSchema(quizQuestions).omit({ id: true });
export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({ id: true, submittedAt: true });
export const insertTutorProfileSchema = createInsertSchema(tutorProfiles).omit({ 
  id: true, 
  verificationStatus: true, 
  earnings: true,
  schoolTutoringStatus: true,
  higherEducationStatus: true,
  professionalSkillsStatus: true,
});
export const insertBookingSchema = createInsertSchema(bookings, {
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
}).omit({ id: true, studentId: true, status: true, meetingLink: true, paystackReference: true });

export const insertPaymentIntentSchema = createInsertSchema(bookingPaymentIntents, {
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
}).omit({ id: true, createdAt: true, status: true });

export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, read: true, sentAt: true });
export const insertVerificationRequestSchema = createInsertSchema(verificationRequests).omit({ 
  id: true, 
  status: true, 
  reviewNotes: true, 
  reviewedBy: true, 
  submittedAt: true, 
  reviewedAt: true 
});
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, read: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Program = typeof programs.$inferSelect;
export type InsertProgram = z.infer<typeof insertProgramSchema>;
export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type CourseWeek = typeof courseWeeks.$inferSelect;
export type InsertCourseWeek = typeof courseWeeks.$inferInsert;
export type CourseContent = typeof courseContent.$inferSelect;
export type InsertCourseContent = typeof courseContent.$inferInsert;
export type Quiz = typeof quizzes.$inferSelect;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type TutorProfile = typeof tutorProfiles.$inferSelect;
export type InsertTutorProfile = z.infer<typeof insertTutorProfileSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type BookingPaymentIntent = typeof bookingPaymentIntents.$inferSelect;
export type InsertPaymentIntent = z.infer<typeof insertPaymentIntentSchema>;
export type EnrollmentPaymentIntent = typeof enrollmentPaymentIntents.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type VerificationRequest = typeof verificationRequests.$inferSelect;
export type InsertVerificationRequest = z.infer<typeof insertVerificationRequestSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type CompletedContent = typeof completedContent.$inferSelect;
export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = typeof certificates.$inferInsert;
export type SuperCategory = "school_tutoring" | "higher_education" | "professional_skills";
export type VerificationStatus = "pending" | "approved" | "rejected" | "not_applied";

// Request/Response Types
export type LoginRequest = z.infer<typeof insertUserSchema>; // simplified
export type RegisterRequest = z.infer<typeof insertUserSchema> & { role?: "student" | "tutor" };

