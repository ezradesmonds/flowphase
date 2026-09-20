import Link from "next/link";
import { EmptyState } from "@/components/ui";
export default function NotFound() {
  return (
    <EmptyState
      title="Stock or page not found"
      description="Choose a stock from the current company directory."
    >
      <Link className="button" href="/scanner">
        Open Market Scanner
      </Link>
    </EmptyState>
  );
}
