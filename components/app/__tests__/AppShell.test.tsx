// components/app/__tests__/AppShell.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "@/components/app/AppShell";

it("renders nav links and children", () => {
  render(<AppShell><div>content here</div></AppShell>);
  expect(screen.getByRole("link", { name: /agents/i })).toHaveAttribute("href", "/agents");
  expect(screen.getByRole("link", { name: /memory/i })).toHaveAttribute("href", "/memory");
  expect(screen.getByRole("link", { name: /visualizer/i })).toHaveAttribute("href", "/visualizer");
  expect(screen.getByText("content here")).toBeInTheDocument();
});
