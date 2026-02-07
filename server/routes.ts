import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import argon2 from "argon2";
import { users } from "@shared/schema";
import { generateSlug } from "@shared/utils";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import OpenAI from "openai";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Auth Setup
  app.use(
    session({
      store: storage.sessionStore,
      secret: process.env.SESSION_SECRET || "secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: app.get("env") === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByEmail(username); // Using email as username
        if (!user) {
          return done(null, false, { message: "Incorrect email." });
        }
        if (await argon2.verify(user.password, password)) {
          return done(null, user);
        } else {
          return done(null, false, { message: "Incorrect password." });
        }
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Object Storage Routes
  registerObjectStorageRoutes(app);

  // API Routes
  
  // Auth
  app.post(api.auth.register.path, async (req, res, next) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existing = await storage.getUserByEmail(input.email);
      if (existing) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      const hashedPassword = await argon2.hash(input.password);
      const user = await storage.createUser({ ...input, password: hashedPassword });
      
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        next(err);
      }
    }
  });

  app.post(api.auth.login.path, passport.authenticate("local"), (req, res) => {
    res.json(req.user);
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Programs & Courses
  app.get(api.programs.list.path, async (req, res) => {
    const programs = await storage.getProgramsWithCourseCounts();
    res.json(programs);
  });

  app.get(api.programs.get.path, async (req, res) => {
    const program = await storage.getProgram(Number(req.params.id));
    if (!program) return res.status(404).json({ message: "Program not found" });
    const programCourses = await storage.getCoursesByProgram(program.id);
    res.json({ ...program, courses: programCourses }); 
  });

  app.post(api.programs.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = req.user as any;
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const input = api.programs.create.input.parse(req.body);
      const slug = generateSlug(input.title);
      const program = await storage.createProgram({
        title: input.title,
        description: input.description,
        slug,
        price: input.price,
        published: input.published ?? false,
      });
      res.status(201).json(program);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(400).json({ message: "Failed to create program" });
      }
    }
  });

  app.get(api.courses.list.path, async (req, res) => {
    const courses = await storage.getCourses();
    res.json(courses);
  });

  app.post(api.courses.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = req.user as any;
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const input = api.courses.create.input.parse(req.body);
      const slug = generateSlug(input.title);
      const course = await storage.createCourse({
        title: input.title,
        description: input.description,
        slug,
        price: input.price,
        programId: input.programId ?? undefined,
        published: input.published ?? false,
      });
      res.status(201).json(course);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(400).json({ message: "Failed to create course" });
      }
    }
  });

  app.get(api.courses.get.path, async (req, res) => {
    const courseId = Number(req.params.id);
    const course = await storage.getCourse(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });
    
    const weeks = await storage.getCourseWeeks(courseId);
    
    // Check if user is enrolled
    const isAuthenticated = req.isAuthenticated();
    const userId = isAuthenticated ? (req.user as any).id : null;
    const isEnrolled = userId ? await storage.isUserEnrolledInCourse(userId, courseId) : false;
    
    const weeksWithContent = await Promise.all(weeks.map(async w => {
      const content = await storage.getWeekContent(w.id);
      const quiz = await storage.getWeekQuiz(w.id);
      
      if (isEnrolled) {
        // Return full content for enrolled users
        return { ...w, content, quiz };
      } else {
        // Return limited info for non-enrolled users (preview mode)
        // Only include metadata, exclude contentUrl and contentText
        return { 
          ...w, 
          content: content.map(c => ({ 
            id: c.id, 
            title: c.title, 
            type: c.type, 
            sequenceOrder: c.sequenceOrder 
          })),
          quiz: quiz ? { 
            id: quiz.id, 
            title: quiz.title, 
            passScorePercent: quiz.passScorePercent, 
            isFinalExam: quiz.isFinalExam 
          } : undefined
        };
      }
    }));
    
    res.json({ ...course, weeks: weeksWithContent });
  });

  // Slug-based course lookup
  app.get("/api/courses/slug/:slug", async (req, res) => {
    const slug = req.params.slug;
    const course = await storage.getCourseBySlug(slug);
    if (!course) return res.status(404).json({ message: "Course not found" });
    
    const weeks = await storage.getCourseWeeks(course.id);
    
    const isAuthenticated = req.isAuthenticated();
    const userId = isAuthenticated ? (req.user as any).id : null;
    const isEnrolled = userId ? await storage.isUserEnrolledInCourse(userId, course.id) : false;
    
    const weeksWithContent = await Promise.all(weeks.map(async w => {
      const content = await storage.getWeekContent(w.id);
      const quiz = await storage.getWeekQuiz(w.id);
      
      if (isEnrolled) {
        return { ...w, content, quiz };
      } else {
        return { 
          ...w, 
          content: content.map(c => ({ 
            id: c.id, 
            title: c.title, 
            type: c.type, 
            sequenceOrder: c.sequenceOrder 
          })),
          quiz: quiz ? { 
            id: quiz.id, 
            title: quiz.title, 
            passScorePercent: quiz.passScorePercent, 
            isFinalExam: quiz.isFinalExam 
          } : undefined
        };
      }
    }));
    
    res.json({ ...course, weeks: weeksWithContent, isEnrolled });
  });

  // Slug-based program lookup
  app.get("/api/programs/slug/:slug", async (req, res) => {
    const slug = req.params.slug;
    const program = await storage.getProgramBySlug(slug);
    if (!program) return res.status(404).json({ message: "Program not found" });
    
    const programCourses = await storage.getCoursesByProgram(program.id);
    
    const isAuthenticated = req.isAuthenticated();
    const userId = isAuthenticated ? (req.user as any).id : null;
    const isEnrolled = userId ? await storage.getEnrollmentForUser(userId, undefined, program.id) : null;
    
    res.json({ ...program, courses: programCourses, isEnrolled: !!isEnrolled });
  });

  // AI Description Generation
  app.post("/api/ai/generate-description", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const user = req.user as any;
    if (user.role !== "admin" && user.role !== "super_admin") {
      return res.status(403).json({ message: "Only admins can generate descriptions" });
    }
    
    try {
      const { title, type, tone } = req.body;
      
      if (!title || typeof title !== "string" || title.trim().length < 2) {
        return res.status(400).json({ message: "Title is required (at least 2 characters)" });
      }
      
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      
      const contentType = type === "course" ? "course" : "program";
      const toneInstruction = tone && typeof tone === "string" && tone.trim() 
        ? `Use this tone and style: ${tone.trim()}`
        : "Use a professional, engaging, and informative tone";
      
      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          {
            role: "system",
            content: `You are an expert education content writer for LernenTech, an e-learning platform in Kenya. Generate compelling descriptions for learning ${contentType}s. ${toneInstruction}. 
            
Keep the description:
- Between 2-4 sentences
- Focused on what learners will gain
- Clear about practical outcomes and skills
- Engaging but professional
- Do not use emojis

Only respond with the description text, nothing else.`
          },
          {
            role: "user",
            content: `Generate a description for a ${contentType} titled: "${title.trim()}"`
          }
        ],
        max_completion_tokens: 200,
      });
      
      const description = completion.choices[0]?.message?.content?.trim();
      
      if (!description) {
        return res.status(500).json({ message: "Failed to generate description" });
      }
      
      res.json({ description });
    } catch (error: any) {
      console.error("AI description generation error:", error);
      res.status(500).json({ message: error.message || "Failed to generate description" });
    }
  });

  // Enrollments
  app.post(api.enrollments.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const user = req.user as any;
    
    try {
      const input = api.enrollments.create.input.parse(req.body);
      
      // Check if already enrolled
      const existingEnrollment = await storage.getEnrollmentForUser(
        user.id, 
        input.courseId, 
        input.programId
      );
      
      if (existingEnrollment) {
        return res.status(400).json({ message: "Already enrolled" });
      }
      
      const enrollment = await storage.createEnrollment({
        userId: user.id,
        courseId: input.courseId,
        programId: input.programId,
      });
      
      res.status(201).json(enrollment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(400).json({ message: "Failed to create enrollment" });
      }
    }
  });

  // Tutors
  app.get(api.tutors.list.path, async (req, res) => {
    const subject = req.query.subject as string | undefined;
    const tutors = await storage.getTutors(subject);
    res.json(tutors);
  });

  app.get(api.tutors.get.path, async (req, res) => {
    const tutor = await storage.getTutorProfile(Number(req.params.id));
    if (!tutor) return res.status(404).json({ message: "Tutor not found" });
    res.json(tutor);
  });

  // Get current tutor's own profile (includes category-specific verification statuses)
  app.get("/api/tutors/my-profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const user = req.user as any;
    if (user.role !== "tutor") {
      return res.status(403).json({ message: "Only tutors can access this endpoint" });
    }
    
    try {
      const profile = await storage.getTutorProfileByUserId(user.id);
      if (!profile) {
        return res.status(404).json({ message: "Tutor profile not found" });
      }
      res.json(profile);
    } catch (err) {
      console.error("Get my profile error:", err);
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  // Update tutor's own profile
  app.patch("/api/tutors/my-profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const user = req.user as any;
    if (user.role !== "tutor") {
      return res.status(403).json({ message: "Only tutors can update their profile" });
    }
    
    try {
      const profile = await storage.getTutorProfileByUserId(user.id);
      if (!profile) {
        return res.status(404).json({ message: "Tutor profile not found" });
      }
      
      const { bio, hourlyRate, schoolTutoringSubjects, higherEducationSubjects, professionalSkillsSubjects } = req.body;
      
      const updateData: Record<string, any> = {};
      if (bio !== undefined && typeof bio === "string") updateData.bio = bio;
      if (hourlyRate !== undefined) {
        const rate = parseInt(hourlyRate);
        if (isNaN(rate) || rate < 0) {
          return res.status(400).json({ message: "Invalid hourly rate" });
        }
        updateData.hourlyRate = rate;
      }
      if (Array.isArray(schoolTutoringSubjects)) updateData.schoolTutoringSubjects = schoolTutoringSubjects;
      if (Array.isArray(higherEducationSubjects)) updateData.higherEducationSubjects = higherEducationSubjects;
      if (Array.isArray(professionalSkillsSubjects)) updateData.professionalSkillsSubjects = professionalSkillsSubjects;
      
      // Also update the legacy subjects array with all combined subjects
      const allSubjects = [
        ...(schoolTutoringSubjects || profile.schoolTutoringSubjects || []),
        ...(higherEducationSubjects || profile.higherEducationSubjects || []),
        ...(professionalSkillsSubjects || profile.professionalSkillsSubjects || []),
      ];
      updateData.subjects = allSubjects;
      
      const updated = await storage.updateTutorProfile(profile.id, updateData);
      res.json(updated);
    } catch (err) {
      console.error("Update tutor profile error:", err);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Get booked time slots for a tutor (authenticated)
  app.get("/api/bookings/booked-slots", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { tutorId } = req.query;
      if (!tutorId) {
        return res.status(400).json({ message: "tutorId is required" });
      }
      const user = req.user as any;
      const tutorSlots = await storage.getBookedSlotsForTutor(Number(tutorId));
      const studentSlots = await storage.getBookedSlotsForStudent(user.id);
      const allBooked = Array.from(new Set([...tutorSlots, ...studentSlots]));
      res.json({ bookedSlots: allBooked });
    } catch (err) {
      console.error("Get booked slots error:", err);
      res.status(500).json({ message: "Failed to get booked slots" });
    }
  });

  // Bookings - Initiate Payment (step 1 of booking flow)
  app.post("/api/bookings/initiate-payment", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ message: "Payment not configured" });
    }
    
    try {
      const { tutorId, startTime, endTime, sessionType, location, subject, gradeLevel, topic, sessionNotes } = req.body;
      const user = req.user as any;
      
      // Validate user is a student
      if (user.role !== "student") {
        return res.status(403).json({ message: "Only students can book tutoring sessions" });
      }
      
      // Validate session type (strict enum validation - reject invalid values)
      const validSessionTypes = ["online", "physical"] as const;
      const trimmedSessionType = typeof sessionType === "string" ? sessionType.trim().toLowerCase() : "";
      if (!validSessionTypes.includes(trimmedSessionType as any)) {
        return res.status(400).json({ message: "Invalid session type. Must be 'online' or 'physical'" });
      }
      const validatedSessionType = trimmedSessionType as "online" | "physical";
      
      // Validate location required for physical sessions
      if (validatedSessionType === "physical" && (!location || typeof location !== "string" || !location.trim())) {
        return res.status(400).json({ message: "Location is required for in-person sessions" });
      }
      
      // Validate start/end times
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid date/time provided" });
      }
      if (end <= start) {
        return res.status(400).json({ message: "End time must be after start time" });
      }
      if (start < new Date()) {
        return res.status(400).json({ message: "Cannot book sessions in the past" });
      }
      
      // Check for scheduling conflicts
      const startIso = start.toISOString();
      const tutorBookedSlots = await storage.getBookedSlotsForTutor(tutorId);
      if (tutorBookedSlots.some(iso => iso.substring(0, 16) === startIso.substring(0, 16))) {
        return res.status(409).json({ message: "This tutor already has a booking at this time. Please choose a different time." });
      }
      const studentBookedSlots = await storage.getBookedSlotsForStudent(user.id);
      if (studentBookedSlots.some(iso => iso.substring(0, 16) === startIso.substring(0, 16))) {
        return res.status(409).json({ message: "You already have a booking at this time. Please choose a different time." });
      }
      
      // Get tutor profile to use authoritative hourly rate (not client-supplied amount)
      const tutorProfile = await storage.getTutorProfile(tutorId);
      if (!tutorProfile) {
        return res.status(404).json({ message: "Tutor not found" });
      }
      
      // Use tutor's authoritative hourly rate
      const amount = tutorProfile.hourlyRate;
      
      // Calculate platform fee (25%)
      const platformFeeKes = Math.round(amount * 0.25);
      const tutorShareKes = amount - platformFeeKes;
      
      // Generate unique reference
      const reference = `LRNT-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Get user email for Paystack
      const studentUser = await storage.getUser(user.id);
      if (!studentUser) {
        return res.status(400).json({ message: "User not found" });
      }
      
      // Create payment intent in database with validated session type
      // Store the tutor's USER ID (not profile ID) since bookings.tutorId references users.id
      const trimmedLocation = validatedSessionType === "physical" ? location.trim() : null;
      const intent = await storage.createPaymentIntent({
        studentId: user.id,
        tutorId: tutorProfile.user.id,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        sessionType: validatedSessionType as "online" | "physical",
        location: trimmedLocation,
        amountKes: amount,
        platformFeeKes,
        tutorShareKes,
        paystackReference: reference,
        subject: subject || null,
        gradeLevel: gradeLevel || null,
        topic: topic || null,
        sessionNotes: sessionNotes || null,
      });
      
      // Initialize Paystack transaction
      const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: studentUser.email,
          amount: amount * 100, // Paystack uses kobo (cents)
          currency: "KES",
          reference,
          callback_url: `${req.protocol}://${req.get('host')}/payment/callback`,
          metadata: {
            intentId: intent.id,
            tutorId,
            studentId: user.id,
          },
        }),
      });
      
      const paystackData = await paystackResponse.json();
      
      if (!paystackData.status) {
        return res.status(400).json({ message: paystackData.message || "Payment initialization failed" });
      }
      
      res.json({
        reference,
        authorizationUrl: paystackData.data.authorization_url,
        accessCode: paystackData.data.access_code,
      });
    } catch (err) {
      console.error("Payment initiation error:", err);
      res.status(500).json({ message: "Failed to initiate payment" });
    }
  });

  // Verify Payment and Create Booking (step 2 of booking flow)
  app.post("/api/bookings/verify-payment", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ message: "Payment not configured" });
    }
    
    try {
      const { reference } = req.body;
      
      // Verify with Paystack
      const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: {
          "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      });
      
      const verifyData = await verifyResponse.json();
      
      if (!verifyData.status || verifyData.data.status !== "success") {
        return res.status(400).json({ message: "Payment verification failed" });
      }
      
      // Get the payment intent
      const intent = await storage.getPaymentIntent(reference);
      if (!intent) {
        return res.status(404).json({ message: "Payment intent not found" });
      }
      
      if (intent.status === "paid") {
        return res.status(400).json({ message: "Payment already processed" });
      }
      
      // Mark intent as paid
      await storage.markPaymentIntentPaid(reference);
      
      // Create the actual booking with session type and location
      const booking = await storage.createBookingFromPayment({
        studentId: intent.studentId,
        tutorId: intent.tutorId,
        startTime: intent.startTime,
        endTime: intent.endTime,
        sessionType: intent.sessionType || "online",
        location: intent.location,
        pricePaid: intent.amountKes,
        paystackReference: reference,
        subject: intent.subject,
        gradeLevel: intent.gradeLevel,
        topic: intent.topic,
        sessionNotes: intent.sessionNotes,
      });

      // Notify tutor about new booking
      const student = await storage.getUser(intent.studentId);
      await storage.createNotification({
        userId: intent.tutorId,
        title: "New Booking",
        message: `${student?.name || "A student"} has booked a session with you on ${new Date(intent.startTime).toLocaleDateString()}.`,
        type: "booking",
      });
      
      res.json({ 
        success: true, 
        booking,
        message: "Payment verified and booking created" 
      });
    } catch (err) {
      console.error("Payment verification error:", err);
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });

  // Legacy direct booking (keep for now but should require payment)
  app.post(api.bookings.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.bookings.create.input.parse(req.body);
      const booking = await storage.createBooking({ 
        ...input, 
        studentId: (req.user as any).id,
      });
      res.status(201).json(booking);
    } catch (err) {
      console.error("Booking error:", err);
      res.status(400).json({ message: "Invalid booking" });
    }
  });

  app.get(api.bookings.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const bookings = await storage.getBookingsForUser(user.id, user.role);
    res.json(bookings);
  });

  // Update booking status (accept/decline)
  app.patch("/api/bookings/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const bookingId = Number(req.params.id);
    const { status } = req.body;
    const user = req.user as any;
    
    if (!["confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Use 'confirmed' or 'cancelled'" });
    }
    
    try {
      // Only tutors can accept/decline their own bookings
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      if (booking.tutorId !== user.id) {
        return res.status(403).json({ message: "You can only manage your own bookings" });
      }
      
      const updated = await storage.updateBookingStatus(bookingId, status);
      res.json(updated);
    } catch (err) {
      console.error("Booking status update error:", err);
      res.status(500).json({ message: "Failed to update booking status" });
    }
  });

  // Add meeting link to booking (tutors only)
  app.patch("/api/bookings/:id/meeting-link", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const bookingId = Number(req.params.id);
    const { meetingLink } = req.body;
    const user = req.user as any;
    
    if (!meetingLink || typeof meetingLink !== "string" || !meetingLink.trim()) {
      return res.status(400).json({ message: "Meeting link is required" });
    }
    
    // Basic URL validation
    try {
      new URL(meetingLink);
    } catch {
      return res.status(400).json({ message: "Please enter a valid URL for the meeting link" });
    }
    
    try {
      // Only tutors can add meeting links to their own bookings
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      if (booking.tutorId !== user.id) {
        return res.status(403).json({ message: "You can only add meeting links to your own bookings" });
      }
      
      // Only online sessions need meeting links
      if (booking.sessionType === "physical") {
        return res.status(400).json({ message: "Physical sessions don't need meeting links" });
      }
      
      const updated = await storage.updateBookingMeetingLink(bookingId, meetingLink);
      res.json(updated);
    } catch (err) {
      console.error("Meeting link update error:", err);
      res.status(500).json({ message: "Failed to add meeting link" });
    }
  });

  // Verification Requests - Three Super Categories
  // School Tutoring: KES 500 fee - Must be verified before visible
  // Higher Education: KES 300 fee - Can be visible while pending
  // Professional Skills: KES 300 fee - Can be visible while pending
  app.post("/api/verification-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const user = req.user as any;
    if (user.role !== "tutor") {
      return res.status(403).json({ message: "Only tutors can submit verification requests" });
    }
    
    try {
      const { verificationType, documentUrl, nationalIdUrl, additionalNotes, subjects } = req.body;
      
      const validTypes = ["school_tutoring", "higher_education", "professional_skills"];
      if (!validTypes.includes(verificationType)) {
        return res.status(400).json({ message: "Invalid verification type. Must be school_tutoring, higher_education, or professional_skills" });
      }
      
      if (!documentUrl) {
        return res.status(400).json({ message: "Document URL is required" });
      }
      
      // Get tutor profile
      const tutorProfile = await storage.getTutorProfileByUserId(user.id);
      if (!tutorProfile) {
        return res.status(404).json({ message: "Tutor profile not found" });
      }
      
      // Calculate fee based on type - School Tutoring: KES 500, others: KES 300
      const feeAmountKes = verificationType === "school_tutoring" ? 500 : 300;
      
      const request = await storage.createVerificationRequest({
        tutorProfileId: tutorProfile.id,
        verificationType,
        documentUrl,
        nationalIdUrl,
        additionalNotes,
        feeAmountKes,
      });
      
      // Update category-specific verification status to pending
      await storage.updateTutorCategoryStatus(tutorProfile.id, verificationType, "pending");
      
      // Update category-specific subjects if provided
      if (subjects && Array.isArray(subjects)) {
        await storage.updateTutorCategorySubjects(tutorProfile.id, verificationType, subjects);
      }
      
      res.status(201).json(request);
    } catch (err) {
      console.error("Verification request error:", err);
      res.status(500).json({ message: "Failed to submit verification request" });
    }
  });

  app.get("/api/verification-requests/my", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const user = req.user as any;
    if (user.role !== "tutor") {
      return res.status(403).json({ message: "Only tutors can view their verification requests" });
    }
    
    try {
      const tutorProfile = await storage.getTutorProfileByUserId(user.id);
      if (!tutorProfile) {
        return res.json([]);
      }
      
      const requests = await storage.getVerificationRequestsByTutor(tutorProfile.id);
      res.json(requests);
    } catch (err) {
      console.error("Get verification requests error:", err);
      res.status(500).json({ message: "Failed to get verification requests" });
    }
  });

  app.get("/api/admin/verification-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const user = req.user as any;
    if (!["admin", "super_admin"].includes(user.role)) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const requests = await storage.getPendingVerificationRequests();
      res.json(requests);
    } catch (err) {
      console.error("Get pending verification requests error:", err);
      res.status(500).json({ message: "Failed to get verification requests" });
    }
  });

  app.patch("/api/admin/verification-requests/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const user = req.user as any;
    if (!["admin", "super_admin"].includes(user.role)) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    const requestId = Number(req.params.id);
    const { status, reviewNotes } = req.body;
    
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Use 'approved' or 'rejected'" });
    }
    
    try {
      const updated = await storage.updateVerificationRequestStatus(requestId, status, user.id, reviewNotes);
      
      if (!updated) {
        return res.status(404).json({ message: "Verification request not found" });
      }
      
      // Update category-specific verification status based on decision
      const categoryStatus = status as "approved" | "rejected";
      await storage.updateTutorCategoryStatus(updated.tutorProfileId, updated.verificationType, categoryStatus);
      
      // Also update legacy verificationStatus for backwards compatibility
      // Set to approved only if at least one category is approved
      if (status === "approved") {
        await storage.updateTutorVerificationStatus(updated.tutorProfileId, "approved");
      }

      // Create notification for the tutor
      const tutorProfile = await storage.getTutorProfile(updated.tutorProfileId);
      if (tutorProfile) {
        const categoryLabel = updated.verificationType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        await storage.createNotification({
          userId: tutorProfile.user.id,
          title: status === "approved" ? "Verification Approved" : "Verification Rejected",
          message: status === "approved"
            ? `Your ${categoryLabel} verification has been approved. You can now accept bookings in this category.`
            : `Your ${categoryLabel} verification was not approved.${reviewNotes ? ` Note: ${reviewNotes}` : ""}`,
          type: "verification",
        });
      }
      
      res.json(updated);
    } catch (err) {
      console.error("Update verification request error:", err);
      res.status(500).json({ message: "Failed to update verification request" });
    }
  });

  // Messages
  app.get(api.messages.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = Number(req.query.userId);
    const messages = await storage.getMessages((req.user as any).id, userId);
    res.json(messages);
  });

  app.post(api.messages.send.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.messages.send.input.parse(req.body);
    const sender = req.user as any;
    const message = await storage.createMessage({
      ...input,
      senderId: sender.id,
    });

    await storage.createNotification({
      userId: input.receiverId,
      title: "New Message",
      message: `${sender.name} sent you a message.`,
      type: "message",
    });
    res.status(201).json(message);
  });

  // Get conversations (list of users with messages)
  app.get("/api/conversations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const conversations = await storage.getConversations((req.user as any).id);
    res.json(conversations);
  });

  app.post("/api/messages/mark-read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { senderId } = req.body;
    if (!senderId) return res.status(400).json({ message: "senderId is required" });
    await storage.markMessagesRead((req.user as any).id, senderId);
    res.json({ success: true });
  });

  // Get total unread message count for dashboard
  app.get("/api/messages/unread-count", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const conversations = await storage.getConversations((req.user as any).id);
    const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
    res.json({ count: totalUnread });
  });

  // Notifications
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const notifs = await storage.getNotifications((req.user as any).id);
    res.json(notifs);
  });

  app.get("/api/notifications/unread-count", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const count = await storage.getUnreadNotificationCount((req.user as any).id);
    res.json({ count });
  });

  app.post("/api/notifications/mark-read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.markAllNotificationsRead((req.user as any).id);
    res.json({ success: true });
  });

  // Course Progression
  app.get("/api/courses/:id/progress", async (req, res) => {
    const courseId = Number(req.params.id);
    const course = await storage.getCourse(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });
    
    const weeks = await storage.getCourseWeeks(courseId);
    const sortedWeeks = weeks.sort((a, b) => a.weekNumber - b.weekNumber);
    
    const userId = req.isAuthenticated() ? (req.user as any).id : null;
    const isEnrolled = userId ? await storage.isUserEnrolledInCourse(userId, courseId) : false;
    
    if (!isEnrolled) {
      const progress = sortedWeeks.map((w, i) => ({
        weekId: w.id,
        weekNumber: w.weekNumber,
        unlocked: i === 0,
        completed: false
      }));
      return res.json({ enrolled: false, progress });
    }
    
    const passedAttempts = await storage.getPassedQuizAttempts(userId!);
    const passedQuizIds = new Set(passedAttempts.map(a => a.quizId));
    
    const weeksWithQuizzes = await Promise.all(sortedWeeks.map(async w => {
      const quiz = await storage.getWeekQuiz(w.id);
      return { ...w, quiz };
    }));
    
    const progress = weeksWithQuizzes.map((week, index) => {
      const isFirstWeek = index === 0;
      const previousWeek = index > 0 ? weeksWithQuizzes[index - 1] : null;
      const previousQuizPassed = previousWeek?.quiz 
        ? passedQuizIds.has(previousWeek.quiz.id)
        : true;
      
      return {
        weekId: week.id,
        weekNumber: week.weekNumber,
        unlocked: isFirstWeek || previousQuizPassed,
        completed: week.quiz ? passedQuizIds.has(week.quiz.id) : false
      };
    });
    
    res.json({ enrolled: true, progress });
  });

  // Quizzes
  app.get("/api/quizzes/:id", async (req, res) => {
    const quizId = Number(req.params.id);
    const quiz = await storage.getQuiz(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    
    const questions = await storage.getQuizQuestions(quizId);
    const questionsWithoutAnswers = questions.map(q => ({
      id: q.id,
      questionText: q.questionText,
      options: q.options as string[],
    }));
    
    res.json({ ...quiz, questions: questionsWithoutAnswers });
  });

  app.post("/api/quizzes/:id/submit", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const quizId = Number(req.params.id);
    const userId = (req.user as any).id;
    const { answers } = req.body as { answers: Record<number, number> };
    
    const quiz = await storage.getQuiz(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    
    const questions = await storage.getQuizQuestions(quizId);
    
    let correct = 0;
    for (const q of questions) {
      if (answers[q.id] === q.correctOptionIndex) {
        correct++;
      }
    }
    
    const scorePercent = Math.round((correct / questions.length) * 100);
    const passed = scorePercent >= quiz.passScorePercent;
    
    await storage.createQuizAttempt({
      quizId,
      userId,
      scorePercent,
      passed,
    });
    
    res.json({
      scorePercent,
      passed,
      correctAnswers: correct,
      totalQuestions: questions.length,
    });
  });

  // Seed Data
  const userCount = await storage.countUsers();
  const programCount = await storage.countPrograms();
  
  if (userCount === 0) {
    console.log("Seeding users...");
    const password = await argon2.hash("password123");
    
    // Super Admin (per requirements)
    await storage.createUser({
      email: "esthernjane@gmail.com",
      password,
      name: "Esther Njane",
      role: "super_admin",
    });

    // Additional Admin
    await storage.createUser({
      email: "admin@lernentech.com",
      password,
      name: "Admin User",
      role: "admin",
    });

    // Tutors
    // Main tutor test account (per requirements)
    const tutorMain = await storage.createUser({
      email: "tutor@lernentech.com",
      password,
      name: "Jane Tutor",
      role: "tutor",
    });
    const tutorMainProfile = await storage.createTutorProfile({
      userId: tutorMain.id,
      bio: "Experienced multi-subject tutor with expertise in various academic disciplines. Available for online and in-person sessions.",
      hourlyRate: 1500,
      subjects: ["Mathematics", "English", "Physics", "Computer Science", "Data Analysis"]
    });
    await storage.updateTutorCategoryStatus(tutorMainProfile.id, "school_tutoring", "approved");
    await storage.updateTutorCategoryStatus(tutorMainProfile.id, "higher_education", "approved");
    await storage.updateTutorCategoryStatus(tutorMainProfile.id, "professional_skills", "approved");
    await storage.updateTutorCategorySubjects(tutorMainProfile.id, "school_tutoring", ["Mathematics", "Physics", "English"]);
    await storage.updateTutorCategorySubjects(tutorMainProfile.id, "higher_education", ["Computer Science", "Data Science & Analytics"]);
    await storage.updateTutorCategorySubjects(tutorMainProfile.id, "professional_skills", ["Data Analysis", "Project Management"]);
    await storage.updateTutorVerificationStatus(tutorMainProfile.id, "approved");

    const tutor1 = await storage.createUser({
      email: "james.mwangi@lernentech.com",
      password,
      name: "James Mwangi",
      role: "tutor",
    });
    const tutor1Profile = await storage.createTutorProfile({
      userId: tutor1.id,
      bio: "Experienced Mathematics and Physics tutor with 8 years of teaching experience. Specializing in CBC curriculum and KCSE preparation.",
      hourlyRate: 1500,
      subjects: ["Mathematics", "Physics", "Science and Technology"]
    });
    await storage.updateTutorCategoryStatus(tutor1Profile.id, "school_tutoring", "approved");
    await storage.updateTutorCategorySubjects(tutor1Profile.id, "school_tutoring", ["Mathematics", "Physics", "Science & Technology"]);
    await storage.updateTutorVerificationStatus(tutor1Profile.id, "approved");

    const tutor2 = await storage.createUser({
      email: "sarah.wanjiru@lernentech.com",
      password,
      name: "Sarah Wanjiru",
      role: "tutor",
    });
    const tutor2Profile = await storage.createTutorProfile({
      userId: tutor2.id,
      bio: "Certified English and Kiswahili language expert. Cambridge-trained with focus on creative writing and exam techniques.",
      hourlyRate: 1200,
      subjects: ["English", "Kiswahili", "Creative Arts"]
    });
    await storage.updateTutorCategoryStatus(tutor2Profile.id, "school_tutoring", "approved");
    await storage.updateTutorCategorySubjects(tutor2Profile.id, "school_tutoring", ["English", "Kiswahili", "Creative Arts"]);
    await storage.updateTutorVerificationStatus(tutor2Profile.id, "approved");

    const tutor3 = await storage.createUser({
      email: "david.ochieng@lernentech.com",
      password,
      name: "David Ochieng",
      role: "tutor",
    });
    const tutor3Profile = await storage.createTutorProfile({
      userId: tutor3.id,
      bio: "Software Developer turned educator. Teaching programming, data analysis, and computer science fundamentals.",
      hourlyRate: 2000,
      subjects: ["Computer Science", "Web Development", "Programming Fundamentals", "Excel for Analytics"]
    });
    await storage.updateTutorCategoryStatus(tutor3Profile.id, "higher_education", "approved");
    await storage.updateTutorCategoryStatus(tutor3Profile.id, "professional_skills", "approved");
    await storage.updateTutorCategorySubjects(tutor3Profile.id, "higher_education", ["Computer Science", "Software Engineering"]);
    await storage.updateTutorCategorySubjects(tutor3Profile.id, "professional_skills", ["Web Development", "Programming Fundamentals", "Excel for Analytics"]);
    await storage.updateTutorVerificationStatus(tutor3Profile.id, "approved");

    // Student
    await storage.createUser({
      email: "student@lernentech.com",
      password,
      name: "John Kamau",
      role: "student",
    });
    
    console.log("Users seeded!");
  }

  if (programCount === 0) {
    console.log("Seeding programs and courses...");
    
    // Program 1: Data Analysis Fundamentals
    const program1 = await storage.createProgram({
      title: "Data Analysis Fundamentals",
      description: "Master the essential skills for data analysis. Learn Excel, Power BI, and SQL to transform raw data into actionable insights for business decision-making.",
      slug: "data-analysis-fundamentals",
      price: 15000,
      published: true
    });

    // Course 1 in Program 1
    const course1 = await storage.createCourse({
      title: "Excel for Data Analysis",
      description: "Learn advanced Excel techniques including pivot tables, VLOOKUP, data visualization, and dashboard creation.",
      slug: "excel-for-data-analysis",
      price: 5000,
      programId: program1.id,
      published: true
    });

    // Week 1
    const week1 = await storage.createWeek({ courseId: course1.id, weekNumber: 1, title: "Excel Basics and Navigation" });
    await storage.createContent({ weekId: week1.id, title: "Introduction to Excel Interface", type: "video", contentUrl: "https://www.youtube.com/watch?v=example1", sequenceOrder: 1 });
    await storage.createContent({ weekId: week1.id, title: "Basic Formulas and Functions", type: "reading", contentText: "# Basic Formulas\n\nExcel formulas start with an equals sign (=). Common functions include:\n\n- **SUM()** - Adds numbers\n- **AVERAGE()** - Calculates mean\n- **COUNT()** - Counts cells with numbers\n- **IF()** - Conditional logic\n\n## Practice Exercise\nCreate a simple budget tracker using these formulas.", sequenceOrder: 2 });
    await storage.createContent({ weekId: week1.id, title: "Practice Workbook", type: "file", contentUrl: "/files/week1-practice.xlsx", sequenceOrder: 3 });
    
    const quiz1 = await storage.createQuiz({ weekId: week1.id, title: "Week 1 Quiz", passScorePercent: 70, isFinalExam: false });
    await storage.createQuizQuestion({ quizId: quiz1.id, questionText: "Which symbol starts every Excel formula?", options: ["+", "=", "@", "#"], correctOptionIndex: 1 });
    await storage.createQuizQuestion({ quizId: quiz1.id, questionText: "What function calculates the average of a range?", options: ["SUM()", "AVERAGE()", "MEAN()", "AVG()"], correctOptionIndex: 1 });

    // Week 2
    const week2 = await storage.createWeek({ courseId: course1.id, weekNumber: 2, title: "Data Cleaning and Formatting" });
    await storage.createContent({ weekId: week2.id, title: "Text Functions and Data Cleaning", type: "video", contentUrl: "https://www.youtube.com/watch?v=example2", sequenceOrder: 1 });
    await storage.createContent({ weekId: week2.id, title: "Conditional Formatting Guide", type: "reading", contentText: "# Conditional Formatting\n\nHighlight cells based on their values to quickly identify trends, outliers, and patterns in your data.", sequenceOrder: 2 });
    
    const quiz2 = await storage.createQuiz({ weekId: week2.id, title: "Week 2 Quiz", passScorePercent: 70, isFinalExam: false });
    await storage.createQuizQuestion({ quizId: quiz2.id, questionText: "Which function removes extra spaces from text?", options: ["CLEAN()", "TRIM()", "REMOVE()", "STRIP()"], correctOptionIndex: 1 });

    // Week 3
    const week3 = await storage.createWeek({ courseId: course1.id, weekNumber: 3, title: "Pivot Tables and Charts" });
    await storage.createContent({ weekId: week3.id, title: "Creating Your First Pivot Table", type: "video", contentUrl: "https://www.youtube.com/watch?v=example3", sequenceOrder: 1 });
    await storage.createContent({ weekId: week3.id, title: "Chart Types and When to Use Them", type: "reading", contentText: "# Choosing the Right Chart\n\n- **Bar/Column**: Comparing categories\n- **Line**: Trends over time\n- **Pie**: Part-to-whole relationships\n- **Scatter**: Correlations between variables", sequenceOrder: 2 });
    
    const finalExam1 = await storage.createQuiz({ weekId: week3.id, title: "Final Exam: Excel Mastery", passScorePercent: 75, isFinalExam: true });
    await storage.createQuizQuestion({ quizId: finalExam1.id, questionText: "Which feature allows you to summarize large datasets?", options: ["Charts", "Pivot Tables", "Filters", "Sorting"], correctOptionIndex: 1 });
    await storage.createQuizQuestion({ quizId: finalExam1.id, questionText: "What chart type is best for showing trends over time?", options: ["Pie Chart", "Bar Chart", "Line Chart", "Scatter Plot"], correctOptionIndex: 2 });

    // Course 2: Power BI
    const course2 = await storage.createCourse({
      title: "Power BI Dashboarding",
      description: "Create interactive business dashboards with Microsoft Power BI. Learn data modeling, DAX formulas, and visualization best practices.",
      slug: "power-bi-dashboarding",
      price: 6000,
      programId: program1.id,
      published: true
    });

    const week4 = await storage.createWeek({ courseId: course2.id, weekNumber: 1, title: "Power BI Introduction" });
    await storage.createContent({ weekId: week4.id, title: "Getting Started with Power BI", type: "video", contentUrl: "https://www.youtube.com/watch?v=powerbi1", sequenceOrder: 1 });
    await storage.createQuiz({ weekId: week4.id, title: "Week 1 Assessment", passScorePercent: 70, isFinalExam: false });

    // Standalone Course: Web Development Basics
    const course3 = await storage.createCourse({
      title: "Web Development Fundamentals",
      description: "Start your journey into web development. Learn HTML, CSS, and JavaScript to build responsive, modern websites from scratch.",
      slug: "web-development-fundamentals",
      price: 8000,
      published: true
    });

    const webWeek1 = await storage.createWeek({ courseId: course3.id, weekNumber: 1, title: "HTML Foundations" });
    await storage.createContent({ weekId: webWeek1.id, title: "Understanding HTML Structure", type: "video", contentUrl: "https://www.youtube.com/watch?v=html1", sequenceOrder: 1 });
    await storage.createContent({ weekId: webWeek1.id, title: "HTML Tags Reference", type: "reading", contentText: "# Essential HTML Tags\n\n## Document Structure\n- `<html>` - Root element\n- `<head>` - Metadata\n- `<body>` - Visible content\n\n## Content Tags\n- `<h1>` to `<h6>` - Headings\n- `<p>` - Paragraphs\n- `<a>` - Links\n- `<img>` - Images", sequenceOrder: 2 });
    await storage.createQuiz({ weekId: webWeek1.id, title: "HTML Quiz", passScorePercent: 70, isFinalExam: false });

    // Program 2: Professional Skills
    const program2 = await storage.createProgram({
      title: "Career Acceleration Program",
      description: "Boost your professional skills with practical training in CV writing, interview techniques, public speaking, and leadership fundamentals.",
      slug: "career-acceleration-program",
      price: 12000,
      published: true
    });

    const course4 = await storage.createCourse({
      title: "CV and Interview Mastery",
      description: "Create a standout CV and ace your interviews. Learn from HR professionals and recruiters about what makes candidates memorable.",
      slug: "cv-and-interview-mastery",
      price: 4000,
      programId: program2.id,
      published: true
    });

    const cvWeek1 = await storage.createWeek({ courseId: course4.id, weekNumber: 1, title: "Crafting Your CV" });
    await storage.createContent({ weekId: cvWeek1.id, title: "CV Structure and Format", type: "video", contentUrl: "https://www.youtube.com/watch?v=cv1", sequenceOrder: 1 });
    await storage.createContent({ weekId: cvWeek1.id, title: "CV Templates", type: "file", contentUrl: "/files/cv-templates.docx", sequenceOrder: 2 });
    await storage.createQuiz({ weekId: cvWeek1.id, title: "CV Best Practices Quiz", passScorePercent: 70, isFinalExam: false });

    console.log("Programs and courses seeded!");
  }

  return httpServer;
}
