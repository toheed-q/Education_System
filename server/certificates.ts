import PDFDocument from 'pdfkit';
import { type Certificate, type User, type Course, type Program } from '@shared/schema';
import { format } from 'date-fns';
import path from 'path';
import fs from 'fs';

interface CertificateData {
  certificate: Certificate;
  user: User;
  course?: Course;
  program?: Program;
}

export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      layout: 'landscape',
      size: 'A4',
      margin: 0,
    });

    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Background Colors
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f8fafc');
    
    // Decorative Border
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
       .lineWidth(2)
       .stroke('#e2e8f0');
    
    doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
       .lineWidth(1)
       .stroke('#cbd5e1');

    // Header / Logo area
    doc.fillColor('#1e293b')
       .fontSize(30)
       .font('Helvetica-Bold')
       .text('LernenTech Portal', 0, 80, { align: 'center' });
    
    doc.fillColor('#64748b')
       .fontSize(14)
       .font('Helvetica')
       .text('EXCELLENCE IN DIGITAL EDUCATION', 0, 115, { align: 'center' });

    // Certificate Title
    doc.fillColor('#0f172a')
       .fontSize(48)
       .font('Times-BoldItalic')
       .text('Certificate of Completion', 0, 180, { align: 'center' });

    doc.fillColor('#475569')
       .fontSize(16)
       .font('Helvetica')
       .text('This is to certify that', 0, 250, { align: 'center' });

    // User Name
    doc.fillColor('#2563eb')
       .fontSize(36)
       .font('Helvetica-Bold')
       .text(data.user.name, 0, 280, { align: 'center' });

    doc.fillColor('#475569')
       .fontSize(16)
       .font('Helvetica')
       .text('has successfully completed the course', 0, 330, { align: 'center' });

    // Course Name
    const courseTitle = data.course?.title || data.program?.title || 'Unknown Course';
    doc.fillColor('#0f172a')
       .fontSize(28)
       .font('Helvetica-Bold')
       .text(`"${courseTitle}"`, 0, 360, { align: 'center' });

    // Completion Date
    const completionDate = data.certificate.issuedAt 
      ? format(new Date(data.certificate.issuedAt), 'MMMM do, yyyy')
      : format(new Date(), 'MMMM do, yyyy');

    doc.fillColor('#64748b')
       .fontSize(14)
       .font('Helvetica')
       .text(`Issued on ${completionDate}`, 0, 410, { align: 'center' });

    // Signature Area
    const sigY = 480;
    doc.moveTo(200, sigY).lineTo(400, sigY).stroke('#94a3b8');
    doc.moveTo(442, sigY).lineTo(642, sigY).stroke('#94a3b8');

    doc.fillColor('#475569')
       .fontSize(12)
       .text('Program Director', 200, sigY + 10, { width: 200, align: 'center' });
    doc.text('Lead Instructor', 442, sigY + 10, { width: 200, align: 'center' });

    // Verification Code
    doc.fillColor('#94a3b8')
       .fontSize(10)
       .font('Courier')
       .text(`Verification ID: ${data.certificate.code}`, 50, doc.page.height - 60);

    doc.text(`Verify at: learning-tech-portal.com/verify/${data.certificate.code}`, 50, doc.page.height - 45);

    doc.end();
  });
}
