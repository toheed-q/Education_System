import { db } from "./db";
import {
  users, programs, courses, courseWeeks, courseContent, completedContent, quizzes, quizQuestions, quizAttempts,
  tutorProfiles, bookings, reviews, messages, enrollments, certificates, verificationRequests, withdrawals,
  bookingPaymentIntents, enrollmentPaymentIntents, notifications,
  type User, type InsertUser, type Program, type Course, type CourseWeek, type CourseContent,
  type Quiz, type QuizQuestion, type QuizAttempt, type TutorProfile, type Booking, type Review, type Message,
  type InsertProgram, type InsertCourse, type InsertTutorProfile, type InsertBooking, type InsertMessage,
  type InsertQuizAttempt, type BookingPaymentIntent, type EnrollmentPaymentIntent, type VerificationRequest, 
  type Notification, type InsertNotification, type InsertCourseWeek, type InsertCourseContent,
  type CompletedContent, type Certificate, type InsertCertificate
} from "@shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import crypto from "crypto";

// ─── Structured Progress Logger ────────────────────────────────────────────────────
/**
 * Emit a consistent, machine-readable log line for all progress events.
 * Format: [PROGRESS][ISO-timestamp][LEVEL] event {json context}
 * Non-throwing — logging must never break the main flow.
 */
export function progressLog(
  level: 'info' | 'warn' | 'error',
  event: string,
  context: Record<string, unknown> = {},
): void {
  try {
    const ts = new Date().toISOString();
    const line = `[PROGRESS][${ts}][${level.toUpperCase()}] ${event} ${JSON.stringify(context)}`;
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  } catch {
    // intentionally silent — logging must not throw
  }
}

import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;

  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserVerification(id: number, isVerified: boolean): Promise<User>;
  setVerificationOtp(userId: number, otp: string, expiresAt: Date): Promise<void>;
  verifyUserOtp(email: string, otp: string): Promise<User | undefined>;
  listUsers(): Promise<User[]>;
  countUsers(): Promise<number>;


  // Programs & Courses
  getPrograms(): Promise<Program[]>;
  getProgramsWithCourseCounts(): Promise<(Program & { courseCount: number })[]>;
  getProgram(id: number): Promise<Program | undefined>;
  getProgramBySlug(slug: string): Promise<Program | undefined>;
  getCoursesByProgram(programId: number): Promise<Course[]>;
  getCourses(): Promise<Course[]>;
  getCourse(id: number): Promise<Course | undefined>;
  getCourseBySlug(slug: string): Promise<Course | undefined>;
  getCourseWeeks(courseId: number): Promise<CourseWeek[]>;
  getWeek(id: number): Promise<CourseWeek | undefined>;
  getWeekContent(weekId: number): Promise<CourseContent[]>;
  getContent(id: number): Promise<CourseContent | undefined>;
  getWeekQuiz(weekId: number): Promise<Quiz | undefined>;

  // Tutors
  getTutors(subject?: string): Promise<(TutorProfile & { user: User })[]>;
  getTutorProfile(id: number): Promise<(TutorProfile & { user: User }) | undefined>;
  createTutorProfile(profile: InsertTutorProfile): Promise<TutorProfile>;

  // Bookings
  createBooking(booking: InsertBooking & { studentId: number }): Promise<Booking>;
  createBookingFromPayment(data: { studentId: number; tutorId: number; startTime: Date; endTime: Date; sessionType: string; location?: string | null; pricePaid: number; paystackReference: string; subject?: string | null; gradeLevel?: string | null; topic?: string | null; sessionNotes?: string | null }): Promise<Booking>;
  getBookingsForUser(userId: number, role: "student" | "tutor"): Promise<(Booking & { tutor?: User, student?: User })[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  updateBookingStatus(id: number, status: "pending" | "confirmed" | "completed" | "cancelled"): Promise<Booking | undefined>;
  updateBookingMeetingLink(id: number, meetingLink: string): Promise<Booking | undefined>;
  
  getBookedSlotsForTutor(tutorId: number): Promise<string[]>;
  getBookedSlotsForStudent(studentId: number): Promise<string[]>;
  
  // Payment Intents
  createPaymentIntent(intent: { studentId: number; tutorId: number; startTime: Date; endTime: Date; sessionType: string; location?: string | null; amountKes: number; platformFeeKes: number; tutorShareKes: number; paystackReference: string; subject?: string | null; gradeLevel?: string | null; topic?: string | null; sessionNotes?: string | null }): Promise<BookingPaymentIntent>;
  getPaymentIntent(paystackReference: string): Promise<BookingPaymentIntent | undefined>;
  markPaymentIntentPaid(paystackReference: string): Promise<BookingPaymentIntent | undefined>;
  
  // Messages
  getMessages(userId1: number, userId2: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesRead(receiverId: number, senderId: number): Promise<void>;
  getConversations(userId: number): Promise<any[]>;

  // Enrollments
  isUserEnrolledInCourse(userId: number, courseId: number): Promise<boolean>;
  createEnrollment(data: { userId: number; courseId?: number; programId?: number }): Promise<any>;
  getUserEnrollments(userId: number): Promise<any[]>;
  getEnrollmentForUser(userId: number, courseId?: number, programId?: number): Promise<any>;

  // Enrollment Payment Intents
  createEnrollmentPaymentIntent(data: { userId: number; courseId?: number; programId?: number; amountKes: number; paystackReference: string }): Promise<EnrollmentPaymentIntent>;
  getEnrollmentPaymentIntent(paystackReference: string): Promise<EnrollmentPaymentIntent | undefined>;
  markEnrollmentPaymentIntentPaid(paystackReference: string): Promise<EnrollmentPaymentIntent | undefined>;

  // Quizzes
  getQuiz(id: number): Promise<Quiz | undefined>;
  getQuizByUnitId(unitId: number): Promise<Quiz | undefined>;
  getQuizQuestions(quizId: number): Promise<QuizQuestion[]>;
  createQuizAttempt(attempt: { quizId: number; userId: number; scorePercent: number; passed: boolean }): Promise<QuizAttempt>;
  getPassedQuizAttempts(userId: number): Promise<QuizAttempt[]>;
  updateQuiz(id: number, data: Partial<{ title: string; passScorePercent: number; maxRetakes: number; isFinalExam: boolean }>): Promise<Quiz | undefined>;
  deleteQuiz(id: number): Promise<boolean>;
  updateQuizQuestion(id: number, data: Partial<{ questionText: string; options: string[]; correctOptionIndex: number; explanation: string }>): Promise<QuizQuestion | undefined>;
  deleteQuizQuestion(id: number): Promise<boolean>;

  // OTP Verification
  setVerificationOtp(userId: number, otp: string, expiresAt: Date): Promise<void>;
  verifyUserOtp(email: string, otp: string): Promise<User | undefined>;

  // Verification Requests
  createVerificationRequest(request: { tutorProfileId: number; verificationType: "school_tutoring" | "higher_education" | "professional_skills"; documentUrl: string; nationalIdUrl?: string; additionalNotes?: string; feeAmountKes: number }): Promise<VerificationRequest>;
  getVerificationRequestsByTutor(tutorProfileId: number): Promise<VerificationRequest[]>;
  getPendingVerificationRequests(): Promise<(VerificationRequest & { tutorProfile: TutorProfile & { user: User } })[]>;
  updateVerificationRequestStatus(id: number, status: "pending" | "approved" | "rejected", reviewedBy: number, reviewNotes?: string): Promise<VerificationRequest | undefined>;
  getTutorProfileByUserId(userId: number): Promise<TutorProfile | undefined>;
  updateTutorVerificationStatus(tutorProfileId: number, status: "pending" | "approved" | "rejected"): Promise<TutorProfile | undefined>;
  updateTutorCategoryStatus(tutorProfileId: number, category: "school_tutoring" | "higher_education" | "professional_skills", status: "pending" | "approved" | "rejected" | "not_applied"): Promise<TutorProfile | undefined>;
  updateTutorCategorySubjects(tutorProfileId: number, category: "school_tutoring" | "higher_education" | "professional_skills", subjects: string[]): Promise<TutorProfile | undefined>;
  updateTutorProfile(tutorProfileId: number, data: Record<string, any>): Promise<TutorProfile | undefined>;

  // Notifications
  getNotifications(userId: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markAllNotificationsRead(userId: number): Promise<void>;

  // Certificates
  getCertificate(id: number): Promise<Certificate | undefined>;
  getCertificateByCode(code: string): Promise<Certificate | undefined>;
  getCertificateForUser(userId: number, courseId?: number, programId?: number): Promise<Certificate | undefined>;
  getCertificatesForUser(userId: number): Promise<(Certificate & { course?: Course, program?: Program })[]>;
  createCertificate(data: InsertCertificate): Promise<Certificate>;

  // Seeding helpers
  countUsers(): Promise<number>;
  listUsers(): Promise<User[]>;
  countPrograms(): Promise<number>;

  createProgram(program: { title: string; description: string; slug: string; price: number; published: boolean }): Promise<Program>;
  createCourse(course: { title: string; description: string; slug: string; price: number; programId?: number; published: boolean }): Promise<Course>;
  
  // Units (Weeks) CRUD
  createWeek(week: InsertCourseWeek): Promise<CourseWeek>;
  updateWeek(id: number, week: Partial<InsertCourseWeek>): Promise<CourseWeek | undefined>;
  deleteWeek(id: number): Promise<boolean>;
  reorderWeeks(courseId: number, orders: { id: number, weekNumber: number }[]): Promise<void>;

  // Content (Lessons) CRUD
  createContent(content: InsertCourseContent): Promise<CourseContent>;
  updateContent(id: number, content: Partial<InsertCourseContent>): Promise<CourseContent | undefined>;
  deleteContent(id: number): Promise<boolean>;
  reorderContent(weekId: number, orders: { id: number, sequenceOrder: number }[]): Promise<void>;

  createQuiz(quiz: { weekId: number; title: string; passScorePercent: number; isFinalExam: boolean; maxRetakes?: number }): Promise<Quiz>;
  createQuizQuestion(question: { quizId: number; questionText: string; options: string[]; correctOptionIndex: number; explanation?: string }): Promise<QuizQuestion>;

  // ─── Completion Tracking ────────────────────────────────────────────────────
  markLessonComplete(userId: number, contentId: number): Promise<void>;
  isLessonCompleted(userId: number, contentId: number): Promise<boolean>;
  getCompletedLessonIds(userId: number): Promise<number[]>;
  getCompletedLessonIdsForUnit(userId: number, unitId: number): Promise<number[]>;
  getBestQuizScore(userId: number, quizId: number): Promise<number | null>;
  checkUnitCompletion(userId: number, unitId: number): Promise<boolean>;
  checkCourseCompletion(userId: number, courseId: number): Promise<boolean>;
  checkProgramCompletion(userId: number, programId: number): Promise<boolean>;
  updateEnrollmentProgress(userId: number, courseId: number): Promise<void>;
  getCourseProgressDetails(userId: number, courseId: number): Promise<any>;
  recalculateAllProgressForUser(userId: number): Promise<{ enrollmentsFixed: number; report: any[] }>;
  getAdminProgressForUser(userId: number): Promise<any>;

  // ─── Admin Analytics ────────────────────────────────────────────────────────
  getProgramAnalytics(): Promise<any[]>;
  getCourseAnalytics(programId: number): Promise<any[]>;
  getQuizAnalytics(programId: number): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUserVerification(id: number, isVerified: boolean): Promise<User> {
    const [updated] = await db.update(users)
      .set({ isVerified })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async listUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async countUsers(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(users);
    return Number(result.count);
  }

  async getPrograms(): Promise<Program[]> {
    return await db.select().from(programs);
  }

  async getProgramsWithCourseCounts(): Promise<(Program & { courseCount: number })[]> {
    const allPrograms = await db.select().from(programs);
    const allCourses = await db.select().from(courses);
    
    return allPrograms.map(program => ({
      ...program,
      courseCount: allCourses.filter(c => c.programId === program.id).length
    }));
  }

  async getProgram(id: number): Promise<Program | undefined> {
    const [program] = await db.select().from(programs).where(eq(programs.id, id));
    return program;
  }

  async getProgramBySlug(slug: string): Promise<Program | undefined> {
    const [program] = await db.select().from(programs).where(eq(programs.slug, slug));
    return program;
  }

  async getCoursesByProgram(programId: number): Promise<Course[]> {
    return await db.select().from(courses).where(eq(courses.programId, programId));
  }

  async getCourses(): Promise<Course[]> {
    return await db.select().from(courses);
  }

  async getCourse(id: number): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  }

  async getCourseBySlug(slug: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.slug, slug));
    return course;
  }

  async getCourseWeeks(courseId: number): Promise<any[]> {
    const weeks = await db.query.courseWeeks.findMany({
      where: eq(courseWeeks.courseId, courseId),
      orderBy: [courseWeeks.weekNumber],
      with: {
        content: {
          orderBy: [courseContent.sequenceOrder],
        },
      },
    });

    return weeks.map(week => {
      const { content, ...rest } = week;
      return {
        ...rest,
        lessons: content || []
      };
    });
  }

  async getWeek(id: number): Promise<CourseWeek | undefined> {
    const [week] = await db.select().from(courseWeeks).where(eq(courseWeeks.id, id));
    return week;
  }

  async getWeekContent(weekId: number): Promise<CourseContent[]> {
    return await db.select().from(courseContent).where(eq(courseContent.weekId, weekId)).orderBy(courseContent.sequenceOrder);
  }

  async getContent(id: number): Promise<CourseContent | undefined> {
    const [content] = await db.select().from(courseContent).where(eq(courseContent.id, id));
    return content;
  }

  async getWeekQuiz(weekId: number): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.weekId, weekId));
    return quiz;
  }

  async getTutors(subject?: string): Promise<(TutorProfile & { user: User })[]> {
    // Basic join, filtering by subject in JS for simplicity with JSONB for now or advanced query later
    const results = await db.select().from(tutorProfiles).innerJoin(users, eq(tutorProfiles.userId, users.id));
    
    const mapped = results.map(r => ({ ...r.tutor_profiles, user: r.users }));
    
    // Visibility logic:
    // - School Tutoring: Must be APPROVED to be visible
    // - Higher Education: Can be visible while pending (not "not_applied")
    // - Professional Skills: Can be visible while pending (not "not_applied")
    // A tutor is visible if they're approved in School OR have applied (pending/approved) in Higher Ed or Professional
    const visible = mapped.filter(t => {
      const schoolApproved = t.schoolTutoringStatus === "approved";
      const higherEdApplied = t.higherEducationStatus !== "not_applied";
      const professionalApplied = t.professionalSkillsStatus !== "not_applied";
      
      // Visible if approved in school, OR if they've applied for higher ed/professional
      return schoolApproved || higherEdApplied || professionalApplied;
    });
    
    if (subject) {
      return visible.filter(t => (t.subjects as string[]).includes(subject));
    }
    return visible;
  }

  async getTutorProfile(id: number): Promise<(TutorProfile & { user: User }) | undefined> {
    const [result] = await db.select()
      .from(tutorProfiles)
      .innerJoin(users, eq(tutorProfiles.userId, users.id))
      .where(eq(tutorProfiles.id, id));
      
    if (!result) return undefined;
    return { ...result.tutor_profiles, user: result.users };
  }

  async createTutorProfile(profile: InsertTutorProfile): Promise<TutorProfile> {
    const [newProfile] = await db.insert(tutorProfiles).values(profile).returning();
    return newProfile;
  }

  async createBooking(booking: InsertBooking & { studentId: number }): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async createBookingFromPayment(data: { studentId: number; tutorId: number; startTime: Date; endTime: Date; sessionType: string; location?: string | null; pricePaid: number; paystackReference: string; subject?: string | null; gradeLevel?: string | null; topic?: string | null; sessionNotes?: string | null }): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values({
      studentId: data.studentId,
      tutorId: data.tutorId,
      startTime: data.startTime,
      endTime: data.endTime,
      sessionType: data.sessionType as "online" | "physical",
      location: data.location,
      pricePaid: data.pricePaid,
      paystackReference: data.paystackReference,
      subject: data.subject,
      gradeLevel: data.gradeLevel,
      topic: data.topic,
      sessionNotes: data.sessionNotes,
    }).returning();
    return newBooking;
  }

  async createPaymentIntent(intent: { studentId: number; tutorId: number; startTime: Date; endTime: Date; sessionType: string; location?: string | null; amountKes: number; platformFeeKes: number; tutorShareKes: number; paystackReference: string; subject?: string | null; gradeLevel?: string | null; topic?: string | null; sessionNotes?: string | null }): Promise<BookingPaymentIntent> {
    const [newIntent] = await db.insert(bookingPaymentIntents).values({
      ...intent,
      sessionType: intent.sessionType as "online" | "physical",
    }).returning();
    return newIntent;
  }

  async getPaymentIntent(paystackReference: string): Promise<BookingPaymentIntent | undefined> {
    const [intent] = await db.select().from(bookingPaymentIntents).where(eq(bookingPaymentIntents.paystackReference, paystackReference));
    return intent;
  }

  async markPaymentIntentPaid(paystackReference: string): Promise<BookingPaymentIntent | undefined> {
    const [updated] = await db.update(bookingPaymentIntents)
      .set({ status: "paid" })
      .where(eq(bookingPaymentIntents.paystackReference, paystackReference))
      .returning();
    return updated;
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async updateBookingStatus(id: number, status: "pending" | "confirmed" | "completed" | "cancelled"): Promise<Booking | undefined> {
    const [updated] = await db.update(bookings)
      .set({ status })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  async updateBookingMeetingLink(id: number, meetingLink: string): Promise<Booking | undefined> {
    const [updated] = await db.update(bookings)
      .set({ meetingLink })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  async getBookedSlotsForTutor(tutorId: number): Promise<string[]> {
    const results = await db.select({ startTime: bookings.startTime })
      .from(bookings)
      .where(and(
        eq(bookings.tutorId, tutorId),
        sql`${bookings.startTime} >= NOW()`,
        sql`${bookings.status} NOT IN ('cancelled')`
      ));
    return results.map(r => r.startTime.toISOString());
  }

  async getBookedSlotsForStudent(studentId: number): Promise<string[]> {
    const results = await db.select({ startTime: bookings.startTime })
      .from(bookings)
      .where(and(
        eq(bookings.studentId, studentId),
        sql`${bookings.startTime} >= NOW()`,
        sql`${bookings.status} NOT IN ('cancelled')`
      ));
    return results.map(r => r.startTime.toISOString());
  }

  async getBookingsForUser(userId: number, role: "student" | "tutor"): Promise<(Booking & { tutor?: User, student?: User })[]> {
    await db.update(bookings)
      .set({ status: "cancelled" })
      .where(and(eq(bookings.status, "pending"), sql`${bookings.startTime} < NOW()`));

    if (role === "student") {
      const results = await db.select()
        .from(bookings)
        .innerJoin(users, eq(bookings.tutorId, users.id))
        .where(eq(bookings.studentId, userId));
      return results.map(r => ({ ...r.bookings, tutor: r.users }));
    } else {
      const results = await db.select()
        .from(bookings)
        .innerJoin(users, eq(bookings.studentId, users.id))
        .where(eq(bookings.tutorId, userId));
      return results.map(r => ({ ...r.bookings, student: r.users }));
    }
  }

  async getMessages(userId1: number, userId2: number): Promise<Message[]> {
    return await db.select().from(messages).where(
      and(
        sql`(${messages.senderId} = ${userId1} AND ${messages.receiverId} = ${userId2}) OR (${messages.senderId} = ${userId2} AND ${messages.receiverId} = ${userId1})`
      )
    ).orderBy(messages.sentAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async markMessagesRead(receiverId: number, senderId: number): Promise<void> {
    await db.execute(sql`
      UPDATE messages SET read = true 
      WHERE sender_id = ${senderId} AND receiver_id = ${receiverId} AND read = false
    `);
  }

  async getConversations(userId: number): Promise<any[]> {
    // Get unique users who have exchanged messages with this user
    const result = await db.execute(sql`
      SELECT DISTINCT 
        CASE WHEN sender_id = ${userId} THEN receiver_id ELSE sender_id END as partner_id
      FROM messages 
      WHERE sender_id = ${userId} OR receiver_id = ${userId}
    `);
    
    const partnerIds = result.rows.map((r: any) => r.partner_id);
    if (partnerIds.length === 0) return [];
    
    // Get user details for each partner
    const partners = await Promise.all(partnerIds.map(async (partnerId: number) => {
      const [partner] = await db.select().from(users).where(eq(users.id, partnerId));
      
      // Get the last message in the conversation
      const [lastMessage] = await db.select().from(messages).where(
        sql`(sender_id = ${userId} AND receiver_id = ${partnerId}) OR (sender_id = ${partnerId} AND receiver_id = ${userId})`
      ).orderBy(sql`sent_at DESC`).limit(1);
      
      // Count unread messages
      const unreadResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM messages 
        WHERE sender_id = ${partnerId} AND receiver_id = ${userId} AND read = false
      `);
      const unreadCount = Number(unreadResult.rows[0]?.count || 0);
      
      return {
        user: partner,
        lastMessage,
        unreadCount
      };
    }));
    
    return partners;
  }

  async isUserEnrolledInCourse(userId: number, courseId: number): Promise<boolean> {
    // Check direct course enrollment
    const [directEnrollment] = await db.select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)));
    
    if (directEnrollment) return true;
    
    // Check if enrolled in a program that contains this course
    const course = await this.getCourse(courseId);
    if (course?.programId) {
      const [programEnrollment] = await db.select()
        .from(enrollments)
        .where(and(eq(enrollments.userId, userId), eq(enrollments.programId, course.programId)));
      if (programEnrollment) return true;
    }
    
    return false;
  }

  async createEnrollment(data: { userId: number; courseId?: number; programId?: number }): Promise<any> {
    const [enrollment] = await db.insert(enrollments).values({
      userId: data.userId,
      courseId: data.courseId,
      programId: data.programId,
    }).returning();
    return enrollment;
  }

  async createEnrollmentPaymentIntent(data: { userId: number; courseId?: number; programId?: number; amountKes: number; paystackReference: string }): Promise<EnrollmentPaymentIntent> {
    const [intent] = await db.insert(enrollmentPaymentIntents).values({
      userId: data.userId,
      courseId: data.courseId,
      programId: data.programId,
      amountKes: data.amountKes,
      paystackReference: data.paystackReference,
    }).returning();
    return intent;
  }

  async getEnrollmentPaymentIntent(paystackReference: string): Promise<EnrollmentPaymentIntent | undefined> {
    const [intent] = await db.select().from(enrollmentPaymentIntents)
      .where(eq(enrollmentPaymentIntents.paystackReference, paystackReference));
    return intent;
  }

  async markEnrollmentPaymentIntentPaid(paystackReference: string): Promise<EnrollmentPaymentIntent | undefined> {
    const [updated] = await db.update(enrollmentPaymentIntents)
      .set({ status: "paid" })
      .where(eq(enrollmentPaymentIntents.paystackReference, paystackReference))
      .returning();
    return updated;
  }

  async getUserEnrollments(userId: number): Promise<any[]> {
    const userEnrollments = await db.select().from(enrollments)
      .where(eq(enrollments.userId, userId))
      .orderBy(desc(enrollments.enrolledAt));
    
    const result = [];
    for (const enrollment of userEnrollments) {
      let course = null;
      let program = null;
      if (enrollment.courseId) {
        const [c] = await db.select().from(courses).where(eq(courses.id, enrollment.courseId));
        course = c || null;
      }
      if (enrollment.programId) {
        const [p] = await db.select().from(programs).where(eq(programs.id, enrollment.programId));
        program = p || null;
      }
      result.push({ ...enrollment, course, program });
    }
    return result;
  }

  async getEnrollmentForUser(userId: number, courseId?: number, programId?: number): Promise<any> {
    if (courseId) {
      const [enrollment] = await db.select()
        .from(enrollments)
        .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)));
      return enrollment;
    }
    if (programId) {
      const [enrollment] = await db.select()
        .from(enrollments)
        .where(and(eq(enrollments.userId, userId), eq(enrollments.programId, programId)));
      return enrollment;
    }
    return null;
  }

  async getQuiz(id: number): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz;
  }

  async getQuizByUnitId(unitId: number): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.weekId, unitId));
    return quiz;
  }

  async getQuizQuestions(quizId: number): Promise<QuizQuestion[]> {
    return await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId));
  }

  async updateQuiz(id: number, data: Partial<{ title: string; passScorePercent: number; maxRetakes: number; isFinalExam: boolean }>): Promise<Quiz | undefined> {
    const [updated] = await db.update(quizzes).set(data).where(eq(quizzes.id, id)).returning();
    return updated;
  }

  async deleteQuiz(id: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      await tx.delete(quizAttempts).where(eq(quizAttempts.quizId, id));
      await tx.delete(quizQuestions).where(eq(quizQuestions.quizId, id));
      const [deleted] = await tx.delete(quizzes).where(eq(quizzes.id, id)).returning();
      return !!deleted;
    });
  }

  async updateQuizQuestion(id: number, data: Partial<{ questionText: string; options: string[]; correctOptionIndex: number; explanation: string }>): Promise<QuizQuestion | undefined> {
    const [updated] = await db.update(quizQuestions).set(data).where(eq(quizQuestions.id, id)).returning();
    return updated;
  }

  async deleteQuizQuestion(id: number): Promise<boolean> {
    const [deleted] = await db.delete(quizQuestions).where(eq(quizQuestions.id, id)).returning();
    return !!deleted;
  }

  async createQuizAttempt(attempt: { quizId: number; userId: number; scorePercent: number; passed: boolean }): Promise<QuizAttempt> {
    const [newAttempt] = await db.insert(quizAttempts).values(attempt).returning();

    // Trigger progressive recalculation cascade
    try {
      const quiz = await this.getQuiz(attempt.quizId);
      if (quiz) {
        const [unit] = await db.select().from(courseWeeks).where(eq(courseWeeks.id, quiz.weekId));
        if (unit) {
          await this.updateEnrollmentProgress(attempt.userId, unit.courseId);
        }
      }
    } catch (err) {
      // Log but don't fail the attempt record
      console.error("[storage] Failed to cascade progress after quiz attempt:", err);
    }

    return newAttempt;
  }

  async getPassedQuizAttempts(userId: number): Promise<QuizAttempt[]> {
    return await db.select().from(quizAttempts)
      .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.passed, true)));
  }

  async createVerificationRequest(request: { tutorProfileId: number; verificationType: "school_tutoring" | "higher_education" | "professional_skills"; documentUrl: string; nationalIdUrl?: string; additionalNotes?: string; feeAmountKes: number }): Promise<VerificationRequest> {
    const [newRequest] = await db.insert(verificationRequests).values(request).returning();
    return newRequest;
  }

  async getVerificationRequestsByTutor(tutorProfileId: number): Promise<VerificationRequest[]> {
    return await db.select().from(verificationRequests)
      .where(eq(verificationRequests.tutorProfileId, tutorProfileId))
      .orderBy(desc(verificationRequests.submittedAt));
  }

  async getPendingVerificationRequests(): Promise<(VerificationRequest & { tutorProfile: TutorProfile & { user: User } })[]> {
    const results = await db.select()
      .from(verificationRequests)
      .innerJoin(tutorProfiles, eq(verificationRequests.tutorProfileId, tutorProfiles.id))
      .innerJoin(users, eq(tutorProfiles.userId, users.id))
      .where(eq(verificationRequests.status, "pending"))
      .orderBy(desc(verificationRequests.submittedAt));
    
    return results.map(r => ({
      ...r.verification_requests,
      tutorProfile: { ...r.tutor_profiles, user: r.users }
    }));
  }

  async updateVerificationRequestStatus(id: number, status: "pending" | "approved" | "rejected", reviewedBy: number, reviewNotes?: string): Promise<VerificationRequest | undefined> {
    const [updated] = await db.update(verificationRequests)
      .set({ status, reviewedBy, reviewNotes, reviewedAt: new Date() })
      .where(eq(verificationRequests.id, id))
      .returning();
    return updated;
  }

  async getTutorProfileByUserId(userId: number): Promise<TutorProfile | undefined> {
    const [profile] = await db.select().from(tutorProfiles).where(eq(tutorProfiles.userId, userId));
    return profile;
  }

  async updateTutorVerificationStatus(tutorProfileId: number, status: "pending" | "approved" | "rejected"): Promise<TutorProfile | undefined> {
    const [updated] = await db.update(tutorProfiles)
      .set({ verificationStatus: status })
      .where(eq(tutorProfiles.id, tutorProfileId))
      .returning();
    return updated;
  }

  async updateTutorCategoryStatus(tutorProfileId: number, category: "school_tutoring" | "higher_education" | "professional_skills", status: "pending" | "approved" | "rejected" | "not_applied"): Promise<TutorProfile | undefined> {
    const updateData: Record<string, string> = {};
    
    if (category === "school_tutoring") {
      updateData.schoolTutoringStatus = status;
    } else if (category === "higher_education") {
      updateData.higherEducationStatus = status;
    } else if (category === "professional_skills") {
      updateData.professionalSkillsStatus = status;
    }
    
    const [updated] = await db.update(tutorProfiles)
      .set(updateData)
      .where(eq(tutorProfiles.id, tutorProfileId))
      .returning();
    return updated;
  }

  async updateTutorCategorySubjects(tutorProfileId: number, category: "school_tutoring" | "higher_education" | "professional_skills", subjects: string[]): Promise<TutorProfile | undefined> {
    const updateData: Record<string, string[]> = {};
    
    if (category === "school_tutoring") {
      updateData.schoolTutoringSubjects = subjects;
    } else if (category === "higher_education") {
      updateData.higherEducationSubjects = subjects;
    } else if (category === "professional_skills") {
      updateData.professionalSkillsSubjects = subjects;
    }
    
    const [updated] = await db.update(tutorProfiles)
      .set(updateData)
      .where(eq(tutorProfiles.id, tutorProfileId))
      .returning();
    return updated;
  }

  async updateTutorProfile(tutorProfileId: number, data: Record<string, any>): Promise<TutorProfile | undefined> {
    const [updated] = await db.update(tutorProfiles)
      .set(data)
      .where(eq(tutorProfiles.id, tutorProfileId))
      .returning();
    return updated;
  }

  async countUsers(): Promise<number> {
    const [count] = await db.select({ count: sql<number>`count(*)` }).from(users);
    return Number(count.count);
  }

  async countPrograms(): Promise<number> {
    const [count] = await db.select({ count: sql<number>`count(*)` }).from(programs);
    return Number(count.count);
  }

  async createProgram(program: { title: string; description: string; slug: string; price: number; published: boolean }): Promise<Program> {
    const [newProgram] = await db.insert(programs).values(program).returning();
    return newProgram;
  }

  async createCourse(course: { title: string; description: string; slug: string; price: number; programId?: number; published: boolean }): Promise<Course> {
    const [newCourse] = await db.insert(courses).values(course).returning();
    return newCourse;
  }

  async createWeek(week: InsertCourseWeek): Promise<CourseWeek> {
    let weekNumber = week.weekNumber;
    
    // Auto-ordering logic
    if (weekNumber === undefined || weekNumber === null) {
      const [maxWeek] = await db.select({ max: sql<number>`max(${courseWeeks.weekNumber})` })
        .from(courseWeeks)
        .where(eq(courseWeeks.courseId, week.courseId));
      weekNumber = (maxWeek?.max || 0) + 1;
    }

    const [newWeek] = await db.insert(courseWeeks).values({ ...week, weekNumber }).returning();
    return newWeek;
  }

  async updateWeek(id: number, data: Partial<InsertCourseWeek>): Promise<CourseWeek | undefined> {
    const [updated] = await db.update(courseWeeks)
      .set(data)
      .where(eq(courseWeeks.id, id))
      .returning();
    return updated;
  }

  async deleteWeek(id: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // 1. Cascade Delete: Content
      await tx.delete(courseContent).where(eq(courseContent.weekId, id));
      
      // 2. Cascade Delete: Quizzes (and their attempts/questions)
      const weekQuizzes = await tx.select().from(quizzes).where(eq(quizzes.weekId, id));
      for (const quiz of weekQuizzes) {
        await tx.delete(quizAttempts).where(eq(quizAttempts.quizId, quiz.id));
        await tx.delete(quizQuestions).where(eq(quizQuestions.quizId, quiz.id));
        await tx.delete(quizzes).where(eq(quizzes.id, quiz.id));
      }

      // 3. Delete the week itself
      const [deleted] = await tx.delete(courseWeeks).where(eq(courseWeeks.id, id)).returning();
      return !!deleted;
    });
  }

  async reorderWeeks(courseId: number, orders: { id: number, weekNumber: number }[]): Promise<void> {
    // 1. Validation: No duplicate IDs
    const ids = orders.map(o => o.id);
    if (new Set(ids).size !== ids.length) throw new Error("Duplicate unit IDs in reorder request");

    // 2. Transact and Update
    await db.transaction(async (tx) => {
      for (const item of orders) {
        // Ownership validation is built into the where clause
        await tx.update(courseWeeks)
          .set({ weekNumber: item.weekNumber })
          .where(and(eq(courseWeeks.id, item.id), eq(courseWeeks.courseId, courseId)));
      }
    });
  }

  async createContent(content: InsertCourseContent): Promise<CourseContent> {
    let sequenceOrder = content.sequenceOrder;

    // Auto-ordering logic
    if (sequenceOrder === undefined || sequenceOrder === null) {
      const [maxOrder] = await db.select({ max: sql<number>`max(${courseContent.sequenceOrder})` })
        .from(courseContent)
        .where(eq(courseContent.weekId, content.weekId));
      sequenceOrder = (maxOrder?.max || 0) + 1;
    }

    const [newContent] = await db.insert(courseContent).values({ ...content, sequenceOrder }).returning();
    return newContent;
  }

  async updateContent(id: number, data: Partial<InsertCourseContent>): Promise<CourseContent | undefined> {
    const [updated] = await db.update(courseContent)
      .set(data)
      .where(eq(courseContent.id, id))
      .returning();
    return updated;
  }

  async deleteContent(id: number): Promise<boolean> {
    const [deleted] = await db.delete(courseContent).where(eq(courseContent.id, id)).returning();
    return !!deleted;
  }

  async reorderContent(weekId: number, orders: { id: number, sequenceOrder: number }[]): Promise<void> {
    // 1. Validation: No duplicate IDs
    const ids = orders.map(o => o.id);
    if (new Set(ids).size !== ids.length) throw new Error("Duplicate lesson IDs in reorder request");

    // 2. Transact and Update
    await db.transaction(async (tx) => {
      for (const item of orders) {
        await tx.update(courseContent)
          .set({ sequenceOrder: item.sequenceOrder })
          .where(and(eq(courseContent.id, item.id), eq(courseContent.weekId, weekId)));
      }
    });
  }

  async createQuiz(quiz: { weekId: number; title: string; passScorePercent: number; isFinalExam: boolean; maxRetakes?: number }): Promise<Quiz> {
    const [newQuiz] = await db.insert(quizzes).values(quiz).returning();
    return newQuiz;
  }

  async createQuizQuestion(question: { quizId: number; questionText: string; options: string[]; correctOptionIndex: number; explanation?: string }): Promise<QuizQuestion> {
    const [newQuestion] = await db.insert(quizQuestions).values(question).returning();
    return newQuestion;
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return Number(result.count);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  }

  async setVerificationOtp(userId: number, otp: string, expiresAt: Date): Promise<void> {
    await db.update(users)
      .set({ verificationOtp: otp, otpExpiresAt: expiresAt })
      .where(eq(users.id, userId));
  }

  async verifyUserOtp(email: string, otp: string): Promise<User | undefined> {
    const trimmedEmail = email.toLowerCase().trim();
    console.log(`[AUTH] Verifying OTP for: ${trimmedEmail} (OTP received: "${otp}")`);
    
    const [user] = await db.select().from(users).where(eq(users.email, trimmedEmail)).limit(1);
    
    if (!user) {
      console.warn(`[AUTH] Verification failed: User ${trimmedEmail} not found`);
      return undefined;
    }

    console.log(`[AUTH] User found. Stored OTP: "${user.verificationOtp}", Expires: ${user.otpExpiresAt}`);
    
    if (user.verificationOtp !== otp) {
      console.warn(`[AUTH] Verification failed: OTP mismatch for ${trimmedEmail}`);
      return undefined;
    }
    
    if (!user.otpExpiresAt) {
      console.warn(`[AUTH] Verification failed: No expiration time set for ${trimmedEmail}`);
      return undefined;
    }

    // Add 1-minute buffer (grace period) for clock skews
    const now = new Date();
    const isExpired = now > new Date(user.otpExpiresAt.getTime() + 60 * 1000);
    
    if (isExpired) {
      console.warn(`[AUTH] Verification failed: OTP expired for ${trimmedEmail} (Now: ${now}, Expired: ${user.otpExpiresAt})`);
      return undefined;
    }
    
    console.log(`[AUTH] OTP verified successfully for ${trimmedEmail}. Updating user status...`);
    
    // Clear OTP and verify user
    const [updatedUser] = await db.update(users)
      .set({ 
        isVerified: true, 
        verificationOtp: null, 
        otpExpiresAt: null 
      })
      .where(eq(users.id, user.id))
      .returning();
      
    return updatedUser;
  }

  // ─── Completion Tracking Implementations ───────────────────────────────────

  /**
   * Idempotently marks a lesson as complete.
   * Uses INSERT ... ON CONFLICT DO NOTHING for atomic, race-safe operation.
   * Eliminates the SELECT round-trip and prevents duplicate rows even under
   * concurrent requests.
   */
  async markLessonComplete(userId: number, contentId: number): Promise<void> {
    await db
      .insert(completedContent)
      .values({ userId, contentId })
      .onConflictDoNothing();

    // Trigger progressive recalculation cascade
    try {
      const [content] = await db.select().from(courseContent).where(eq(courseContent.id, contentId));
      if (content) {
        const [unit] = await db.select().from(courseWeeks).where(eq(courseWeeks.id, content.weekId));
        if (unit) {
          await this.updateEnrollmentProgress(userId, unit.courseId);
        }
      }
    } catch (err) {
      console.error("[storage] Failed to cascade progress after lesson completion:", err);
    }
  }

  async isLessonCompleted(userId: number, contentId: number): Promise<boolean> {
    const [existing] = await db.select()
      .from(completedContent)
      .where(and(eq(completedContent.userId, userId), eq(completedContent.contentId, contentId)));
    return !!existing;
  }

  /** Returns all content IDs the user has marked as complete across all courses. */
  async getCompletedLessonIds(userId: number): Promise<number[]> {
    const results = await db
      .select({ contentId: completedContent.contentId })
      .from(completedContent)
      .where(eq(completedContent.userId, userId));
    return results.map(r => r.contentId);
  }

  /**
   * Returns completed lesson IDs scoped to a single unit.
   * More efficient than getCompletedLessonIds — does NOT load all global completions.
   * Uses an IN-filter against only the lesson IDs belonging to the unit.
   */
  async getCompletedLessonIdsForUnit(userId: number, unitId: number): Promise<number[]> {
    const lessonsInUnit = await db
      .select({ id: courseContent.id })
      .from(courseContent)
      .where(eq(courseContent.weekId, unitId));

    if (lessonsInUnit.length === 0) return [];

    const lessonIds = lessonsInUnit.map(l => l.id);
    const completed = await db
      .select({ contentId: completedContent.contentId })
      .from(completedContent)
      .where(and(
        eq(completedContent.userId, userId),
        inArray(completedContent.contentId, lessonIds),
      ));
    return completed.map(c => c.contentId);
  }

  /**
   * Returns the user's best (highest) score for a given quiz.
   * Returns null if the user has never attempted the quiz.
   */
  async getBestQuizScore(userId: number, quizId: number): Promise<number | null> {
    const results = await db
      .select({ score: quizAttempts.scorePercent })
      .from(quizAttempts)
      .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizId)))
      .orderBy(desc(quizAttempts.scorePercent))
      .limit(1);
    if (results.length === 0) return null;
    return results[0].score;
  }

  /**
   * Unit complete = ALL lessons done + quiz passed (if quiz exists).
   * Uses a scoped IN-query for lessons — avoids loading all global completions.
   * Edge cases: empty unit → true; unit without quiz → lessons only.
   */
  async checkUnitCompletion(userId: number, unitId: number): Promise<boolean> {
    // ── Lesson check (scoped to this unit) ───────────────────────────────────────
    const lessons = await db
      .select()
      .from(courseContent)
      .where(eq(courseContent.weekId, unitId));

    if (lessons.length > 0) {
      const lessonIds = lessons.map(l => l.id);
      const completedRows = await db
        .select({ contentId: completedContent.contentId })
        .from(completedContent)
        .where(and(
          eq(completedContent.userId, userId),
          inArray(completedContent.contentId, lessonIds),
        ));
      // Integrity: every lesson must appear in completed_content
      if (completedRows.length < lessons.length) return false;
    }

    // ── Quiz check (skip if no quiz on this unit) ──────────────────────────────
    const quiz = await this.getWeekQuiz(unitId);
    if (quiz) {
      const bestScore = await this.getBestQuizScore(userId, quiz.id);
      if (bestScore === null || bestScore < quiz.passScorePercent) return false;
    }

    return true;
  }

  /**
   * Course complete = ALL units complete.
   * Final exam (isFinalExam quiz) is automatically included via unit completion.
   */
  async checkCourseCompletion(userId: number, courseId: number): Promise<boolean> {
    const units = await db
      .select()
      .from(courseWeeks)
      .where(eq(courseWeeks.courseId, courseId));

    if (units.length === 0) return false; // No units → not complete

    for (const unit of units) {
      const done = await this.checkUnitCompletion(userId, unit.id);
      if (!done) return false;
    }
    return true;
  }

  /**
   * Program complete = ALL courses in the program complete.
   */
  async checkProgramCompletion(userId: number, programId: number): Promise<boolean> {
    const programCourses = await db
      .select()
      .from(courses)
      .where(eq(courses.programId, programId));

    if (programCourses.length === 0) return false;

    for (const course of programCourses) {
      const done = await this.checkCourseCompletion(userId, course.id);
      if (!done) return false;
    }
    return true;
  }

  /**
   * Recalculates and persists enrollment progress % and status.
   * Each cascade step has its own try/catch with structured logging.
   * Course enrollment failure re-throws (critical). Program cascade is non-fatal.
   */
  async updateEnrollmentProgress(userId: number, courseId: number): Promise<void> {
    const startMs = Date.now();
    progressLog('info', 'cascade_start', { userId, courseId });

    const units = await db
      .select()
      .from(courseWeeks)
      .where(eq(courseWeeks.courseId, courseId));

    if (units.length === 0) {
      progressLog('warn', 'cascade_no_units', { userId, courseId });
      return;
    }

    // ── Evaluate each unit ─────────────────────────────────────────────────────────────
    let completedUnits = 0;
    for (const unit of units) {
      try {
        const done = await this.checkUnitCompletion(userId, unit.id);
        if (done) completedUnits++;
        progressLog('info', 'unit_checked', { userId, unitId: unit.id, complete: done });
      } catch (unitErr) {
        progressLog('error', 'unit_check_failed', {
          userId, unitId: unit.id,
          error: (unitErr as Error).message,
        });
        // Count the unit as incomplete — conservative, does not throw
      }
    }

    const progressPercent = Math.round((completedUnits / units.length) * 100);
    const isCourseComplete = completedUnits === units.length;

    // ── Update direct course enrollment (critical — rethrows on failure) ────────
    try {
      const [directEnrollment] = await db
        .select()
        .from(enrollments)
        .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)));

      if (directEnrollment) {
        const updateData: Record<string, any> = {
          progress: progressPercent,
          status: isCourseComplete ? 'completed' : 'in_progress',
        };
        if (isCourseComplete && !directEnrollment.completedAt) {
          updateData.completedAt = new Date();
        }
        await db.update(enrollments)
          .set(updateData)
          .where(eq(enrollments.id, directEnrollment.id));
        
        // ── Automatic Certificate Generation ──────────────────────────────────────
        if (isCourseComplete) {
          try {
            const existingCert = await this.getCertificateForUser(userId, courseId);
            if (!existingCert) {
              await this.createCertificate({
                userId,
                courseId,
                issuedAt: new Date(),
              });
              progressLog('info', 'certificate_auto_generated', { userId, courseId });
            }
          } catch (certErr) {
            progressLog('error', 'certificate_auto_generation_failed', {
              userId, courseId, error: (certErr as Error).message,
            });
          }
        }

        progressLog('info', 'course_enrollment_updated', {
          userId, courseId,
          progress: progressPercent,
          status: updateData.status,
          durationMs: Date.now() - startMs,
        });
      }
    } catch (courseErr) {
      progressLog('error', 'course_enrollment_update_failed', {
        userId, courseId, error: (courseErr as Error).message,
      });
      throw courseErr; // Critical path: rethrow so the route can return 500
    }

    // ── Update parent program enrollment (non-fatal) ───────────────────────────
    try {
      const course = await this.getCourse(courseId);
      if (course?.programId) {
        const [programEnrollment] = await db
          .select()
          .from(enrollments)
          .where(and(eq(enrollments.userId, userId), eq(enrollments.programId, course.programId)));

        if (programEnrollment) {
          const programCourses = await db
            .select()
            .from(courses)
            .where(eq(courses.programId, course.programId));

          let completedCourses = 0;
          for (const c of programCourses) {
            const done = await this.checkCourseCompletion(userId, c.id);
            if (done) completedCourses++;
          }

          const programProgress = Math.round((completedCourses / programCourses.length) * 100);
          const isProgramComplete = completedCourses === programCourses.length;

          const programUpdateData: Record<string, any> = {
            progress: programProgress,
            status: isProgramComplete ? 'completed' : 'in_progress',
          };
          if (isProgramComplete && !programEnrollment.completedAt) {
            programUpdateData.completedAt = new Date();
          }
          await db.update(enrollments)
            .set(programUpdateData)
            .where(eq(enrollments.id, programEnrollment.id));
          progressLog('info', 'program_enrollment_updated', {
            userId, programId: course.programId,
            progress: programProgress,
            status: programUpdateData.status,
          });
        }
      }
    } catch (programErr) {
      // Non-fatal: course is already persisted; log and continue
      progressLog('error', 'program_enrollment_update_failed', {
        userId, courseId, error: (programErr as Error).message,
      });
    }

    progressLog('info', 'cascade_complete', {
      userId, courseId, completedUnits, totalUnits: units.length,
      progressPercent, durationMs: Date.now() - startMs,
    });
  }

  /**
   * Returns a detailed progress breakdown for a course:
   * units, lesson counts, quiz scores, overall % and status.
   */
  async getCourseProgressDetails(userId: number, courseId: number): Promise<any> {
    const units = await db
      .select()
      .from(courseWeeks)
      .where(eq(courseWeeks.courseId, courseId))
      .orderBy(courseWeeks.weekNumber);

    const completedIds = await this.getCompletedLessonIds(userId);
    const completedSet = new Set(completedIds);

    const unitDetails = await Promise.all(units.map(async (unit) => {
      const lessons = await db
        .select()
        .from(courseContent)
        .where(eq(courseContent.weekId, unit.id))
        .orderBy(courseContent.sequenceOrder);

      const quiz = await this.getWeekQuiz(unit.id);
      let quizPassed = false;
      let bestScore: number | null = null;

      if (quiz) {
        bestScore = await this.getBestQuizScore(userId, quiz.id);
        quizPassed = bestScore !== null && bestScore >= quiz.passScorePercent;
      }

      const isComplete = await this.checkUnitCompletion(userId, unit.id);

      return {
        unitId: unit.id,
        unitTitle: unit.title,
        weekNumber: unit.weekNumber,
        totalLessons: lessons.length,
        completedLessons: lessons.filter(l => completedSet.has(l.id)).length,
        lessons: lessons.map(l => ({
          id: l.id,
          title: l.title,
          type: l.type,
          completed: completedSet.has(l.id)
        })),
        hasQuiz: !!quiz,
        quizPassScore: quiz?.passScorePercent ?? null,
        quizPassed,
        bestScore,
        isComplete,
      };
    }));

    const completedUnits = unitDetails.filter(u => u.isComplete).length;
    const totalUnits = units.length;
    const progressPercent = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;
    const courseComplete = totalUnits > 0 && completedUnits === totalUnits;

    return {
      courseId,
      totalUnits,
      completedUnits,
      progress: progressPercent,
      status: courseComplete ? 'completed' : 'in_progress',
      units: unitDetails,
    };
  }

  /**
   * Re-sync endpoint implementation.
   * Iterates every course enrollment for the user and forces a full recalculation.
   * Returns a before/after report for auditing.
   * Should only be called by admins via POST /api/progress/recalculate/:userId.
   */
  async recalculateAllProgressForUser(
    userId: number,
  ): Promise<{ enrollmentsFixed: number; report: any[] }> {
    progressLog('info', 'recalculate_start', { userId });

    // Snapshot before
    const userEnrollments = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.userId, userId));

    const report: any[] = [];
    let enrollmentsFixed = 0;

    for (const enrollment of userEnrollments) {
      // Only process direct course enrollments (program enrollments cascade from these)
      if (!enrollment.courseId) continue;

      const before = {
        enrollmentId: enrollment.id,
        courseId: enrollment.courseId,
        progress: enrollment.progress,
        status: enrollment.status,
      };

      try {
        await this.updateEnrollmentProgress(userId, enrollment.courseId);

        // Fetch updated state
        const [updated] = await db
          .select()
          .from(enrollments)
          .where(eq(enrollments.id, enrollment.id));

        const after = {
          enrollmentId: enrollment.id,
          courseId: enrollment.courseId,
          progress: updated?.progress ?? before.progress,
          status: updated?.status ?? before.status,
        };

        const changed = before.progress !== after.progress || before.status !== after.status;
        if (changed) enrollmentsFixed++;

        report.push({ before, after, changed });
        progressLog('info', 'recalculate_enrollment_done', { userId, ...after, changed });
      } catch (err) {
        progressLog('error', 'recalculate_enrollment_failed', {
          userId, courseId: enrollment.courseId, error: (err as Error).message,
        });
        report.push({ before, after: null, error: (err as Error).message });
      }
    }

    progressLog('info', 'recalculate_complete', { userId, enrollmentsFixed, total: report.length });
    return { enrollmentsFixed, report };
  }

  /**
   * Returns a full hierarchical progress breakdown for admin inspection.
   * Covers all enrollments (both direct-course and program-level).
   */
  async getAdminProgressForUser(userId: number): Promise<any> {
    const userEnrollments = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.userId, userId));

    const directCourseEnrollments = userEnrollments.filter(e => e.courseId && !e.programId);
    const programEnrollments      = userEnrollments.filter(e => e.programId);

    // ── Direct course enrollments ──────────────────────────────────────────────────
    const courseBreakdowns = await Promise.all(
      directCourseEnrollments.map(async (enrollment) => {
        const details = await this.getCourseProgressDetails(userId, enrollment.courseId!);
        return {
          enrollmentId: enrollment.id,
          enrolledAt: enrollment.enrolledAt,
          completedAt: enrollment.completedAt,
          ...details,
        };
      }),
    );

    // ── Program enrollments (with per-course drill-down) ──────────────────────────
    const programBreakdowns = await Promise.all(
      programEnrollments.map(async (enrollment) => {
        const programCourses = await db
          .select()
          .from(courses)
          .where(eq(courses.programId, enrollment.programId!));

        const courseDetails = await Promise.all(
          programCourses.map(c => this.getCourseProgressDetails(userId, c.id)),
        );

        return {
          enrollmentId: enrollment.id,
          programId: enrollment.programId,
          enrolledAt: enrollment.enrolledAt,
          completedAt: enrollment.completedAt,
          progress: enrollment.progress,
          status: enrollment.status,
          courses: courseDetails,
        };
      }),
    );

    return {
      userId,
      generatedAt: new Date().toISOString(),
      directCourses: courseBreakdowns,
      programs: programBreakdowns,
    };
  }

  // ─── Admin Analytics ────────────────────────────────────────────────────────

  /**
   * Returns per-program enrollment stats + completion rates.
   * All aggregation done in SQL — no per-user loops.
   * Two queries total: one for program enrollments, one for course enrollments.
   */
  async getProgramAnalytics(): Promise<any[]> {
    // 1. Program-level enrollments + course-level enrollments grouped by program
    const programStats = await db.execute(sql`
      SELECT
        p.id            AS program_id,
        p.title         AS program_title,
        -- direct program enrollments
        COUNT(DISTINCT ep.id)                                              AS prog_enroll,
        COUNT(DISTINCT ep.id) FILTER (WHERE ep.status = 'completed')      AS prog_completed,
        COUNT(DISTINCT ep.id) FILTER (WHERE ep.status = 'in_progress')    AS prog_active,
        COALESCE(AVG(ep.progress) FILTER (WHERE ep.id IS NOT NULL), 0)    AS prog_avg,
        -- course-level enrollments for courses in this program
        COUNT(DISTINCT ec.id)                                              AS course_enroll,
        COUNT(DISTINCT ec.id) FILTER (WHERE ec.status = 'completed')      AS course_completed,
        COUNT(DISTINCT ec.id) FILTER (WHERE ec.status = 'in_progress')    AS course_active,
        COALESCE(AVG(ec.progress) FILTER (WHERE ec.id IS NOT NULL), 0)    AS course_avg
      FROM programs p
      LEFT JOIN enrollments ep ON ep.program_id = p.id
      LEFT JOIN courses c      ON c.program_id  = p.id
      LEFT JOIN enrollments ec ON ec.course_id  = c.id
      GROUP BY p.id, p.title
      ORDER BY p.title
    `);

    // 2. Standalone course enrollments (courses with NO program)
    const standaloneStats = await db.execute(sql`
      SELECT
        COUNT(e.id)                                              AS total_users,
        COUNT(e.id) FILTER (WHERE e.status = 'completed')       AS completed_users,
        COUNT(e.id) FILTER (WHERE e.status = 'in_progress')     AS active_users,
        COALESCE(AVG(e.progress), 0)::int                       AS avg_progress
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE c.program_id IS NULL
        AND e.course_id IS NOT NULL
    `);

    const results: any[] = (programStats.rows as any[]).map((row) => {
      const totalUsers     = Number(row.prog_enroll)    + Number(row.course_enroll);
      const completedUsers = Number(row.prog_completed) + Number(row.course_completed);
      const activeUsers    = Number(row.prog_active)    + Number(row.course_active);
      const completionRate = totalUsers > 0 ? Math.round((completedUsers / totalUsers) * 100) : 0;
      const avgProgress    = totalUsers > 0
        ? Math.round(
            (Number(row.prog_avg) * Number(row.prog_enroll) +
             Number(row.course_avg) * Number(row.course_enroll)) / totalUsers
          )
        : 0;
      return {
        programId:    Number(row.program_id),
        programTitle: row.program_title,
        isStandalone: false,
        totalUsers,
        completedUsers,
        activeUsers,
        completionRate,
        avgProgress,
      };
    });

    // Add standalone entry only if there are standalone enrollments
    const sr = (standaloneStats.rows as any[])[0];
    const standaloneTotal = Number(sr?.total_users || 0);
    if (standaloneTotal > 0) {
      results.push({
        programId:    -1,
        programTitle: 'Standalone Courses',
        isStandalone: true,
        totalUsers:     standaloneTotal,
        completedUsers: Number(sr.completed_users),
        activeUsers:    Number(sr.active_users),
        completionRate: Math.round((Number(sr.completed_users) / standaloneTotal) * 100),
        avgProgress:    Number(sr.avg_progress),
      });
    }

    return results;
  }

  /**
   * Returns per-course breakdown for a given program.
   * Single SQL query — no N+1.
   */
  async getCourseAnalytics(programId: number): Promise<any[]> {
    // programId = -1 means standalone courses (no program)
    const rows = await db.execute(
      programId === -1
        ? sql`
            SELECT
              c.id            AS course_id,
              c.title         AS course_title,
              COUNT(e.id)     AS total_users,
              COUNT(e.id) FILTER (WHERE e.status = 'completed')   AS completed_users,
              COUNT(e.id) FILTER (WHERE e.status = 'in_progress') AS active_users,
              COALESCE(AVG(e.progress), 0)::int                   AS avg_progress
            FROM courses c
            LEFT JOIN enrollments e ON e.course_id = c.id
            WHERE c.program_id IS NULL
            GROUP BY c.id, c.title
            ORDER BY c.title
          `
        : sql`
            SELECT
              c.id            AS course_id,
              c.title         AS course_title,
              COUNT(e.id)     AS total_users,
              COUNT(e.id) FILTER (WHERE e.status = 'completed')   AS completed_users,
              COUNT(e.id) FILTER (WHERE e.status = 'in_progress') AS active_users,
              COALESCE(AVG(e.progress), 0)::int                   AS avg_progress
            FROM courses c
            LEFT JOIN enrollments e ON e.course_id = c.id
            WHERE c.program_id = ${programId}
            GROUP BY c.id, c.title
            ORDER BY c.title
          `
    );

    return (rows.rows as any[]).map((row) => {
      const totalUsers     = Number(row.total_users);
      const completedUsers = Number(row.completed_users);
      const completionRate = totalUsers > 0 ? Math.round((completedUsers / totalUsers) * 100) : 0;
      return {
        courseId:      Number(row.course_id),
        courseTitle:   row.course_title,
        totalUsers,
        completedUsers,
        activeUsers:   Number(row.active_users),
        avgProgress:   Number(row.avg_progress),
        completionRate,
      };
    });
  }

  /**
   * Returns quiz performance stats for all quizzes in a program.
   * Single SQL query joining quizzes → course_weeks → courses → programs.
   */
  async getQuizAnalytics(programId: number): Promise<any> {
    // programId = -1 means standalone courses (no program)
    const rows = await db.execute(
      programId === -1
        ? sql`
            SELECT
              q.id                                          AS quiz_id,
              q.title                                       AS quiz_title,
              q.pass_score_percent                          AS pass_threshold,
              q.is_final_exam                               AS is_final_exam,
              c.id                                          AS course_id,
              c.title                                       AS course_title,
              COUNT(qa.id)                                  AS total_attempts,
              COUNT(qa.id) FILTER (WHERE qa.passed = true)  AS passed_attempts,
              COUNT(qa.id) FILTER (WHERE qa.passed = false) AS failed_attempts,
              COALESCE(AVG(qa.score_percent), 0)::int        AS avg_score
            FROM quizzes q
            JOIN course_weeks cw ON cw.id = q.week_id
            JOIN courses c       ON c.id  = cw.course_id
            LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
            WHERE c.program_id IS NULL
            GROUP BY q.id, q.title, q.pass_score_percent, q.is_final_exam, c.id, c.title
            ORDER BY c.title, q.id
          `
        : sql`
            SELECT
              q.id                                          AS quiz_id,
              q.title                                       AS quiz_title,
              q.pass_score_percent                          AS pass_threshold,
              q.is_final_exam                               AS is_final_exam,
              c.id                                          AS course_id,
              c.title                                       AS course_title,
              COUNT(qa.id)                                  AS total_attempts,
              COUNT(qa.id) FILTER (WHERE qa.passed = true)  AS passed_attempts,
              COUNT(qa.id) FILTER (WHERE qa.passed = false) AS failed_attempts,
              COALESCE(AVG(qa.score_percent), 0)::int        AS avg_score
            FROM quizzes q
            JOIN course_weeks cw ON cw.id = q.week_id
            JOIN courses c       ON c.id  = cw.course_id
            LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
            WHERE c.program_id = ${programId}
            GROUP BY q.id, q.title, q.pass_score_percent, q.is_final_exam, c.id, c.title
            ORDER BY c.title, q.id
          `
    );

    const quizzes = (rows.rows as any[]).map((row) => {
      const totalAttempts  = Number(row.total_attempts);
      const passedAttempts = Number(row.passed_attempts);
      const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;
      return {
        quizId:         Number(row.quiz_id),
        quizTitle:      row.quiz_title,
        passThreshold:  Number(row.pass_threshold),
        isFinalExam:    row.is_final_exam,
        courseId:       Number(row.course_id),
        courseTitle:    row.course_title,
        totalAttempts,
        passedAttempts,
        failedAttempts: Number(row.failed_attempts),
        avgScore:       Number(row.avg_score),
        passRate,
      };
    });

    // Aggregate totals across all quizzes in the program
    const totalAttempts  = quizzes.reduce((s, q) => s + q.totalAttempts, 0);
    const passedAttempts = quizzes.reduce((s, q) => s + q.passedAttempts, 0);
    const overallPassRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;
    const overallAvgScore = quizzes.length > 0
      ? Math.round(quizzes.reduce((s, q) => s + q.avgScore, 0) / quizzes.length)
      : 0;

    // Top performing courses = highest pass rate among courses with attempts
    const courseMap = new Map<number, { courseTitle: string; passed: number; total: number }>();
    for (const q of quizzes) {
      const existing = courseMap.get(q.courseId) || { courseTitle: q.courseTitle, passed: 0, total: 0 };
      existing.passed += q.passedAttempts;
      existing.total  += q.totalAttempts;
      courseMap.set(q.courseId, existing);
    }
    const topCourses = Array.from(courseMap.entries())
      .filter(([, v]) => v.total > 0)
      .map(([courseId, v]) => ({
        courseId,
        courseTitle: v.courseTitle,
        passRate: Math.round((v.passed / v.total) * 100),
      }))
      .sort((a, b) => b.passRate - a.passRate)
      .slice(0, 5);

    return { quizzes, totalAttempts, passedAttempts, overallPassRate, overallAvgScore, topCourses };
  }

  // Certificates Implementation
  async getCertificate(id: number): Promise<Certificate | undefined> {
    const [cert] = await db.select().from(certificates).where(eq(certificates.id, id));
    return cert;
  }

  async getCertificateByCode(code: string): Promise<Certificate | undefined> {
    const [cert] = await db.select().from(certificates).where(eq(certificates.code, code));
    return cert;
  }

  async getCertificateForUser(userId: number, courseId?: number, programId?: number): Promise<Certificate | undefined> {
    if (courseId) {
      const [cert] = await db.select().from(certificates)
        .where(and(eq(certificates.userId, userId), eq(certificates.courseId, courseId)));
      return cert;
    }
    if (programId) {
      const [cert] = await db.select().from(certificates)
        .where(and(eq(certificates.userId, userId), eq(certificates.programId, programId)));
      return cert;
    }
    return undefined;
  }

  async getCertificatesForUser(userId: number): Promise<(Certificate & { course?: Course, program?: Program })[]> {
    const certs = await db.select().from(certificates).where(eq(certificates.userId, userId));
    
    // Enrich with titles
    const enriched = await Promise.all(certs.map(async (cert) => {
      let courseDetails;
      let programDetails;
      
      if (cert.courseId) {
        courseDetails = await this.getCourse(cert.courseId);
      }
      if (cert.programId) {
        programDetails = await this.getProgram(cert.programId);
      }
      
      return {
        ...cert,
        course: courseDetails,
        program: programDetails
      };
    }));
    
    return enriched;
  }

  async createCertificate(data: InsertCertificate): Promise<Certificate> {
    // Generate secure unique code if not provided
    const code = data.code || crypto.randomBytes(6).toString('hex').toUpperCase();
    const [cert] = await db.insert(certificates).values({ ...data, code }).returning();
    return cert;
  }
}

export const storage = new DatabaseStorage();
