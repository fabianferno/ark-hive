// components/app/__tests__/AppShell.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "@/components/app/AppShell";

const wallet = vi.fn(() => ({ ready: true, authenticated: true, login: vi.fn(), logout: vi.fn(), address: "0xabc" }));
vi.mock("@/lib/wallet/useUserWallet", () => ({ useUserWallet: () => wallet() }));
// ConnectBar uses the same hook; render it harmlessly.
vi.mock("@/components/app/ConnectBar", () => ({ ConnectBar: () => null }));

beforeEach(() => wallet.mockReturnValue({ ready: true, authenticated: true, login: vi.fn(), logout: vi.fn(), address: "0xabc" }));

describe("AppShell", () => {
  it("renders nav links and children when authenticated", () => {
    render(<AppShell><div>content here</div></AppShell>);
    expect(screen.getByRole("link", { name: /agents/i })).toHaveAttribute("href", "/agents");
    expect(screen.getByRole("link", { name: /knowledge/i })).toHaveAttribute("href", "/knowledge");
    expect(screen.getByRole("link", { name: /memory/i })).toHaveAttribute("href", "/memory");
    expect(screen.getByRole("link", { name: /visualizer/i })).toHaveAttribute("href", "/visualizer");
    expect(screen.getByText("content here")).toBeInTheDocument();
  });

  it("gates with a Connect button when not authenticated (no nav, no children)", () => {
    wallet.mockReturnValue({ ready: true, authenticated: false, login: vi.fn(), logout: vi.fn(), address: undefined as never });
    render(<AppShell><div>content here</div></AppShell>);
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /agents/i })).not.toBeInTheDocument();
    expect(screen.queryByText("content here")).not.toBeInTheDocument();
  });

  it("shows loading until Privy is ready", () => {
    wallet.mockReturnValue({ ready: false, authenticated: false, login: vi.fn(), logout: vi.fn(), address: undefined as never });
    render(<AppShell><div>content here</div></AppShell>);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText("content here")).not.toBeInTheDocument();
  });
});
