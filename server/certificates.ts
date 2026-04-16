import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { format } from 'date-fns';
import fs from 'fs';
import { getCertificateTemplatePath } from './routes';

interface CertificateData {
  userName: string;
  courseTitle: string;
  issueDate: Date;
  certificateCode: string;
}

// Helper: convert hex color string to pdf-lib rgb (0–1 range)
function hex(h: string) {
  const n = parseInt(h.replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  // A4 landscape: 841.89 x 595.28 pt
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  const fontMono    = await pdfDoc.embedFont(StandardFonts.Courier);

  // Helper: draw centered text at a given Y from top
  const centerText = (text: string, yFromTop: number, font: typeof fontBold, size: number, color: string) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - textWidth) / 2, y: height - yFromTop, size, font, color: hex(color) });
  };

  // ── Background: custom template or built-in design ──
  const templatePath = getCertificateTemplatePath();
  if (templatePath) {
    // Embed the uploaded template image as the full-page background
    const imgBytes = fs.readFileSync(templatePath);
    const ext = templatePath.toLowerCase();
    const embeddedImg = ext.endsWith('.png')
      ? await pdfDoc.embedPng(imgBytes)
      : await pdfDoc.embedJpg(imgBytes);
    page.drawImage(embeddedImg, { x: 0, y: 0, width, height });
  } else {
    // Built-in default design
    page.drawRectangle({ x: 0, y: 0, width, height, color: hex('#f8fafc') });
    page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 40,
      borderColor: hex('#e2e8f0'), borderWidth: 2 });
    page.drawRectangle({ x: 30, y: 30, width: width - 60, height: height - 60,
      borderColor: hex('#cbd5e1'), borderWidth: 1 });

    centerText('LernenTech Portal',          80,  fontBold,    28, '#1e293b');
    centerText('EXCELLENCE IN DIGITAL EDUCATION', 112, fontRegular, 12, '#64748b');
    page.drawLine({ start: { x: width * 0.3, y: height - 125 }, end: { x: width * 0.7, y: height - 125 },
      thickness: 1, color: hex('#e2e8f0') });
  }

  // ── Text overlay (always rendered on top of background) ──
  if (!templatePath) {
    // Only render the title block for the default design
    centerText('Certificate of Completion', 175, fontOblique, 38, '#0f172a');
    centerText('This is to certify that',   230, fontRegular, 14, '#475569');
  } else {
    // For custom templates, start text lower to avoid covering the template header
    centerText('Certificate of Completion', 155, fontOblique, 34, '#0f172a');
    centerText('This is to certify that',   210, fontRegular, 14, '#475569');
  }

  const nameY    = templatePath ? 248 : 268;
  const bodyY    = templatePath ? 290 : 310;
  const titleY   = templatePath ? 325 : 345;
  const dateY    = templatePath ? 375 : 390;
  const sigY     = height - (templatePath ? 480 : 460);

  centerText(data.userName, nameY, fontBold, 32, '#2563eb');
  centerText('has successfully completed the course', bodyY, fontRegular, 14, '#475569');

  const courseText = `"${data.courseTitle}"`;
  const courseSize = 24;
  const courseWidth = fontBold.widthOfTextAtSize(courseText, courseSize);
  page.drawText(courseText, {
    x: (width - Math.min(courseWidth, width - 100)) / 2,
    y: height - titleY,
    size: courseSize,
    font: fontBold,
    color: hex('#0f172a'),
    maxWidth: width - 100,
  });

  const completionDate = format(new Date(data.issueDate), 'MMMM do, yyyy');
  centerText(`Issued on ${completionDate}`, dateY, fontRegular, 13, '#64748b');

  // Signature lines
  const sig1X = width * 0.22;
  const sig2X = width * 0.55;
  const sigW  = 160;
  page.drawLine({ start: { x: sig1X, y: sigY }, end: { x: sig1X + sigW, y: sigY },
    thickness: 1, color: hex('#94a3b8') });
  page.drawLine({ start: { x: sig2X, y: sigY }, end: { x: sig2X + sigW, y: sigY },
    thickness: 1, color: hex('#94a3b8') });

  const label1 = 'Program Director';
  const label2 = 'Lead Instructor';
  page.drawText(label1, {
    x: sig1X + (sigW - fontRegular.widthOfTextAtSize(label1, 11)) / 2,
    y: sigY - 16, size: 11, font: fontRegular, color: hex('#475569'),
  });
  page.drawText(label2, {
    x: sig2X + (sigW - fontRegular.widthOfTextAtSize(label2, 11)) / 2,
    y: sigY - 16, size: 11, font: fontRegular, color: hex('#475569'),
  });

  // Verification footer
  page.drawText(`Verification ID: ${data.certificateCode}`, {
    x: 50, y: 42, size: 9, font: fontMono, color: hex('#94a3b8'),
  });
  page.drawText(`Verify at: lernentech.com/verify/${data.certificateCode}`, {
    x: 50, y: 28, size: 9, font: fontMono, color: hex('#94a3b8'),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
