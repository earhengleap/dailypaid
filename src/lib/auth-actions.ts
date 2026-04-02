"use server"

import { signIn, signOut } from "@/lib/auth"
import prisma from "@/lib/db"
import bcrypt from "bcryptjs"
import { AuthError } from "next-auth"

export async function signUpAction(formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return { error: "User already exists" }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const userCount = await prisma.user.count()

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isAdmin: userCount === 0, // First user is admin
      },
    })

    return { success: "Account created successfully" }
  } catch (error) {
    console.error("Sign up error:", error)
    return { error: "Could not create account" }
  }
}

export async function signInAction(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials" }
        default:
          return { error: "Something went wrong" }
      }
    }
    throw error
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" })
}

