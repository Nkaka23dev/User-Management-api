"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const joi_1 = __importDefault(require("joi"));
const user = joi_1.default.object({
    names: joi_1.default.string().optional(),
    email: joi_1.default.string().optional(),
    photo: joi_1.default.string().optional(),
    phone: joi_1.default.string().optional(),
    martal_status: joi_1.default.string().optional(),
    nationality: joi_1.default.string().optional(),
    birth: joi_1.default.string().optional(),
    gender: joi_1.default.string().optional(),
    password: joi_1.default.string().optional(),
});
exports.default = user;
