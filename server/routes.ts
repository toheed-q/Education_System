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
    const programs = await storage.getPrograms();
    res.json(programs);
  });

  app.get(api.programs.get.path, async (req, res) => {
    const program = await storage.getProgram(Number(req.params.id));
    if (!program) return res.status(404).json({ message: "Program not found" });
    // TODO: fetch courses for program
    res.json({ ...program, courses: [] }); 
  });

  app.get(api.courses.list.path, async (req, res) => {
    const courses = await storage.getCourses();
    res.json(courses);
  });

  app.get(api.courses.get.path, async (req, res) => {
    const courseId = Number(req.params.id);
    const course = await storage.getCourse(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });
    
    const weeks = await storage.getCourseWeeks(courseId);
    const weeksWithContent = await Promise.all(weeks.map(async w => {
      const content = await storage.getWeekContent(w.id);
      const quiz = await storage.getWeekQuiz(w.id);
      return { ...w, content, quiz };
    }));

    res.json({ ...course, weeks: weeksWithContent });
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

  // Bookings
  app.post(api.bookings.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.bookings.create.input.parse(req.body);
      const booking = await storage.createBooking({ 
        ...input, 
        studentId: (req.user as any).id,
        pricePaid: 0 // Should come from program/tutor rate logic
      });
      res.status(201).json(booking);
    } catch (err) {
      res.status(400).json({ message: "Invalid booking" });
    }
  });

  app.get(api.bookings.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const bookings = await storage.getBookingsForUser(user.id, user.role);
    res.json(bookings);
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
    const message = await storage.createMessage({
      ...input,
      senderId: (req.user as any).id,
    });
    res.status(201).json(message);
  });

  // Seed Data
  if (process.env.NODE_ENV !== "production") {
    const count = await storage.countUsers();
    if (count === 0) {
      console.log("Seeding database...");
      const password = await argon2.hash("password123");
      
      // Admin
      await storage.createUser({
        email: "admin@lernentech.com",
        password,
        name: "Super Admin",
        role: "super_admin",
        isVerified: true
      });

      // Tutor
      const tutor = await storage.createUser({
        email: "tutor@lernentech.com",
        password,
        name: "Jane Tutor",
        role: "tutor",
        isVerified: true
      });
      
      await storage.createTutorProfile({
        userId: tutor.id,
        bio: "Expert Math Tutor",
        hourlyRate: 1500,
        subjects: ["Math", "Physics"]
      });

      // Student
      await storage.createUser({
        email: "student@lernentech.com",
        password,
        name: "John Student",
        role: "student",
        isVerified: true
      });
      
      console.log("Database seeded!");
    }
  }

  return httpServer;
}
