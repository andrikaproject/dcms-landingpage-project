import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    return new PrismaClient()
}

const requiredDelegates = ["user", "bitunixUser", "lockedSignal", "passwordResetToken"]
const canReusePrismaClient =
    globalThis.prismaGlobal &&
    requiredDelegates.every((delegate) => delegate in globalThis.prismaGlobal)

const prisma = canReusePrismaClient ? globalThis.prismaGlobal : prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
