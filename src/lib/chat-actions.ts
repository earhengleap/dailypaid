"use server"

import prisma from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function sendMessageAction(content: string, receiverId?: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  try {
    const message = await prisma.message.create({
      data: {
        content,
        senderId: session.user.id,
        receiverId: receiverId || null,
      },
    })

    revalidatePath("/")
    return { success: true, message }
  } catch (error) {
    console.error("Failed to send message:", error)
    return { success: false, error: "Failed to send message" }
  }
}

export async function getChatHistoryAction(otherUserId?: string) {
  const session = await auth()
  if (!session?.user?.id) return []

  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          // Case 1: User is sender, looking for their messages to admin
          { senderId: session.user.id, receiverId: otherUserId || null },
          // Case 2: User is receiver, getting messages from admin
          { senderId: otherUserId || "admin-system", receiverId: session.user.id },
          // Case 3: Public broadcast messages (optional)
          { receiverId: null, senderId: otherUserId || "admin-system" }
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        sender: {
          select: { name: true, image: true, isAdmin: true }
        }
      }
    })

    return messages
  } catch (error) {
    console.error("Failed to fetch chat history:", error)
    return []
  }
}

export async function getAdminConversationsAction() {
  const session = await auth()
  const user = await prisma.user.findUnique({ where: { id: (session?.user as any)?.id } })
  if (!(user as any)?.isAdmin) return []

  try {
    // Get unique users who have sent messages to support
    const users = await prisma.user.findMany({
      where: {
        sentMessages: {
          some: { receiverId: null }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        sentMessages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        }
      }
    })

    return users
  } catch (error) {
    console.error("Failed to fetch admin conversations:", error)
    return []
  }
}

export async function markAsReadAction(messageId: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false }

  try {
    await prisma.message.update({
      where: { id: messageId },
      data: { isRead: true },
    })
    return { success: true }
  } catch (error) {
    return { success: false }
  }
}
