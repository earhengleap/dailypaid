"use server"

import prisma from "@/lib/db"
import { type Transaction } from "@/components/ui/TransactionItem"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"

export async function getTransactions() {
  const session = await auth()
  if (!session?.user?.id) return []

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        date: 'desc'
      }
    })
    
    // Map Prisma DateTime to timestamp number for frontend compatibility
    return transactions.map((t: any) => ({
      id: t.id,
      title: t.title,
      amount: t.amount,
      currency: t.currency as 'USD' | 'KHR',
      type: t.type as 'income' | 'expense',
      date: t.date.getTime(),
      category: t.category,
      group: t.group,
    })) as Transaction[]
  } catch (error) {
    console.error("Failed to fetch transactions:", error)
    return []
  }
}

export async function createTransaction(data: Omit<Transaction, 'id'>) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  try {
    const transaction = await prisma.transaction.create({
      data: {
        title: data.title,
        amount: data.amount,
        currency: data.currency,
        type: data.type,
        date: new Date(data.date),
        category: data.category,
        group: data.group,
        userId: session.user.id,
      }
    })
    
    revalidatePath("/")
    return { success: true, id: transaction.id }
  } catch (error) {
    console.error("Failed to create transaction:", error)
    return { success: false, error: "Failed to save record" }
  }
}

export async function deleteTransactionAction(id: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  try {
    // Ensure the user owns the transaction before deleting
    const transaction = await prisma.transaction.findUnique({
      where: { id }
    })

    if (!transaction || (transaction.userId && transaction.userId !== session.user.id)) {
      return { success: false, error: "Unauthorized or not found" }
    }

    await prisma.transaction.delete({
      where: { id }
    })
    
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete transaction:", error)
    return { success: false, error: "Failed to delete record" }
  }
}

export async function seedExampleData() {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  try {
    const count = await prisma.transaction.count({
      where: { userId: session.user.id }
    })
    if (count > 0) return { success: true, message: "User already has data" }

    const examples = [
      { title: "Salary", amount: 2500, currency: "USD", type: "income", date: new Date(), group: "Personal", userId: session.user.id },
      { title: "Rent", amount: 600, currency: "USD", type: "expense", date: new Date(Date.now() - 86400000), group: "Personal", userId: session.user.id },
      { title: "Freelance", amount: 1200000, currency: "KHR", type: "income", date: new Date(Date.now() - 172800000), group: "Work", userId: session.user.id },
      { title: "Coffee", amount: 2.5, currency: "USD", type: "expense", date: new Date(), group: "Personal", userId: session.user.id },
    ]

    for (const data of examples) {
      await prisma.transaction.create({ data })
    }

    revalidatePath("/")
    return { success: true, message: "Seed data added" }
  } catch (error) {
    console.error("Failed to seed data:", error)
    return { success: false, error: "Seed failed" }
  }
}
