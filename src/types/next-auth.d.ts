import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      locale?: string | null;
      onboarded?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    locale?: string | null;
    onboarded?: boolean;
  }
}
