"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
// create reusable transporter object using the default SMTP transport
let mailer = nodemailer_1.default.createTransport({
    service: "gmail",
    auth: {
        user: "nkakaeric96@gmail.com",
        pass: "ddyphltnuxwxbzzc", // generated ethereal password
    },
});
const sendEmail = async ({ html, subject, to, names }) => {
    let info = await mailer.sendMail({
        from: '"Account manager 👻" <account-manager@example.com>',
        to: to,
        subject: subject,
        text: "Hello ," + names,
        html: html, // html body
    });
    console.log("Message sent: %s", info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
    // Preview only available when sending through an Ethereal account
    console.log("Preview URL: %s", nodemailer_1.default.getTestMessageUrl(info));
};
exports.default = sendEmail;
