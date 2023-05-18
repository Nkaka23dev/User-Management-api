import nodemailer from "nodemailer";

// create reusable transporter object using the default SMTP transport
let mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "nkakaeric96@gmail.com", // generated ethereal user
    pass: "ddyphltnuxwxbzzc", // generated ethereal password
  },
});

const sendEmail = async ({ html, subject, to, names }: any) => {
  let info = await mailer.sendMail({
    from: '"Account manager 👻" <account-manager@example.com>', // sender address
    to: to, // list of receivers
    subject: subject, // Subject line
    text: "Hello ," + names, // plain text body
    html: html, // html body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
};

export default sendEmail;
