import { db } from "./db";
import {
  users, programs, courses, courseWeeks, courseContent, quizzes, quizQuestions, quizAttempts,
  tutorProfiles, bookings, reviews, messages, enrollments, certificates, verificationRequests, withdrawals,
  bookingPaymentIntents, enrollmentPaymentIntents, notifications,
  type User, type InsertUser, type Program, type Course, type CourseWeek, type CourseContent,
  type Quiz, type QuizQuestion, type QuizAttempt, type TutorProfile, type Booking, type Review, type Message,
  type InsertProgram, type InsertCourse, type InsertTutorProfile, type InsertBooking, type InsertMessage,
  type InsertQuizAttempt, type BookingPaymentIntent, type EnrollmentPaymentIntent, type VerificationRequest, type Notification, type InsertNotification
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;

  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserVerification(id: number, isVerified: boolean): Promise<User>;

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
  getWeekContent(weekId: number): Promise<CourseContent[]>;
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
  getQuizQuestions(quizId: number): Promise<QuizQuestion[]>;
  createQuizAttempt(attempt: { quizId: number; userId: number; scorePercent: number; passed: boolean }): Promise<QuizAttempt>;
  getPassedQuizAttempts(userId: number): Promise<QuizAttempt[]>;

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

  // Seeding helpers
  countUsers(): Promise<number>;
  countPrograms(): Promise<number>;
  createProgram(program: { title: string; description: string; slug: string; price: number; published: boolean }): Promise<Program>;
  createCourse(course: { title: string; description: string; slug: string; price: number; programId?: number; published: boolean }): Promise<Course>;
  createWeek(week: { courseId: number; weekNumber: number; title: string }): Promise<CourseWeek>;
  createContent(content: { weekId: number; title: string; type: "video" | "reading" | "file" | "link"; contentUrl?: string; contentText?: string; sequenceOrder: number }): Promise<CourseContent>;
  createQuiz(quiz: { weekId: number; title: string; passScorePercent: number; isFinalExam: boolean }): Promise<Quiz>;
  createQuizQuestion(question: { quizId: number; questionText: string; options: string[]; correctOptionIndex: number }): Promise<QuizQuestion>;
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

  async getCourseWeeks(courseId: number): Promise<CourseWeek[]> {
    return await db.select().from(courseWeeks).where(eq(courseWeeks.courseId, courseId)).orderBy(courseWeeks.weekNumber);
  }

  async getWeekContent(weekId: number): Promise<CourseContent[]> {
    return await db.select().from(courseContent).where(eq(courseContent.weekId, weekId)).orderBy(courseContent.sequenceOrder);
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

  async getQuizQuestions(quizId: number): Promise<QuizQuestion[]> {
    return await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId));
  }

  async createQuizAttempt(attempt: { quizId: number; userId: number; scorePercent: number; passed: boolean }): Promise<QuizAttempt> {
    const [newAttempt] = await db.insert(quizAttempts).values(attempt).returning();
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

  async createWeek(week: { courseId: number; weekNumber: number; title: string }): Promise<CourseWeek> {
    const [newWeek] = await db.insert(courseWeeks).values(week).returning();
    return newWeek;
  }

  async createContent(content: { weekId: number; title: string; type: "video" | "reading" | "file" | "link"; contentUrl?: string; contentText?: string; sequenceOrder: number }): Promise<CourseContent> {
    const [newContent] = await db.insert(courseContent).values(content).returning();
    return newContent;
  }

  async createQuiz(quiz: { weekId: number; title: string; passScorePercent: number; isFinalExam: boolean }): Promise<Quiz> {
    const [newQuiz] = await db.insert(quizzes).values(quiz).returning();
    return newQuiz;
  }

  async createQuizQuestion(question: { quizId: number; questionText: string; options: string[]; correctOptionIndex: number }): Promise<QuizQuestion> {
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
}

export const storage = new DatabaseStorage();
