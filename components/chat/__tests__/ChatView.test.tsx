// components/chat/__tests__/ChatView.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatView } from "@/components/chat/ChatView";
import type { UiMessage } from "@/lib/agentClient";

const messages: UiMessage[] = [
  { key: "m1", role: "user", content: "hello", seq: 0 },
  { key: "m2", role: "assistant", content: "hi there", seq: 1 },
];

it("renders messages and distinguishes roles", () => {
  render(<ChatView messages={messages} onSend={() => {}} sending={false} />);
  expect(screen.getByText("hello")).toBeInTheDocument();
  expect(screen.getByText("hi there")).toBeInTheDocument();
});

it("sends composer text and clears the field", () => {
  const onSend = vi.fn();
  render(<ChatView messages={messages} onSend={onSend} sending={false} />);
  const input = screen.getByPlaceholderText(/message/i) as HTMLInputElement;
  fireEvent.change(input, { target: { value: "new q" } });
  fireEvent.submit(input.closest("form")!);
  expect(onSend).toHaveBeenCalledWith("new q");
});

it("disables send while sending", () => {
  render(<ChatView messages={messages} onSend={() => {}} sending={true} />);
  expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
});
