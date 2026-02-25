import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    const email = process.env.DEFAULT_ADMIN_EMAIL || "admin@example.com";
    const password = process.env.DEFAULT_ADMIN_PASSWORD || "change-me-owner";
    const name = process.env.DEFAULT_ADMIN_NAME || "Admin";
    const adminUserExist = (await db.$count(users)) > 0;
    console.log("checking users");
    if (!adminUserExist) {
      await auth.api.signUpEmail({
        body: { email, password, name: "Admin" },
      });
      await db
        .update(users)
        .set({
          //role: "admin",
          emailVerified: true,
        })
        .where(eq(users.email, email));
      console.log("user created");
    } else {
      console.log("user exist");
    }
  }
}
