import jwt from 'jsonwebtoken';

export const generateTokenandSetCookie = (res,userId) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { 
        expiresIn: "7d",
    })

    res.cookie("token", token, {
        httpOnly: true, //XSS attacks
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict", // csrf attack
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days


    })

    return token;
    
}