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
    const programs = await storage.getProgramsWithCourseCounts();
    res.json(programs);
  });

  app.get(api.programs.get.path, async (req, res) => {
    const program = await storage.getProgram(Number(req.params.id));
    if (!program) return res.status(404).json({ message: "Program not found" });
    const programCourses = await storage.getCoursesByProgram(program.id);
    res.json({ ...program, courses: programCourses }); 
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
      isVerified: true
    });

    // Additional Admin
    await storage.createUser({
      email: "admin@lernentech.com",
      password,
      name: "Admin User",
      role: "admin",
      isVerified: true
    });

    // Tutors
    // Main tutor test account (per requirements)
    const tutorMain = await storage.createUser({
      email: "tutor@lernentech.com",
      password,
      name: "Test Tutor",
      role: "tutor",
      isVerified: true
    });
    await storage.createTutorProfile({
      userId: tutorMain.id,
      bio: "Experienced multi-subject tutor with expertise in various academic disciplines. Available for online and in-person sessions.",
      hourlyRate: 1500,
      subjects: ["Mathematics", "English", "Science"]
    });

    const tutor1 = await storage.createUser({
      email: "james.mwangi@lernentech.com",
      password,
      name: "James Mwangi",
      role: "tutor",
      isVerified: true
    });
    await storage.createTutorProfile({
      userId: tutor1.id,
      bio: "Experienced Mathematics and Physics tutor with 8 years of teaching experience. Specializing in CBC curriculum and KCSE preparation.",
      hourlyRate: 1500,
      subjects: ["Mathematics", "Physics", "Science and Technology"]
    });

    const tutor2 = await storage.createUser({
      email: "sarah.wanjiru@lernentech.com",
      password,
      name: "Sarah Wanjiru",
      role: "tutor",
      isVerified: true
    });
    await storage.createTutorProfile({
      userId: tutor2.id,
      bio: "Certified English and Kiswahili language expert. Cambridge-trained with focus on creative writing and exam techniques.",
      hourlyRate: 1200,
      subjects: ["English", "Kiswahili", "Creative Arts"]
    });

    const tutor3 = await storage.createUser({
      email: "david.ochieng@lernentech.com",
      password,
      name: "David Ochieng",
      role: "tutor",
      isVerified: true
    });
    await storage.createTutorProfile({
      userId: tutor3.id,
      bio: "Software Developer turned educator. Teaching programming, data analysis, and computer science fundamentals.",
      hourlyRate: 2000,
      subjects: ["Computer Science", "Web Development", "Programming Fundamentals", "Excel for Analytics"]
    });

    // Student
    await storage.createUser({
      email: "student@lernentech.com",
      password,
      name: "John Kamau",
      role: "student",
      isVerified: true
    });
    
    console.log("Users seeded!");
  }

  if (programCount === 0) {
    console.log("Seeding programs and courses...");
    
    // Program 1: Data Analysis Fundamentals
    const program1 = await storage.createProgram({
      title: "Data Analysis Fundamentals",
      description: "Master the essential skills for data analysis. Learn Excel, Power BI, and SQL to transform raw data into actionable insights for business decision-making.",
      price: 15000,
      published: true
    });

    // Course 1 in Program 1
    const course1 = await storage.createCourse({
      title: "Excel for Data Analysis",
      description: "Learn advanced Excel techniques including pivot tables, VLOOKUP, data visualization, and dashboard creation.",
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
      price: 12000,
      published: true
    });

    const course4 = await storage.createCourse({
      title: "CV and Interview Mastery",
      description: "Create a standout CV and ace your interviews. Learn from HR professionals and recruiters about what makes candidates memorable.",
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
