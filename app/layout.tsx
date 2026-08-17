import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const protocol =
    headerStore.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "이름 스프린트 | 누가 제일 빠를까?",
    description: "첫 글자부터 Enter까지, 내 이름 타자 속도를 겨루는 로컬 순위 게임",
    openGraph: {
      title: "내 이름, 누가 제일 빠를까?",
      description: "첫 글자부터 Enter까지 단 한 번의 질주",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1536, height: 1024 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "내 이름, 누가 제일 빠를까?",
      description: "첫 글자부터 Enter까지 단 한 번의 질주",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
