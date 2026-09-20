import { Request, Response } from 'express'
import nodemailer from 'nodemailer'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Send reset email
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    const resetLink = `http://localhost:3000/reset-password/${encodeURIComponent(email)}`

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Allendesi Password Reset',
      html: `
        <h2>Reset Your Password</h2>
        <p>Click the button below to reset your password:</p>
        <a href="${resetLink}" style="background:#dc2626;color:white;padding:10px 18px;text-decoration:none;border-radius:8px;">
          Reset Password
        </a>
      `,
    })

    return res.status(200).json({
      success: true,
      message: 'Reset link sent to your email',
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      success: false,
      message: 'Failed to send email',
    })
  }
}

// Update password in database
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const email = decodeURIComponent(req.params.token)
    const { password } = req.body

    // hash new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // update user password
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
      },
    })

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      success: false,
      message: 'Failed to update password',
    })
  }
}