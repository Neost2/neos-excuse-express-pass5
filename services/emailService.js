import nodemailer from "nodemailer";
import {
  SESv2Client,
  SendEmailCommand,
} from "@aws-sdk/client-sesv2";

const sesClient = new SESv2Client({
  region: process.env.AWS_REGION || "us-east-1",
});

const transporter = nodemailer.createTransport({
  SES: {
    sesClient,
    SendEmailCommand,
  },
});

export async function sendDoctorNote({
  to,
  studentName,
  attachment,
}) {
  const safeStudentName = String(studentName || "Student")
    .replace(/[\r\n]/g, " ")
    .trim();

  return transporter.sendMail({
    from: `"Neo's Excuse Express" <${process.env.SES_FROM_EMAIL}>`,

    to,

    replyTo: process.env.REPLY_TO_EMAIL,

    subject: `Doctor Note - ${safeStudentName}`,

    text: `
A doctor note has been submitted through Neo's Excuse Express.

Student: ${safeStudentName}

Please see the attached document.

This message was sent at the request of the student's parent or guardian.
    `.trim(),

    html: `
      <h2>Neo's Excuse Express</h2>

      <p>A doctor note has been submitted for:</p>

      <p><strong>${safeStudentName}</strong></p>

      <p>Please see the attached document.</p>

      <p>
        This message was sent at the request of the student's
        parent or guardian.
      </p>
    `,

    attachments: [
      {
        filename: attachment.originalname || "doctor-note.jpg",
        content: attachment.buffer,
        contentType: attachment.mimetype,
      },
    ],
  });
}