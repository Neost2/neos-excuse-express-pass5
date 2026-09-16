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
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1,
  },
});

const schools: Record<
  string,
  { name: string; email: string; verified: boolean }
> = {
  "wagoner-hs": {
    name: "Wagoner High School",
    email: "neost2@hotmail.com",
    verified: true,
  },

  "wagoner-ms": {
    name: "Wagoner Middle School",
    email: "neost2@hotmail.com",
    verified: true,
  },
};

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    mailMode: process.env.MAIL_MODE || "mock",
  });
});

app.post(
  "/api/send-excuse",
  upload.single("note"),
  async (req, res) => {
    try {
      const {
        schoolId,
        studentName,
        absenceDate,
        returnDate,
        parentEmail,
      } = req.body as Record<string, string>;

      const school = schools[schoolId];

      if (!school?.verified) {
        return res.status(400).json({
          error: "School destination is not verified.",
        });
      }

      if (!studentName || !absenceDate || !req.file) {
        return res.status(400).json({
          error:
            "Student, absence date, and note image are required.",
        });
      }

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

        return res.status(400).json({
          error: "Only image attachments are accepted.",
        });
      }

      const submissionId =
        `NEX-${Date.now()}-${crypto
          .randomBytes(3)
          .toString("hex")
          .toUpperCase()}`;

      const subject =
        `Attendance Documentation - ${studentName} - ${absenceDate}`;

      const text = [
        `Student: ${studentName}`,
        `Absence/appointment date: ${absenceDate}`,
        `Return date: ${returnDate || "Not provided"}`,
        "",
        "Please see the attached absence documentation.",
        "",
        "Submitted by a parent/guardian using Neo's ExcuseExpress.",
        `Submission ID: ${submissionId}`,
      ].join("\r\n");

      const mailMode = process.env.MAIL_MODE || "mock";

      if (mailMode === "ses") {
        const from = process.env.SES_FROM_EMAIL;

        if (!from) {
          throw new Error(
            "SES_FROM_EMAIL is required in ses mode",
          );
        }

        const client = new SESv2Client({
          region: process.env.AWS_REGION || "us-east-1",
        });

        const boundary =
          `neo-${crypto.randomBytes(12).toString("hex")}`;

        /*
         * iOS may upload the image as application/octet-stream
         * even though it is actually an image. Since we already
         * validated the upload above, use a safe image MIME type
         * for the email attachment when necessary.
         */
        const attachmentMime =
          req.file.mimetype.startsWith("image/")
            ? req.file.mimetype
            : "image/jpeg";

        /*
         * IMPORTANT:
         *
         * Do NOT use .filter(Boolean) here.
         *
         * MIME messages require blank lines between the headers
         * and body sections.
         */
        const headers = [
          `From: Neo's ExcuseExpress <${from}>`,
          ...(parentEmail
            ? [`Reply-To: ${parentEmail}`]
            : []),
          `To: ${school.email}`,
          `Subject: ${subject}`,
          "MIME-Version: 1.0",
          `Content-Type: multipart/mixed; boundary="${boundary}"`,
        ];

        const encodedAttachment = req.file.buffer
          .toString("base64")
          .match(/.{1,76}/g)
          ?.join("\r\n") ?? "";

        const raw = [
          ...headers,

          "",

          `--${boundary}`,
          'Content-Type: text/plain; charset="UTF-8"',
          "Content-Transfer-Encoding: 7bit",

          "",

          text,

          "",

          `--${boundary}`,
          `Content-Type: ${attachmentMime}; name="doctor-note.jpg"`,
          'Content-Disposition: attachment; filename="doctor-note.jpg"',
          "Content-Transfer-Encoding: base64",

          "",

          encodedAttachment,

          "",

          `--${boundary}--`,

          "",
        ].join("\r\n");

        console.log(
          `[SES] Sending ${submissionId} -> ${school.name} <${school.email}>`,
        );

        const result = await client.send(
          new SendEmailCommand({
            Content: {
              Raw: {
                Data: Buffer.from(raw),
              },
            },
          }),
        );

        console.log(
          `[SES] SUCCESS ${submissionId} MessageId=${result.MessageId}`,
        );
      } else {
        console.log(
          `[MOCK MAIL] ${submissionId} -> ${school.name} <${school.email}> | ${subject} | attachment ${req.file.size} bytes`,
        );
      }

      /*
       * The attachment only existed in process memory through
       * multer memoryStorage. This API does not intentionally
       * write the doctor's note to disk or a database.
       */
      return res.json({
        ok: true,
        submissionId,
        status:
          mailMode === "ses"
            ? "submitted"
            : "mock-submitted",
        schoolName: school.name,
      });
    } catch (error) {
      console.error("[SEND EXCUSE ERROR]", error);

      return res.status(500).json({
        error: "Unable to submit excuse.",
      });
    }
  },
);

app.listen(Number(process.env.PORT || 8080), () => {
  console.log(
    `Neo Send API listening on :${process.env.PORT || 8080}`,
  );
});