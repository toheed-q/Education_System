import { storage } from "../storage";
import { db } from "../db";
import { courseWeeks, courseContent, completedContent, quizzes, quizAttempts } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

async function enrollAndOptionallyComplete() {
  const args = process.argv.slice(2);
  const emailIndex = args.indexOf('--email');
  const slugIndex = args.indexOf('--slug');
  const completeIndex = args.indexOf('--complete');

  if (emailIndex === -1 || slugIndex === -1) {
    console.error('Usage: npx tsx --env-file=.env server/scripts/enroll_test_user.ts --email <student_email> --slug <course_slug> [--complete]');
    process.exit(1);
  }

  const email = args[emailIndex + 1];
  const slug = args[slugIndex + 1];
  const shouldComplete = completeIndex !== -1;

  try {
    console.log(`[TEST-TOOL] Looking up user: ${email}`);
    const user = await storage.getUserByEmail(email);
    if (!user) {
      console.error(`Error: User with email ${email} not found.`);
      process.exit(1);
    }

    console.log(`[TEST-TOOL] Looking up course: ${slug}`);
    const course = await storage.getCourseBySlug(slug);
    if (!course) {
      console.error(`Error: Course with slug ${slug} not found.`);
      process.exit(1);
    }

    console.log(`[TEST-TOOL] Checking enrollment for User ID ${user.id} in Course ID ${course.id}`);
    const isEnrolled = await storage.isUserEnrolledInCourse(user.id, course.id);
    
    if (isEnrolled) {
      console.log(`[TEST-TOOL] User is already enrolled.`);
    } else {
      console.log(`[TEST-TOOL] Enrolling user...`);
      await storage.createEnrollment({
        userId: user.id,
        courseId: course.id
      });
      console.log(`[TEST-TOOL] Enrollment successful.`);
    }

    if (shouldComplete) {
      console.log(`[TEST-TOOL] Marking course as complete...`);

      // 1. Get all units for the course
      const units = await db.select().from(courseWeeks).where(eq(courseWeeks.courseId, course.id));
      
      for (const unit of units) {
        console.log(`[TEST-TOOL] Processing Unit: ${unit.title} (ID: ${unit.id})`);

        // 2. Mark all lessons as complete
        const lessons = await db.select().from(courseContent).where(eq(courseContent.weekId, unit.id));
        if (lessons.length > 0) {
          const lessonIds = lessons.map(l => l.id);
          for (const lId of lessonIds) {
            await storage.markLessonComplete(user.id, lId);
          }
          console.log(`[TEST-TOOL] Marked ${lessons.length} lessons as complete.`);
        }

        // 3. Auto-pass quiz if it exists
        const quiz = await storage.getWeekQuiz(unit.id);
        if (quiz) {
          console.log(`[TEST-TOOL] Found quiz: ${quiz.title}. Recording passing score...`);
          await db.insert(quizAttempts).values({
            userId: user.id,
            quizId: quiz.id,
            scorePercent: 100,
            passed: true,
            completedAt: new Date()
          });
        }
      }

      // 4. Trigger progress update to generate certificate
      console.log(`[TEST-TOOL] Triggering enrollment progress update...`);
      await storage.updateEnrollmentProgress(user.id, course.id);
      
      console.log(`[TEST-TOOL] Course 100% completed and certificate system triggered.`);
    }

    console.log(`[TEST-TOOL] Done.`);
    process.exit(0);
  } catch (error) {
    console.error(`[TEST-TOOL] Fatal error:`, error);
    process.exit(1);
  }
}

enrollAndOptionallyComplete();
