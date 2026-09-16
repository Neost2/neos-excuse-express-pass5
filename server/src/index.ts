import "dotenv/config";
import express, { type Request } from "express";
import cors from "cors";
import multer from "multer";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import crypto from "node:crypto";
import path from "node:path";

const app = express();

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(process.cwd(), "public")));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1,
  },
});

const REGION = process.env.AWS_REGION || "us-east-1";
const SCHOOLS_TABLE = process.env.SCHOOLS_TABLE || "neo-excuse-schools";

const ses = new SESv2Client({ region: REGION });

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
  {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  },
);

type SchoolRecord = {
  id: string;
  name: string;
  district?: string;
  attendanceEmail: string;
  contactName?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  schoolType?: string;
  verified: boolean;
  active: boolean;
  verificationTokenHash?: string;
  verificationExpiresAt?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
};

/*
 * Temporary legacy schools so the current mobile app keeps working
 * while we switch the app over to GET /api/schools.
 *
 * IMPORTANT: These are still your TEST destinations.
 * Replace/remove them before production launch.
 */
// const legacySchools: Record<
//   string,
//   { id: string; name: string; email: string; verified: boolean; active: boolean }
// > = {
//   "wagoner-hs": {
//     id: "wagoner-hs",
//     name: "Wagoner High School",
//     email: "neost2@hotmail.com",
//     verified: true,
//     active: true,
//   },
//   "wagoner-ms": {
//     id: "wagoner-ms",
//     name: "Wagoner Middle School",
//     email: "neost2@hotmail.com",
//     verified: true,
//     active: true,
//   },
// };

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeTokenMatch(expectedHash: string, actualHash: string) {
  try {
    const expected = Buffer.from(expectedHash, "hex");
    const actual = Buffer.from(actualHash, "hex");

    if (expected.length !== actual.length) return false;

    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return replacements[char] || char;
  });
}

function publicSchool(record: SchoolRecord) {
  return {
    id: record.id,
    name: record.name,
    district: record.district || "",
    city: record.city || "",
    state: record.state || "",
    verified: record.verified,
  };
}

function portalUrl(req: Request) {
  const configured = process.env.SCHOOL_PORTAL_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  return `${req.protocol}://${req.get("host")}/schools`;
}

async function findSchoolByEmail(email: string): Promise<SchoolRecord | null> {
  const result = await dynamo.send(
    new ScanCommand({
      TableName: SCHOOLS_TABLE,
      FilterExpression: "attendanceEmail = :email",
      ExpressionAttributeValues: {
        ":email": email,
      },
    }),
  );

  return (result.Items?.[0] as SchoolRecord | undefined) || null;
}

async function getSchoolRecord(id: string): Promise<SchoolRecord | null> {
  const result = await dynamo.send(
    new GetCommand({
      TableName: SCHOOLS_TABLE,
      Key: { id },
    }),
  );

  return (result.Item as SchoolRecord | undefined) || null;
}

async function getSchoolForSending(id: string) {
  const school = await getSchoolRecord(id);

  if (!school || !school.verified || !school.active) {
    return null;
  }

  return {
    id: school.id,
    name: school.name,
    email: school.attendanceEmail,
    verified: school.verified,
    active: school.active,
  };
}

async function sendVerificationEmail(
  to: string,
  schoolName: string,
  verificationLink: string,
) {
  const from = process.env.SES_FROM_EMAIL;

  if (!from) {
    throw new Error("SES_FROM_EMAIL is required");
  }

  const safeSchoolName = escapeHtml(schoolName);
  const safeLink = escapeHtml(verificationLink);

  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: from,
      Destination: {
        ToAddresses: [to],
      },
      Content: {
        Simple: {
          Subject: {
            Data: "Verify your school email for Neo's ExcuseExpress",
            Charset: "UTF-8",
          },
          Body: {
            Text: {
              Charset: "UTF-8",
              Data: [
                `Neo's ExcuseExpress school email verification`,
                "",
                `School: ${schoolName}`,
                "",
                "Open the link below to verify that this school controls the attendance/front-office email address:",
                verificationLink,
                "",
                "This verification link expires in 24 hours.",
                "",
                "If you did not request this registration, you can ignore this email.",
              ].join("\n"),
            },
            Html: {
              Charset: "UTF-8",
              Data: `
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#17202a">
                  <h2>Verify your school email</h2>
                  <p><strong>School:</strong> ${safeSchoolName}</p>
                  <p>
                    Neo's ExcuseExpress received a request to use this email address
                    for parent-submitted attendance documentation.
                  </p>
                  <p>
                    <a
                      href="${safeLink}"
                      style="display:inline-block;background:#16a57d;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:bold"
                    >
                      Verify school email
                    </a>
                  </p>
                  <p>This verification link expires in 24 hours.</p>
                  <p style="color:#657786;font-size:13px">
                    If you did not request this registration, you can ignore this email.
                  </p>
                </div>
              `,
            },
          },
        },
      },
    }),
  );
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    mailMode: process.env.MAIL_MODE || "mock",
    schoolsTable: SCHOOLS_TABLE,
  });
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "school-register.html"));
});

app.get("/schools", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "school-register.html"));
});

/*
 * Public list used by the mobile app.
 * Only verified + active DynamoDB schools are exposed.
 */
app.get("/api/schools", async (_req, res) => {
  try {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: SCHOOLS_TABLE,
      }),
    );

    const dynamoSchools = (result.Items || [])
      .map((item) => item as SchoolRecord)
      .filter((school) => school.verified === true && school.active === true)
      .map(publicSchool);

    const schools = dynamoSchools.sort((a, b) =>
  a.name.localeCompare(b.name),
);

   return res.json({
  ok: true,
  schools,
});
  } catch (error) {
    console.error("[LIST SCHOOLS ERROR]", error);

    return res.status(500).json({
      error: "Unable to load schools.",
    });
  }
});

/*
 * Register a school.
 * The browser cannot make a school verified.
 * The backend always saves new registrations as:
 *   verified = false
 *   active = false
 */
app.post("/api/schools/register", async (req, res) => {
  try {
    const {
      schoolName,
      district,
      attendanceEmail,
      contactName,
      contactPhone,
      address,
      city,
      state,
      zip,
      schoolType,
    } = req.body as Record<string, string>;

    const name = schoolName?.trim();
    const email = normalizeEmail(attendanceEmail || "");
    const contact = contactName?.trim();

    if (!name || !email || !contact) {
      return res.status(400).json({
        error:
          "School name, attendance email, and contact name are required.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: "Enter a valid school email address.",
      });
    }

    const existing = await findSchoolByEmail(email);

    if (existing?.verified && existing.active) {
      return res.status(409).json({
        error: "This school email is already registered and verified.",
      });
    }

    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const schoolId = existing?.id || crypto.randomUUID();
    const secret = crypto.randomBytes(32).toString("base64url");

    /*
     * The school ID is safe to include in the URL.
     * The secret itself is NEVER stored in DynamoDB.
     */
    const verificationToken = `${schoolId}.${secret}`;
    const verificationTokenHash = hashToken(secret);

    const record: SchoolRecord = {
      id: schoolId,
      name,
      district: district?.trim() || "",
      attendanceEmail: email,
      contactName: contact,
      contactPhone: contactPhone?.trim() || "",
      address: address?.trim() || "",
      city: city?.trim() || "",
      state: state?.trim().toUpperCase() || "",
      zip: zip?.trim() || "",
      schoolType: schoolType?.trim() || "other",
      verified: false,
      active: false,
      verificationTokenHash,
      verificationExpiresAt: expires.toISOString(),
      createdAt: existing?.createdAt || now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await dynamo.send(
      new PutCommand({
        TableName: SCHOOLS_TABLE,
        Item: record,
      }),
    );

    const verificationLink =
      `${portalUrl(req)}?verify=${encodeURIComponent(verificationToken)}`;

    await sendVerificationEmail(email, name, verificationLink);

    console.log(
      `[SCHOOL REGISTER] ${record.id} ${record.name} <${record.attendanceEmail}> pending verification`,
    );

    return res.status(201).json({
      ok: true,
      registrationId: record.id,
      status: "pending_verification",
    });
  } catch (error) {
    console.error("[SCHOOL REGISTER ERROR]", error);

    return res.status(500).json({
      error: "Unable to register school.",
    });
  }
});

/*
 * Verify the token sent to the school email.
 * Only this backend endpoint is allowed to set verified=true.
 */
app.get("/api/schools/verify", async (req, res) => {
  try {
    const token = String(req.query.token || "");

    const dotIndex = token.indexOf(".");

    if (dotIndex <= 0) {
      return res.status(400).json({
        error: "Invalid verification token.",
      });
    }

    const schoolId = token.slice(0, dotIndex);
    const secret = token.slice(dotIndex + 1);

    if (!schoolId || !secret) {
      return res.status(400).json({
        error: "Invalid verification token.",
      });
    }

    const school = await getSchoolRecord(schoolId);

    if (!school) {
      return res.status(404).json({
        error: "School registration was not found.",
      });
    }

    if (school.verified && school.active) {
      return res.json({
        ok: true,
        status: "verified",
        school: publicSchool(school),
      });
    }

    if (
      !school.verificationTokenHash ||
      !school.verificationExpiresAt
    ) {
      return res.status(400).json({
        error: "This verification request is no longer valid.",
      });
    }

    if (new Date(school.verificationExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({
        error: "This verification link has expired.",
      });
    }

    const providedHash = hashToken(secret);

    if (!safeTokenMatch(school.verificationTokenHash, providedHash)) {
      return res.status(400).json({
        error: "Invalid verification token.",
      });
    }

    const verifiedAt = new Date().toISOString();

    await dynamo.send(
      new UpdateCommand({
        TableName: SCHOOLS_TABLE,
        Key: {
          id: school.id,
        },
        UpdateExpression:
          "SET verified = :true, active = :true, verifiedAt = :verifiedAt, updatedAt = :updatedAt REMOVE verificationTokenHash, verificationExpiresAt",
        ExpressionAttributeValues: {
          ":true": true,
          ":verifiedAt": verifiedAt,
          ":updatedAt": verifiedAt,
        },
      }),
    );

    console.log(
      `[SCHOOL VERIFIED] ${school.id} ${school.name} <${school.attendanceEmail}>`,
    );

    return res.json({
      ok: true,
      status: "verified",
      school: {
        ...publicSchool(school),
        verified: true,
      },
    });
  } catch (error) {
    console.error("[SCHOOL VERIFY ERROR]", error);

    return res.status(500).json({
      error: "Unable to verify school email.",
    });
  }
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

      const school = await getSchoolForSending(schoolId);

      if (!school?.verified || !school.active) {
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

        const boundary =
          `neo-${crypto.randomBytes(12).toString("hex")}`;

        const attachmentMime =
          req.file.mimetype.startsWith("image/")
            ? req.file.mimetype
            : "image/jpeg";

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

        const encodedAttachment =
          req.file.buffer
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

        const result = await ses.send(
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
