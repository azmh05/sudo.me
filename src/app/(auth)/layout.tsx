import { BrandMark } from "@/components/Brand";
import { APP_FULL_NAME } from "@/lib/config";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="size-12" />
          <h1 className="mt-5 text-[22px] font-semibold tracking-tight">{APP_FULL_NAME}</h1>
        </div>
        {children}
        <p className="mt-8 text-center text-[12px] text-muted">Private system · only you can access this</p>
      </div>
    </main>
  );
}
