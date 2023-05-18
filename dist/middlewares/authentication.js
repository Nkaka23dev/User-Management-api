"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Authentication = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Authentication = (req, res, next) => {
    try {
        if (!req.headers.authorization)
            return next("Missing headers");
        const token = req.headers.authorization.split(" ")[1];
        if (!token)
            return next("Missing token");
        const decoded = jsonwebtoken_1.default.verify(token, process.env.SECRET || "123456");
        req.user = decoded;
        next();
    }
    catch (error) {
        console.log(error);
        return res.status(401).json({
            error: "Invalid token",
        });
    }
};
exports.Authentication = Authentication;
