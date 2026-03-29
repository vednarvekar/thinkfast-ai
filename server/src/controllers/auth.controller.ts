import generateToken from '../config/jwt'
// import User from '../models/user.model'
import User, { UserDocument } from '../models/user.model';
import Chat from '../models/chat.model';
import bcrypt from 'bcrypt'
import { Request, Response } from 'express';


export const register = async (req: Request, res: Response) => {
  const { fullName, email, password } = req.body;
  try {
    console.log('[register] request received', {
      origin: req.headers.origin,
      contentType: req.headers['content-type'],
      hasFullName: Boolean(fullName),
      fullNameLength: typeof fullName === 'string' ? fullName.trim().length : 0,
      email,
      hasPassword: Boolean(password),
    });

    if (!fullName || !email || !password) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters long' });
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser: UserDocument = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      if (!process.env.JWT_SECRET) {
        res.status(500).json({ message: 'JWT_SECRET is not configured' });
        return;
      }

      generateToken(newUser._id.toString(), res);
      await newUser.save();
      console.log('[register] user saved', {
        userId: newUser._id.toString(),
        email: newUser.email,
      });

      // ✅ FIXED chat creation logic
      const existingChats = await Chat.find({ user: newUser._id });
      if (existingChats.length === 0) {
        await Chat.create({ user: newUser._id, messages: [] });
      }
      console.log('[register] chat initialized', {
        userId: newUser._id.toString(),
      });

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        message: 'User created successfully',
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('[register] controller error', {
      name: (error as any)?.name,
      code: (error as any)?.code,
      message: (error as any)?.message,
      keyPattern: (error as any)?.keyPattern,
      errors: (error as any)?.errors,
    });

    if ((error as any)?.code === 11000) {
      const duplicateField = Object.keys((error as any).keyPattern || {})[0];

      if (duplicateField === 'email') {
        res.status(400).json({ message: 'User already exists' });
        return;
      }

      if (duplicateField === 'fullName') {
        res.status(400).json({ message: 'Full name is already taken' });
        return;
      }

      res.status(400).json({ message: `${duplicateField} already exists` });
      return;
    }

    if ((error as any)?.name === 'ValidationError') {
      const firstValidationError = Object.values((error as any).errors || {})[0] as
        | { message?: string }
        | undefined;

      res.status(400).json({
        message: firstValidationError?.message || 'Invalid registration data',
      });
      return;
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};


export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    try {
        if(!email || !password) {
            res.status(400).json({ message: 'Email and password are required' });
            return; 
        }

        const user = await User.findOne({ email });
        if (!user) {
            res.status(400).json({ message: 'User does not exist. Please Register' });
            return; 
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
           res.status(400).json({ message: 'Invalid Credentials' });
           return;
        }

        const token = generateToken(user._id.toString(), res);

        res.status(200).json({
            _id: user._id,
            token,
            fullName: user.fullName,
            email: user.email,
            message: 'Login successful',
        });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export const logout = async (req: Request, res: Response) => {
    try {
        res.cookie("token", "", { maxAge: 0});
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ message: 'Internal server error' });
        
    }
}
