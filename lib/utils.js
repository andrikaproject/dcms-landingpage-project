import bcrypt from "bcryptjs";

export function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}

export function comparePassword(password, hashedPassword) {
    return bcrypt.compareSync(password, hashedPassword);
}