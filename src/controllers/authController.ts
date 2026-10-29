import bcrypt from "bcryptjs";
import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { createUserModel } from "../models/userModel.js";

type UserModel = ReturnType<typeof createUserModel>;

export function createAuthController({
  userModel,
  jwtSecret,
  jwtExpiresIn,
}: {
  userModel: UserModel;
  jwtSecret: string;
  jwtExpiresIn: number;
}) {
  function createToken(userId: number) {
    return jwt.sign({}, jwtSecret, {
      subject: String(userId),
      expiresIn: jwtExpiresIn,
    });
  }

  const register: RequestHandler = async (req, res, next) => {
    try {
      const username = (req.body.username as string).trim();
      const email = (req.body.email as string).trim().toLowerCase();
      const passwordHash = await bcrypt.hash(req.body.password as string, 12);
      const user = await userModel.create(username, email, passwordHash);
      return res.status(201).json({ user, token: createToken(user.id) });
    } catch (error) {
      return next(error);
    }
  };

  const login: RequestHandler = async (req, res, next) => {
    try {
      const identifier = (req.body.identifier as string).trim();
      const account = await userModel.findByIdentifier(identifier);
      const validHash =
        typeof account?.password === "string" &&
        /^\$2[aby]\$\d{2}\$/.test(account.password);
      const passwordMatches =
        validHash &&
        (await bcrypt.compare(req.body.password as string, account.password));

      if (!account || !passwordMatches) {
        return res.status(401).json({
          success: false,
          message: "Username/email atau password salah.",
        });
      }

      return res.json({
        user: {
          id: account.id,
          username: account.username,
          email: account.email,
        },
        token: createToken(account.id),
      });
    } catch (error) {
      return next(error);
    }
  };

  return { register, login };
}
