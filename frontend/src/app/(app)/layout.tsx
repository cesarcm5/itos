import { Providers } from "@/components/providers";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <Providers>{children}</Providers>;
}
