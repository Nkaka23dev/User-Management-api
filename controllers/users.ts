import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import db from "../lib/db";
import { Prisma } from "@prisma/client";
import sendEmail from "../utils/sendEmail";

dotenv.config();
const SECRET = process.env.SECRET || "123456";

function findUserById(id) {
  return db.user
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
  return db.user
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

const formatProfile = (user: any) => {
  return {
    id: user._id || user.id || "",
    email: user.email,
    username: user.names || "",
    photo: user?.photo || "",
    nationality: user.nationality || "",
    birth: user.birth || "",
    martal_status: user.martal_status || "",
    gender: user.gender || "",
    verification_status: user?.verification?.status || "unverified",
  };
};

const sendBack = (res: Response, user, allowTokens?: any) => {
  const userData = formatProfile(user);
  const access_token = jwt.sign(userData, SECRET, {
    expiresIn: "15m",
  });
  const refresh_token = jwt.sign(userData, SECRET, {
    expiresIn: "7d",
  });

  const resp =
    user.provider === "google" || allowTokens
      ? { access_token, refresh_token }
      : {};

  res.status(200).json({ ...userData, ...resp });
};

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "postmessage"
);

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

  await sendEmail({
    html: `hello, here is your 2fa code: ${generated}`,
    subject: "Here is your login link.",
    to: user.email,
    names: user.names,
  });

  await db.twoFactorAuth.upsert({
    where: {
      user_id: user?.id,
    },
    create: {
      token: generated,
      user_id: user.id,
    },
    update: {
      token: generated,
      user_id: user.id,
    },
  });
  // });
};

export const signin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = req.body; //Coming from formData

  try {
    const user = await findUserByEmail(email);

    if (!user) return next("User not found");

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password || ""
    );

    if (!isPasswordCorrect) return next("Password is incorrect");

    await send2faToken(user);

    sendBack(res, user);
  } catch (err) {
    console.log(err);
    return next(err.message);
  }
};

export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    email,
    password,
    nationality,
    martal_status,
    birth,
    names,
    gender,
    photo,
  } = req.body;

  try {
    const user = await findUserByEmail(email);

    if (user) return next("Email already in use.");

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await db.user.create({
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
  } catch (error) {
    console.log(error);
    return next(error.message);
  }
};

export const googleSignin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token: string = req.body.token;

  try {
    const result: any = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const user = await db.user.findUnique({
      where: {
        email: result.getPayload().email,
      },
    });

    if (user) {
      sendBack(res, user);
    } else {
      const user = await db.user.create({
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
  } catch (error) {
    console.log(error);
    return next(error.message);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const oldrefreshToken = req.headers.authorization.split(" ")[1];

    if (!oldrefreshToken) {
      return next("no refresh token");
    }

    const result: any = await jwt.verify(
      oldrefreshToken,
      process.env.SECRET || "123456"
    );

    const user = await findUserById(result.id);

    if (!user) return next("user not found");

    sendBack(res, user, true);
  } catch (error) {
    console.log(error);
    return next(error.message);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;
  try {
    crypto.randomBytes(32, async (err, buffer) => {
      if (err) {
        console.log(err);
      }
      const token = buffer.toString("hex");

      const user = await db.user.findUnique({
        where: {
          email: email,
        },
      });

      if (!user) return next("User does not exist in our database");

      const link = `${process.env.CLIENT_HOST}/reset-password?code=${token}`;
      console.log(link);

      await sendEmail({
        html: `hello, here is your password reset link: <a href="${link}">${link}</a>`,
        subject: "Reset your password",
        to: user.email,
        names: user.names,
      });

      const doc = await db.passwordResets.findUnique({
        where: {
          email: email,
        },
      });

      if (doc?.email) {
        await db.passwordResets.update({
          where: {
            email,
          },
          data: {
            email: user.email,
            token: token,
          },
        });
        return res.json({ message: "check your inbox" });
      } else {
        await db.passwordResets.create({
          data: {
            email: user.email,
            token: token,
          },
        });
        return res.json({ message: "check your inbox" });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // The .code property can be accessed in a type-safe manner
      if (error.code === "P2002") {
        return next(
          "There is a unique constraint violation, a new user cannot be created with this email"
        );
      }
    }
    return next(error.message);
  }
};

export const getCurrentUser = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  if (req.body?.fresh === true) {
    const user = await findUserById(req.user.id);
    sendBack(res, user, true);
  } else {
    return res.json(req.user);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const newPassword = req.body.password;
  const sentToken: string = req.body.token;

  try {
    const reset = await db.passwordResets.findFirst({
      where: {
        token: sentToken,
      },
    });

    if (!reset) return next("reset code is invalid");

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.user.update({
      where: {
        email: reset.email,
      },
      data: {
        password: hashedPassword,
      },
    });

    await db.passwordResets.delete({
      where: {
        id: reset.id,
      },
    });

    return res.json({ message: "password reseted success" });
  } catch (error) {
    console.log(error);
    return next(error.message);
  }
};

export const update = async (req: any, res: Response, next: NextFunction) => {
  try {
    const info = req.body;

    const user: any = req.user;

    const newUser = await db.user.update({
      where: {
        id: user.id,
      },
      data: info,
    });

    const formated = formatProfile(newUser);

    return res.status(200).json(formated);
  } catch (error) {
    console.log(error);
    next(error.message);
  }
};

export const changePassword = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;
    const old_password = req.body.old_password;
    const new_password = req.body.new_password;

    const currentUser = await findUserById(user.id);

    if (!currentUser) return next("user not found");

    const isPasswordCorrect = await bcrypt.compare(
      old_password,
      currentUser.password || ""
    );

    if (!isPasswordCorrect) return next("old password is not collect");

    const hashedPassword = await bcrypt.hash(new_password, 12);

    await db.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    return res.status(200).json({ message: "success" });
  } catch (error) {
    next(error.message);
  }
};
export const requestVerification = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const { file, national_id } = req.body;

    const user: any = req.user;

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

    const verification = await db.user.update({
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
  } catch (error) {
    console.log(error);
    next(error.message);
  }
};

export const verify2fa = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const code = req.body.code;

  if (!code) return next("session code is not available");

  try {
    const session = await db.twoFactorAuth.findFirst({
      where: {
        token: code,
      },
    });

    console.log(session);

    if (!session) return next("session code is invalid");

    const user = await db.user.findUnique({
      where: {
        id: session.user_id,
      },
      include: {
        verification: true,
      },
    });

    await db.twoFactorAuth.delete({
      where: {
        id: session.id,
      },
    });

    sendBack(res, user, true);
  } catch (error) {
    console.log(error);
    return next(error.message);
  }
};

export const sendLoginLink = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;
  try {
    crypto.randomBytes(32, async (err, buffer) => {
      if (err) {
        console.log(err);
      }
      const token = buffer.toString("hex");

      const user = await db.user.findUnique({
        where: {
          email: email,
        },
      });

      if (!user) return next("User does not exist in our database");

      const link = `${process.env.CLIENT_HOST}/?token=${token}`;
      console.log(link);

      await sendEmail({
        html: `hello, here is your login link: <a href="${link}">${link}</a>`,
        subject: "Login to your account",
        to: user.email,
        names: user.names,
      });

      const doc = await db.magicLink.findUnique({
        where: {
          email: email,
        },
      });

      if (doc?.email) {
        await db.magicLink.update({
          where: {
            email,
          },
          data: {
            email: user.email,
            token: token,
          },
        });
        return res.json({ message: "check your inbox" });
      } else {
        await db.magicLink.create({
          data: {
            email: user.email,
            token: token,
          },
        });
        return res.json({ message: "check your inbox" });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // The .code property can be accessed in a type-safe manner
      if (error.code === "P2002") {
        return next(
          "There is a unique constraint violation, a new user cannot be created with this email"
        );
      }
    }
    return next(error.message);
  }
};

export const verifyLoginLink = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.body.token;

  if (!token) return next("session token is not available");

  try {
    const session = await db.magicLink.findFirst({
      where: {
        token: token,
      },
    });

    if (!session) return next("session token is invalid");

    const user = await db.user.findUnique({
      where: {
        email: session.email,
      },
      include: {
        verification: true,
      },
    });

    await db.magicLink.delete({
      where: {
        id: session.id,
      },
    });

    sendBack(res, user, true);
  } catch (error) {
    console.log(error);
    return next(error.message);
  }
};
