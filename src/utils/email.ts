import nodemailer from "nodemailer";

export const sendEmail = async ({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}) => {
  // Internal email configuration - not dependent on environment variables
  const EMAIL_USER = "gdushimimana6@gmail.com";
  const EMAIL_PASS = "zvto hoen hrva oxor";

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: EMAIL_USER,
    to,
    subject,
    text: body,
  });
};
