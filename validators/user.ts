import Joi from "joi";

const user = Joi.object({
  names: Joi.string().optional(),
  email: Joi.string().optional(),
  photo: Joi.string().optional(),
  phone: Joi.string().optional(),
  martal_status: Joi.string().optional(),
  nationality: Joi.string().optional(),
  birth: Joi.string().optional(),
  gender: Joi.string().optional(),
  password: Joi.string().optional(),
});

export default user;
