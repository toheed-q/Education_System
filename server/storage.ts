import { db } from "./db";
import {
  users, programs, courses, courseWeeks, courseContent, quizzes, quizQuestions, quizAttempts,
  tutorProfiles, bookings, reviews, messages, enrollments, certificates, verificationRequests, withdrawals,
  bookingPaymentIntents,
  type User, type InsertUser, type Program, type Course, type CourseWeek, type CourseContent,
  type Quiz, type QuizQuestion, type QuizAttempt, type TutorProfile, type Booking, type Review, type Message,
  type InsertProgram, type InsertCourse, type InsertTutorProfile, type InsertBooking, type InsertMessage,
  type InsertQuizAttempt, type BookingPaymentIntent, type VerificationRequest
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
  getCoursesByProgram(programId: number): Promise<Course[]>;
  getCourses(): Promise<Course[]>;
  getCourse(id: number): Promise<Course | undefined>;
  getCourseWeeks(courseId: number): Promise<CourseWeek[]>;
  getWeekContent(weekId: number): Promise<CourseContent[]>;
  getWeekQuiz(weekId: number): Promise<Quiz | undefined>;

  // Tutors
  getTutors(subject?: string): Promise<(TutorProfile & { user: User })[]>;
  getTutorProfile(id: number): Promise<(TutorProfile & { user: User }) | undefined>;
  createTutorProfile(profile: InsertTutorProfile): Promise<TutorProfile>;

  // Bookings
  createBooking(booking: InsertBooking): Promise<Booking>;
  createBookingFromPayment(data: { studentId: number; tutorId: number; startTime: Date; endTime: Date; sessionType: string; location?: string | null; pricePaid: number; paystackReference: string }): Promise<Booking>;
  getBookingsForUser(userId: number, role: "student" | "tutor"): Promise<(Booking & { tutor?: User, student?: User })[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  updateBookingStatus(id: number, status: "pending" | "confirmed" | "completed" | "cancelled"): Promise<Booking | undefined>;
  updateBookingMeetingLink(id: number, meetingLink: string): Promise<Booking | undefined>;
  
  // Payment Intents
  createPaymentIntent(intent: { studentId: number; tutorId: number; startTime: Date; endTime: Date; sessionType: string; location?: string | null; amountKes: number; platformFeeKes: number; tutorShareKes: number; paystackReference: string }): Promise<BookingPaymentIntent>;
  getPaymentIntent(paystackReference: string): Promise<BookingPaymentIntent | undefined>;
  markPaymentIntentPaid(paystackReference: string): Promise<BookingPaymentIntent | undefined>;
  
  // Messages
  getMessages(userId1: number, userId2: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Enrollments
  isUserEnrolledInCourse(userId: number, courseId: number): Promise<boolean>;

  // Quizzes
  getQuiz(id: number): Promise<Quiz | undefined>;
  getQuizQuestions(quizId: number): Promise<QuizQuestion[]>;
  createQuizAttempt(attempt: { quizId: number; userId: number; scorePercent: number; passed: boolean }): Promise<QuizAttempt>;
  getPassedQuizAttempts(userId: number): Promise<QuizAttempt[]>;

  // Verification Requests
  createVerificationRequest(request: { tutorProfileId: number; verificationType: "school" | "higher_ed"; documentUrl: string; nationalIdUrl?: string; additionalNotes?: string; feeAmountKes: number }): Promise<VerificationRequest>;
  getVerificationRequestsByTutor(tutorProfileId: number): Promise<VerificationRequest[]>;
  getPendingVerificationRequests(): Promise<(VerificationRequest & { tutorProfile: TutorProfile & { user: User } })[]>;
  updateVerificationRequestStatus(id: number, status: "pending" | "approved" | "rejected", reviewedBy: number, reviewNotes?: string): Promise<VerificationRequest | undefined>;
  getTutorProfileByUserId(userId: number): Promise<TutorProfile | undefined>;
  updateTutorVerificationStatus(tutorProfileId: number, status: "pending" | "approved" | "rejected"): Promise<TutorProfile | undefined>;

  // Seeding helpers
  countUsers(): Promise<number>;
  countPrograms(): Promise<number>;
  createProgram(program: { title: string; description: string; price: number; published: boolean }): Promise<Program>;
  createCourse(course: { title: string; description: string; price: number; programId?: number; published: boolean }): Promise<Course>;
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
    // For MVP, return all and filter
    const results = await db.select().from(tutorProfiles).innerJoin(users, eq(tutorProfiles.userId, users.id));
    
    const mapped = results.map(r => ({ ...r.tutor_profiles, user: r.users }));
    
    if (subject) {
      return mapped.filter(t => (t.subjects as string[]).includes(subject));
    }
    return mapped;
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

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async createBookingFromPayment(data: { studentId: number; tutorId: number; startTime: Date; endTime: Date; sessionType: string; location?: string | null; pricePaid: number; paystackReference: string }): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values({
      studentId: data.studentId,
      tutorId: data.tutorId,
      startTime: data.startTime,
      endTime: data.endTime,
      sessionType: data.sessionType as "online" | "physical",
      location: data.location,
      pricePaid: data.pricePaid,
      paystackReference: data.paystackReference,
    }).returning();
    return newBooking;
  }

  async createPaymentIntent(intent: { studentId: number; tutorId: number; startTime: Date; endTime: Date; sessionType: string; location?: string | null; amountKes: number; platformFeeKes: number; tutorShareKes: number; paystackReference: string }): Promise<BookingPaymentIntent> {
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

  async getBookingsForUser(userId: number, role: "student" | "tutor"): Promise<(Booking & { tutor?: User, student?: User })[]> {
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

  async createVerificationRequest(request: { tutorProfileId: number; verificationType: "school" | "higher_ed"; documentUrl: string; nationalIdUrl?: string; additionalNotes?: string; feeAmountKes: number }): Promise<VerificationRequest> {
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

  async countUsers(): Promise<number> {
    const [count] = await db.select({ count: sql<number>`count(*)` }).from(users);
    return Number(count.count);
  }

  async countPrograms(): Promise<number> {
    const [count] = await db.select({ count: sql<number>`count(*)` }).from(programs);
    return Number(count.count);
  }

  async createProgram(program: { title: string; description: string; price: number; published: boolean }): Promise<Program> {
    const [newProgram] = await db.insert(programs).values(program).returning();
    return newProgram;
  }

  async createCourse(course: { title: string; description: string; price: number; programId?: number; published: boolean }): Promise<Course> {
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
}

export const storage = new DatabaseStorage();
