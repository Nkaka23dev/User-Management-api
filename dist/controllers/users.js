"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verify2fa = exports.requestVerification = exports.changePassword = exports.update = exports.resetPassword = exports.getCurrentUser = exports.forgotPassword = exports.refreshToken = exports.googleSignin = exports.signup = exports.signin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const google_auth_library_1 = require("google-auth-library");
const db_1 = __importDefault(require("../lib/db"));
const client_1 = require("@prisma/client");
const sendEmail_1 = __importDefault(require("../utils/sendEmail"));
dotenv_1.default.config();
const SECRET = process.env.SECRET || "123456";
function findUserById(id) {
    return db_1.default.user
        .findUnique({
        where: {
            id,
        },
        include: {
            verification: true,
        },
    })
        .then((e) => {
        console.log(e);
        return e;
    });
}
function findUserByEmail(email) {
    return db_1.default.user
        .findUnique({
        where: {
            email,
        },
        include: {
            verification: true,
        },
    })
        .then((e) => {
        return e;
    });
}
const formatProfile = (user) => {
    // console.log(user);
    return {
        id: user._id || user.id || "",
        email: user.email,
        username: user.names || "",
        photo: user?.photo || "",
        nationality: user.nationality || "",
        birth: user.birth || "",
        gender: user.gender || "",
        verification_status: user?.verification?.status || "unverified",
    };
};
const sendBack = (res, user, allowTokens) => {
    const userData = formatProfile(user);
    const access_token = jsonwebtoken_1.default.sign(userData, SECRET, {
        expiresIn: "15m",
    });
    const refresh_token = jsonwebtoken_1.default.sign(userData, SECRET, {
        expiresIn: "7d",
    });
    const resp = user.provider === "google" || allowTokens
        ? { access_token, refresh_token }
        : {};
    res.status(200).json({ ...userData, ...resp });
};
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, "postmessage");
const send2faToken = async (user) => {
    // crypto.randomBytes(32, async (err, buffer) => {
    // const token = buffer.toString("hex");
    const generateOTP = (otp_length) => {
        var digits = "0123456789";
        let OTP = "";
        for (let i = 0; i < otp_length; i++) {
            OTP += digits[Math.floor(Math.random() * 10)];
        }
        return OTP;
    };
    const generated = generateOTP(6);
    await (0, sendEmail_1.default)({
        html: `hello, here is your 2fa code: ${generated}`,
        subject: "Here is your login link.",
        to: user.email,
        names: user.names,
    });
    await db_1.default.twoFactorAuth.upsert({
        where: {
            user_id: user.id,
        },
        create: {
            token: generated,
            user_id: user.id,
        },
        update: {},
    });
    // });
};
const signin = async (req, res, next) => {
    const { email, password } = req.body; //Coming from formData
    try {
        const user = await findUserByEmail(email);
        if (!user)
            return next("User not found");
        const isPasswordCorrect = await bcryptjs_1.default.compare(password, user.password || "");
        if (!isPasswordCorrect)
            return next("Password is incorrect");
        await send2faToken(user);
        sendBack(res, user);
    }
    catch (err) {
        console.log(err);
        return next(err.message);
    }
};
exports.signin = signin;
const signup = async (req, res, next) => {
    const { email, password, nationality, martal_status, birth, names, gender, photo, } = req.body;
    try {
        const user = await findUserByEmail(email);
        if (user)
            return next("Email already in use.");
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const result = await db_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                birth,
                nationality,
                provider: "email",
                martal_status,
                names,
                gender,
                photo,
            },
            include: {
                verification: true,
            },
        });
        await send2faToken(result);
        sendBack(res, result);
    }
    catch (error) {
        console.log(error);
        return next(error.message);
    }
};
exports.signup = signup;
const googleSignin = async (req, res, next) => {
    const token = req.body.token;
    try {
        const result = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const user = await db_1.default.user.findUnique({
            where: {
                email: result.getPayload().email,
            },
        });
        if (user) {
            sendBack(res, user);
        }
        else {
            const user = await db_1.default.user.create({
                data: {
                    email: result.getPayload().email,
                    names: result.getPayload()?.name.toLowerCase() || "",
                    photo: result.getPayload()?.picture || "",
                    provider: "google",
                },
                include: {
                    verification: true,
                },
            });
            sendBack(res, user);
        }
    }
    catch (error) {
        console.log(error);
        return next(error.message);
    }
};
exports.googleSignin = googleSignin;
const refreshToken = async (req, res, next) => {
    try {
        const oldrefreshToken = req.headers.authorization.split(" ")[1];
        if (!oldrefreshToken) {
            return next("no refresh token");
        }
        const result = await jsonwebtoken_1.default.verify(oldrefreshToken, process.env.SECRET || "123456");
        const user = await findUserById(result.id);
        if (!user)
            return next("user not found");
        sendBack(res, user, true);
    }
    catch (error) {
        console.log(error);
        return next(error.message);
    }
};
exports.refreshToken = refreshToken;
const forgotPassword = async (req, res, next) => {
    const { email } = req.body;
    try {
        crypto_1.default.randomBytes(32, async (err, buffer) => {
            if (err) {
                console.log(err);
            }
            const token = buffer.toString("hex");
            const user = await db_1.default.user.findUnique({
                where: {
                    email: email,
                },
            });
            if (!user)
                return next("User does not exist in our database");
            const link = `${process.env.CLIENT_HOST}/reset-password?code=${token}`;
            console.log(link);
            await (0, sendEmail_1.default)({
                html: `hello, here is your password reset link: <a href="${link}">${link}</a>`,
                subject: "Reset your password",
                to: user.email,
                names: user.names,
            });
            const doc = await db_1.default.passwordResets.findUnique({
                where: {
                    email: email,
                },
            });
            if (doc?.email) {
                await db_1.default.passwordResets.update({
                    where: {
                        email,
                    },
                    data: {
                        email: user.email,
                        token: token,
                    },
                });
                return res.json({ message: "check your inbox" });
            }
            else {
                await db_1.default.passwordResets.create({
                    data: {
                        email: user.email,
                        token: token,
                    },
                });
                return res.json({ message: "check your inbox" });
            }
        });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            // The .code property can be accessed in a type-safe manner
            if (error.code === "P2002") {
                return next("There is a unique constraint violation, a new user cannot be created with this email");
            }
        }
        return next(error.message);
    }
};
exports.forgotPassword = forgotPassword;
const getCurrentUser = async (req, res, next) => {
    if (req.body?.fresh === true) {
        const user = await findUserById(req.user.id);
        sendBack(res, user, true);
    }
    else {
        return res.json(req.user);
    }
};
exports.getCurrentUser = getCurrentUser;
const resetPassword = async (req, res, next) => {
    const newPassword = req.body.password;
    const sentToken = req.body.token;
    try {
        const reset = await db_1.default.passwordResets.findFirst({
            where: {
                token: sentToken,
            },
        });
        if (!reset)
            return next("reset code is invalid");
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
        await db_1.default.user.update({
            where: {
                email: reset.email,
            },
            data: {
                password: hashedPassword,
            },
        });
        await db_1.default.passwordResets.delete({
            where: {
                id: reset.id,
            },
        });
        return res.json({ message: "password reseted success" });
    }
    catch (error) {
        console.log(error);
        return next(error.message);
    }
};
exports.resetPassword = resetPassword;
const update = async (req, res, next) => {
    try {
        const info = req.body;
        const user = req.user;
        const newUser = await db_1.default.user.update({
            where: {
                id: user.id,
            },
            data: info,
        });
        const formated = formatProfile(newUser);
        return res.status(200).json(formated);
    }
    catch (error) {
        console.log(error);
        next(error.message);
    }
};
exports.update = update;
const changePassword = async (req, res, next) => {
    try {
        const user = req.user;
        const old_password = req.body.old_password;
        const new_password = req.body.new_password;
        const currentUser = await findUserById(user.id);
        if (!currentUser)
            return next("user not found");
        const isPasswordCorrect = await bcryptjs_1.default.compare(old_password, currentUser.password || "");
        if (!isPasswordCorrect)
            return next("old password is not collect");
        const hashedPassword = await bcryptjs_1.default.hash(new_password, 12);
        await db_1.default.user.update({
            where: {
                id: currentUser.id,
            },
            data: {
                password: hashedPassword,
            },
        });
        return res.status(200).json({ message: "success" });
    }
    catch (error) {
        next(error.message);
    }
};
exports.changePassword = changePassword;
const requestVerification = async (req, res, next) => {
    try {
        const { file, national_id } = req.body;
        const user = req.user;
        // const data = {
        //   file,
        //   national_id,
        //   status: "pending",
        //   user_id: user.id,
        // };
        // const exists = await db.verification.findUnique({
        //   where: {
        //     user_id: user.id,
        //   },
        // });
        const verification = await db_1.default.user.update({
            data: {
                verification: {
                    connectOrCreate: {
                        where: {
                            user_id: user.id,
                        },
                        create: {
                            file,
                            national_id,
                            status: "pending",
                            user_id: user.id,
                        },
                    },
                },
            },
            include: {
                verification: true,
            },
            where: {
                id: user.id,
            },
        });
        return res.status(200).json(verification.verification);
    }
    catch (error) {
        console.log(error);
        next(error.message);
    }
};
exports.requestVerification = requestVerification;
const verify2fa = async (req, res, next) => {
    const code = req.body.code;
    if (!code)
        return next("session code is not available");
    try {
        const session = await db_1.default.twoFactorAuth.findFirst({
            where: {
                token: code,
            },
        });
        console.log(session);
        if (!session)
            return next("session code is invalid");
        const user = await db_1.default.user.findUnique({
            where: {
                id: session.user_id,
            },
            include: {
                verification: true,
            },
        });
        await db_1.default.twoFactorAuth.delete({
            where: {
                id: session.id,
            },
        });
        sendBack(res, user, true);
    }
    catch (error) {
        console.log(error);
        return next(error.message);
    }
};
exports.verify2fa = verify2fa;
