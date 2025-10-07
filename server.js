import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
// eslint-disable-next-line no-undef
const PORT = process.env.PORT || 5174; // separate from Vite 5173

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Email endpoint
app.post('/api/send-confirmation', async (req, res) => {
  try {
    const {
      studentEmail,
      studentName,
      formSummary,
    } = req.body || {};

    if (!studentEmail || !studentName) {
      return res.status(400).json({ error: 'studentEmail and studentName are required' });
    }

    const {
      GMAIL_USER,
      GMAIL_PASS,
      ADMIN_EMAIL,
      PUBLIC_URL = 'http://localhost:5173',
    // eslint-disable-next-line no-undef
    } = process.env;

    if (!GMAIL_USER || !GMAIL_PASS) {
      return res.status(500).json({ error: 'Email credentials are not configured' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    });

    const logoUrl = `${PUBLIC_URL}/DBOS-logo-300x300.png`;

    const studentHtml = `
      <div style="font-family:Arial, Helvetica, sans-serif; color:#0D0D6B;">
        <div style="text-align:center; margin-bottom:16px;">
          <img src="${logoUrl}" alt="DBOS" width="96" height="96" style="border-radius:8px;" />
          <h1 style="margin:8px 0 0; font-size:22px;">Dihing Board of Open Schooling</h1>
          <div style="color:#444; font-weight:600;">A Govt. Recognised Board | An ISO 9001:2015 Certified Board</div>
        </div>
        <div style="border-top:4px solid #FF580A; border-bottom:4px solid #0D0D6B; padding:16px; border-radius:8px; background:#ffffff;">
          <p style="font-size:14px; color:#222;">Dear ${studentName},</p>
          <p style="font-size:14px; color:#222;">Your admission form has been successfully received by DBOS. This is an acknowledgement of your submission.</p>
          ${formSummary ? `<div style="margin-top:12px; font-size:13px; color:#222;"><strong>Summary:</strong><br/>${formSummary}</div>` : ''}
          <p style="font-size:13px; color:#222; margin-top:16px;">We will review your application and contact you if anything else is required.</p>
          <p style="font-size:13px; color:#222; margin-top:16px;">Regards,<br/>DBOS Admissions</p>
        </div>
      </div>
    `;

    const adminHtml = `
      <div style="font-family:Arial, Helvetica, sans-serif; color:#0D0D6B;">
        <div style="text-align:center; margin-bottom:16px;">
          <img src="${logoUrl}" alt="DBOS" width="64" height="64" style="border-radius:8px;" />
          <h2 style="margin:8px 0 0; font-size:18px;">New Admission Form Received</h2>
        </div>
        <div style="padding:12px; background:#fff; border:1px solid #eee; border-radius:8px;">
          <div style="font-size:14px; color:#222;">
            <div><strong>Name:</strong> ${studentName}</div>
            <div><strong>Email:</strong> ${studentEmail}</div>
            ${formSummary ? `<div style="margin-top:8px;"><strong>Summary:</strong><br/>${formSummary}</div>` : ''}
          </div>
        </div>
      </div>
    `;

    // Send to student
    await transporter.sendMail({
      from: {
        name: 'DBOS Admissions',
        address: GMAIL_USER,
      },
      to: studentEmail,
      subject: 'DBOS - Admission Form Submission Confirmation',
      html: studentHtml,
    });

    // Notify admin if configured
    if (ADMIN_EMAIL) {
      await transporter.sendMail({
        from: {
          name: 'DBOS Admissions',
          address: GMAIL_USER,
        },
        to: ADMIN_EMAIL,
        subject: 'DBOS - New Admission Form Received',
        html: adminHtml,
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Email send failed', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

app.listen(PORT, () => {
  console.log(`Email server listening on http://localhost:${PORT}`);
});


