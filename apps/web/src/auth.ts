import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@cardapio/db";

// Para adicionar outros provedores (Apple, Facebook, e-mail), basta incluí-los em `providers`.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  session: { strategy: "database" },
  pages: { signIn: "/entrar" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = (user as { role?: string }).role ?? "CUSTOMER";
      return session;
    },
  },
});
