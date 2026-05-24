// components/inspector/__tests__/InspectorDrawer.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InspectorDrawer } from "@/components/inspector/InspectorDrawer";

describe("InspectorDrawer", () => {
  it("renders nothing when no entity selected", () => {
    const { container } = render(<InspectorDrawer entity={null} canEdit onDelete={() => {}} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("shows fields and a delete button for owner", () => {
    render(<InspectorDrawer entity={{ key: "s1", type: "StateSnapshot", fields: { commitSeq: 42 } }}
      canEdit onDelete={() => {}} onClose={() => {}} />);
    expect(screen.getByText("StateSnapshot")).toBeInTheDocument();
    expect(screen.getByText(/42/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeEnabled();
  });
  it("disables delete for non-owner", () => {
    render(<InspectorDrawer entity={{ key: "s1", type: "StateSnapshot", fields: {} }}
      canEdit={false} onDelete={() => {}} onClose={() => {}} />);
    expect(screen.getByRole("button", { name: /delete/i })).toBeDisabled();
  });
  it("calls onDelete with the entity key", () => {
    const onDelete = vi.fn();
    render(<InspectorDrawer entity={{ key: "s1", type: "StateSnapshot", fields: {} }}
      canEdit onDelete={onDelete} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith("s1");
  });
});
