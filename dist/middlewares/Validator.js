"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const validators_1 = __importDefault(require("../validators"));
function default_1(validator) {
    return async function (req, res, next) {
        const valids = validators_1.default;
        if (!validators_1.default.hasOwnProperty(validator))
            next(`${validator}' validator is not exist`);
        try {
            await valids[validator].validateAsync(req.body);
            next();
        }
        catch (err) {
            if (err.isJoi)
                return next(err.message);
            next(err.message);
        }
    };
}
exports.default = default_1;
