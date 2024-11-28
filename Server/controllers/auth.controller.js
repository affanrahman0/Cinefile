import { User } from "../models/user.model.js";
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { generateTokenandSetCookie } from "../utils/generateTokenandSetCookie.js";
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetMail, sendPasswordResetSuccessMail} from "../mailtrap/emails.js";


dotenv.config();
export const signup = async (req,res) => {
    const {email, password, username } = req.body;

    try {
        if(!email || !password || !username) {
            throw new Error('Please fill in all fields');
        }
        const userAlreadyExists = await User.findOne({email});
        if(userAlreadyExists) {
            return res.status(400).json({success : false,message: "Email already exists."})
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
        const user = new User({username, email, password: hashedPassword, verificationToken, verificationExpiresAt: Date.now() + 15 * 60 * 1000});
        await user.save();

        //jwt 

        generateTokenandSetCookie(res, user._id);

        await sendVerificationEmail(user.email, verificationToken);



        res.status(201).json({
            success : true,
            message: "User created successfully.",
            user: {
                ...user._doc,
                password: undefined
            }
        });

    }catch(error){
        res.status(400).json({success: false, message: error.message});


    }

}



export const verifyEmail = async (req,res) => {
    const {code} = req.body;
    try{

        const user = await User.findOne(
            {
                verificationToken: code,
                verificationExpiresAt: { $gt: Date.now() }
            })

        if (!user){
            return res.status(400).json({success: false, message: "Invalid verification token."});
        }
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationExpiresAt = undefined;
        await user.save();

        await sendWelcomeEmail(user.email, user.username);
        res.status(200).json({success: true, message: "Email verified successfully.", user:{
            ...user._doc,
            password: undefined

        }});

    }catch(error){
        res.status(400).json({success: false, message: error.message})
    }


}

export const login = async (req,res) => {
    const {email, password} = req.body;
    try{
        const user = await User.findOne({email});
        if (!user) {
            return res.status(400).json({success: false, message: "Invalid email or password"});
        }
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({success: false, message: "Invalid email or password"});
        }
        generateTokenandSetCookie(res, user._id);
        user.lastLogin = new Date();
        await user.save();

            res.status(200).json({success: true, 
                message: "Logged in successfully.", 
                
                user:{
                ...user._doc,
                password: undefined
                }});
                

    }catch(error){
        console.log("Error in Login")
        res.status(400).json({success: false, message: error.message});
    }
    
}


export const forgotPassword = async (req,res) =>{
    const {email} = req.body;
    try{
        const user = await User.findOne({email});
        if (!user) {
            return res.status(400).json({success: false, message: "Email not found"}
                );
                }
        

        //Generate Reset token
        const resetToken = crypto.randomBytes(20).toString("hex");
        const resetTokenExpiresAt = Date.now() + 60 * 60 * 1000; // 1 hour from now

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpiresAt = resetTokenExpiresAt;

        await user.save();
        
        // Send email with reset token
        await sendPasswordResetMail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);
        
        res.status(200).json({success: true, message: "Password reset mail sent successfully"}); 


    }catch(error){
        console.log("Error in forgot password", error)
        res.status(400).json({success: false, message: error.message})
}

}

export const resetPassword = async (req,res) =>{
    const {token} = req.params;
    const {password} = req.body;
    try{
        const user = await User.findOne({
            resetPasswordToken: token, 
            resetPasswordExpiresAt: { $gt: Date.now() }
            });
            if (!user) {
                return res.status(400).json({success: false, message: "Invalid or expired reset token"});
            }

        //Update password
        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiresAt = undefined;

        await user.save();
        await sendPasswordResetSuccessMail(user.email);
        res.status(200).json({success: true, message: "Password reset successfully"});
    }catch(error)
    {
        console.log("Error in reset password", error)
        res.status(400).json({success: false, message: error.message});
    }
}


export const logout = async (req,res) => {
    res.clearCookie("token")
    res.status(200).json({success: true, message: "Logged out successfully."});

    
}


export const checkAuth = async (req, res) => {
	try {
		const user = await User.findById(req.userId).select("-password");
		if (!user) {
			return res.status(400).json({ success: false, message: "User not found" });
		}

		res.status(200).json({ success: true, user });
	} catch (error) {
		console.log("Error in checkAuth ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};
