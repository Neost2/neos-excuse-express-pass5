import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import crypto from "node:crypto";

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});
const schools: Record<
  string,
  { name: string; email: string; verified: boolean }
> = {
  "wagoner-hs": {
    name: "Wagoner High School",
    email: "DEMO-attendance@school.example",
    verified: true,
  },
  "wagoner-ms": {
    name: "Wagoner Middle School",
    email: "DEMO-frontdesk@school.example",
    verified: true,
  },
};
app.get("/health", (_req, res) =>
  res.json({ ok: true, mailMode: process.env.MAIL_MODE || "mock" }),
);
app.post("/api/send-excuse", upload.single("note"), async (req, res) => {
  try {
    const { schoolId, studentName, absenceDate, returnDate, parentEmail } =
      req.body as Record<string, string>;
    const school = schools[schoolId];
    if (!school?.verified)
      return res
        .status(400)
        .json({ error: "School destination is not verified." });
    if (!studentName || !absenceDate || !req.file)
      return res
        .status(400)
        .json({ error: "Student, absence date, and note image are required." });
    const filename = req.file.originalname.toLowerCase();

    const looksLikeImage =
      req.file.mimetype.startsWith("image/") ||
      /\.(jpg|jpeg|png|heic|heif)$/.test(filename);

    if (!looksLikeImage) {
      console.log("Rejected upload:", {
        mimetype: req.file.mimetype,
        originalname: req.file.originalname,
        size: req.file.size,
      });

      return res
        .status(400)
        .json({ error: "Only image attachments are accepted." });
    }
    const submissionId = `NEX-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const subject = `Attendance Documentation - ${studentName} - ${absenceDate}`;
    const text = `Student: ${studentName}\nAbsence/appointment date: ${absenceDate}\nReturn date: ${returnDate || "Not provided"}\n\nPlease see the attached absence documentation.\n\nSubmitted by a parent/guardian using Neo's ExcuseExpress.\nSubmission ID: ${submissionId}`;
    if ((process.env.MAIL_MODE || "mock") === "ses") {
      const from = process.env.SES_FROM_EMAIL;
      if (!from) throw new Error("SES_FROM_EMAIL is required in ses mode");
      const client = new SESv2Client({
        region: process.env.AWS_REGION || "us-east-1",
      });
      const boundary = `neo-${crypto.randomBytes(12).toString("hex")}`;
      const raw = [
        `From: Neo's ExcuseExpress <${from}>`,
        parentEmail ? `Reply-To: ${parentEmail}` : "",
        `To: ${school.email}`,
        `Subject: ${subject}`,
        "MIME-Version: 1.0",
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        "",
        `--${boundary}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        text,
        `--${boundary}`,
        `Content-Type: ${req.file.mimetype}`,
        `Content-Disposition: attachment; filename="doctor-note.jpg"`,
        "Content-Transfer-Encoding: base64",
        "",
        req.file.buffer.toString("base64").replace(/(.{76})/g, "$1\r\n"),
        `--${boundary}--`,
      ]
        .filter(Boolean)
        .join("\r\n");
      await client.send(
        new SendEmailCommand({ Content: { Raw: { Data: Buffer.from(raw) } } }),
      );
    } else {
      console.log(
        `[MOCK MAIL] ${submissionId} -> ${school.name} <${school.email}> | ${subject} | attachment ${req.file.size} bytes`,
      );
    }
    // Attachment only existed in process memory (multer memoryStorage); it is not written to disk/database by this API.
    res.json({
      ok: true,
      submissionId,
      status:
        (process.env.MAIL_MODE || "mock") === "ses"
          ? "submitted"
          : "mock-submitted",
      schoolName: school.name,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Unable to submit excuse." });
  }
});
app.listen(Number(process.env.PORT || 8080), () =>
  console.log(`Neo Send API listening on :${process.env.PORT || 8080}`),
);
